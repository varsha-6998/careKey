import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const patientNav = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/profile", label: "Medical profile" },
  { to: "/records", label: "Records" },
  { to: "/share", label: "Sharing" },
  { to: "/qr", label: "Emergency QR" },
  { to: "/history", label: "Access history" },
  { to: "/hospitals", label: "Hospitals" },
] as const;

const doctorNav = [
  { to: "/doctor", label: "My patients" },
  { to: "/emergency", label: "Emergency mode" },
  { to: "/hospitals", label: "Hospitals" },
] as const;

const adminNav = [
  { to: "/admin", label: "Admin" },
  { to: "/hospitals", label: "Hospitals" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const nav = role === "doctor" ? doctorNav : role === "admin" ? adminNav : patientNav;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-warning-soft px-4 py-1.5 text-center text-xs font-medium text-warning-foreground">
        Research Prototype — Not for Clinical Use. All data is synthetic.
      </div>
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="rounded-md bg-primary px-2 py-1 text-sm font-bold text-primary-foreground">
              CK
            </span>
            <span className="text-lg font-semibold tracking-tight">CareKey</span>
          </Link>
          <nav className="order-3 flex w-full flex-wrap gap-1 md:order-none md:w-auto">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium leading-tight">{profile?.full_name}</p>
              <Badge variant="secondary" className="mt-0.5 text-[10px] uppercase">
                {role ?? "—"}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                void navigate({ to: "/auth" });
              }}
            >
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
