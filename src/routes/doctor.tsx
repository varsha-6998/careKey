import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RequireRole } from "@/components/RequireRole";
import { formatDateTime, categoryLabel } from "@/lib/carekey";

export const Route = createFileRoute("/doctor")({
  head: () => ({
    meta: [
      { title: "My patients — CareKey" },
      { name: "description", content: "Patients who have granted you consent-based access in CareKey." },
      { property: "og:title", content: "My patients — CareKey" },
      { property: "og:description", content: "Patients who have granted you consent-based access in CareKey." },
    ],
  }),
  component: () => (
    <RequireRole roles={["doctor"]}>
      <DoctorPage />
    </RequireRole>
  ),
});

function DoctorPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["doctor-consents", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consents")
        .select("*")
        .eq("provider_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My patients</h1>
        <Link to="/emergency" className="text-sm text-primary underline">Emergency mode</Link>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data?.length ? (
        <div className="card-surface p-6 text-sm text-muted-foreground">No patients have shared records with you yet.</div>
      ) : (
        <ul className="space-y-2">
          {data.map((c) => (
            <li key={c.id} className="card-surface p-4">
              <p className="font-medium">Patient {c.patient_id.slice(0, 8)} · {c.status}</p>
              <p className="text-xs text-muted-foreground">
                {c.permissions.map(categoryLabel).join(", ")} · expires {formatDateTime(c.expires_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
