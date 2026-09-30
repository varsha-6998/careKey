import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RequireRole } from "@/components/RequireRole";
import { PageHeading } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { categoryLabel, formatDateTime } from "@/lib/carekey";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Access history — CareKey" },
      {
        name: "description",
        content: "See exactly who accessed your medical information, what they saw, why and when.",
      },
      { property: "og:title", content: "Access history — CareKey" },
      {
        property: "og:description",
        content: "A complete audit trail of every access to your CareKey records.",
      },
    ],
  }),
  component: () => (
    <RequireRole roles={["patient"]}>
      <HistoryPage />
    </RequireRole>
  ),
});

function HistoryPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["access-history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_logs")
        .select("*")
        .eq("patient_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <PageHeading
        title="Who accessed my information?"
        description="Every consent-based and emergency access is recorded here."
      />
      <div className="card-surface divide-y">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : (data ?? []).length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No access recorded yet.</p>
        ) : (
          data!.map((log) => (
            <div key={log.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{log.provider_name ?? "Unknown provider"}</p>
                <Badge variant={log.access_type === "emergency" ? "destructive" : "secondary"}>
                  {log.access_type}
                </Badge>
                {log.success ? null : <Badge variant="outline">failed</Badge>}
                <span className="ml-auto text-sm text-muted-foreground">
                  {formatDateTime(log.created_at)}
                </span>
              </div>
              <p className="mt-1 text-sm">{log.action}</p>
              {log.categories.length > 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Viewed: {log.categories.map(categoryLabel).join(", ")}
                </p>
              ) : null}
              {log.reason ? (
                <p className="mt-1 text-sm text-muted-foreground">Reason: {log.reason}</p>
              ) : null}
              {log.verification_result ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Verification: {log.verification_result}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </>
  );
}
