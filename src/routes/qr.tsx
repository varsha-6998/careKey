import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RequireRole } from "@/components/RequireRole";
import { PageHeading } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/qr")({
  head: () => ({
    meta: [
      { title: "My emergency QR — CareKey" },
      {
        name: "description",
        content:
          "Your CareKey emergency QR code. It contains only your Medical ID, never medical information.",
      },
      { property: "og:title", content: "My emergency QR — CareKey" },
      {
        property: "og:description",
        content: "Download or regenerate the QR code that identifies your emergency profile.",
      },
    ],
  }),
  component: () => (
    <RequireRole roles={["patient"]}>
      <QrPage />
    </RequireRole>
  ),
});

function QrPage() {
  const { medicalId, profile, refresh } = useAuth();
  const [dataUrl, setDataUrl] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!medicalId) return;
    void QRCode.toDataURL(medicalId, { width: 512, margin: 2 }).then(setDataUrl);
  }, [medicalId]);

  async function regenerate() {
    setBusy(true);
    const { error } = await supabase.rpc("regenerate_medical_id");
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
    toast.success("New Medical ID generated. Old QR codes no longer work.");
  }

  return (
    <>
      <PageHeading
        title="My emergency QR"
        description="Show this to emergency responders to identify your emergency profile."
      />
      <div className="card-surface mx-auto max-w-md p-8 text-center">
        <p className="text-lg font-semibold">{profile?.full_name}</p>
        <p className="mono-id mt-1 text-sm text-muted-foreground">{medicalId}</p>
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`QR code for Medical ID ${medicalId}`}
            className="mx-auto mt-6 w-64 rounded-lg border"
          />
        ) : (
          <div className="mx-auto mt-6 h-64 w-64 animate-pulse rounded-lg bg-muted" />
        )}
        <p className="mt-6 text-sm text-muted-foreground">
          This QR identifies your emergency medical profile. It does not contain your medical
          information.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild disabled={!dataUrl}>
            <a href={dataUrl} download={`carekey-${medicalId}.png`}>
              Download QR
            </a>
          </Button>
          <Button variant="outline" onClick={regenerate} disabled={busy}>
            {busy ? "Working…" : "Regenerate QR"}
          </Button>
        </div>
      </div>
    </>
  );
}
