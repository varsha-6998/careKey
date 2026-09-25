import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, type Role } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";

export function RequireRole({
  roles,
  children,
}: {
  roles: Role[];
  children: ReactNode;
}) {
  const { loading, session, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (role && !roles.includes(role)) {
    return (
      <AppShell>
        <div className="card-surface p-8 text-center">
          <h2 className="text-lg font-semibold">Not available for your role</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This page is restricted to: {roles.join(", ")}.
          </p>
        </div>
      </AppShell>
    );
  }

  return <AppShell>{children}</AppShell>;
}
