import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "patient" | "doctor" | "admin";

type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  organization: string | null;
  specialty: string | null;
};

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: Role | null;
  medicalId: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [medicalId, setMedicalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function bootstrap(current: Session | null) {
    if (!current?.user) {
      setProfile(null);
      setRole(null);
      setMedicalId(null);
      setLoading(false);
      return;
    }
    const user = current.user;
    const meta = (user.user_metadata ?? {}) as Record<string, string>;

    let { data: prof } = await supabase
      .from("profiles")
      .select("id, full_name, email, organization, specialty")
      .eq("id", user.id)
      .maybeSingle();

    if (!prof) {
      await supabase.from("profiles").insert({
        id: user.id,
        full_name: meta.full_name || user.email || "Unnamed",
        email: user.email ?? null,
        organization: meta.organization || null,
        specialty: meta.specialty || null,
      });
      const res = await supabase
        .from("profiles")
        .select("id, full_name, email, organization, specialty")
        .eq("id", user.id)
        .maybeSingle();
      prof = res.data;
    }
    setProfile(prof ?? null);

    let { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!roleRow) {
      const desired = (meta.role as Role) || "patient";
      await supabase.from("user_roles").insert({ user_id: user.id, role: desired });
      const res = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      roleRow = res.data;
    }
    const resolved = (roleRow?.role as Role) ?? "patient";
    setRole(resolved);

    if (resolved === "patient") {
      let { data: pat } = await supabase
        .from("patients")
        .select("medical_id")
        .eq("id", user.id)
        .maybeSingle();
      if (!pat) {
        await supabase.from("patients").insert({ id: user.id });
        const res = await supabase
          .from("patients")
          .select("medical_id")
          .eq("id", user.id)
          .maybeSingle();
        pat = res.data;
      }
      setMedicalId(pat?.medical_id ?? null);
    }
    setLoading(false);
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(true);
      setTimeout(() => {
        void bootstrap(next);
      }, 0);
    });
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      void bootstrap(data.session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    loading,
    session,
    user: session?.user ?? null,
    profile,
    role,
    medicalId,
    refresh: async () => {
      const { data } = await supabase.auth.getSession();
      await bootstrap(data.session);
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
