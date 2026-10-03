import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RequireRole } from "@/components/RequireRole";
import { PageHeading } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { demoVerifier, liveVerifier, type VerificationResult } from "@/lib/faceVerification";
import { formatDate } from "@/lib/carekey";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: "Emergency patient access — CareKey" },
      {
        name: "description",
        content:
          "Identify a patient by QR or Medical ID, verify identity and view critical emergency information. Every access is logged.",
      },
      { property: "og:title", content: "Emergency patient access — CareKey" },
      {
        property: "og:description",
        content: "Fast, logged access to a patient's critical emergency profile.",
      },
    ],
  }),
  component: () => (
    <RequireRole roles={["doctor", "admin"]}>
      <EmergencyPage />
    </RequireRole>
  ),
});

type EmergencyProfile = {
  patient_id: string;
  medical_id: string;
  full_name: string;
  blood_group: string | null;
  rh_factor: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  allergies: { allergen: string; reaction: string | null; severity: string }[];
  medications: { name: string; dosage: string | null; frequency: string | null }[];
  conditions: { name: string; status: string }[];
  surgeries: { procedure: string; surgery_date: string | null; hospital: string | null }[];
};

const REASONS = [
  "Road traffic accident",
  "Unconscious patient",
  "Cardiac emergency",
  "Fall / trauma",
  "Other medical emergency",
];

function EmergencyPage() {
  const { user, profile } = useAuth();
  const [step, setStep] = useState<"identify" | "verify" | "profile">("identify");
  const [medicalId, setMedicalId] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [found, setFound] = useState<{ patient_id: string; full_name: string } | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [data, setData] = useState<EmergencyProfile | null>(null);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);

  async function log(entry: {
    patient_id?: string | null;
    action: string;
    success: boolean;
    verification_result?: string;
    categories?: string[];
  }) {
    await supabase.from("access_logs").insert({
      patient_id: entry.patient_id ?? null,
      medical_id: medicalId.trim().toUpperCase(),
      provider_id: user!.id,
      provider_name: profile?.full_name ?? "Unknown provider",
      action: entry.action,
      reason,
      access_type: "emergency",
      success: entry.success,
      verification_result: entry.verification_result,
      categories: entry.categories ?? [],
    });
  }

  async function identify(id = medicalId) {
    const clean = id.trim().toUpperCase();
    if (!/^CK-[A-Z0-9]{8}$/.test(clean)) {
      toast.error("Medical ID format is CK-XXXXXXXX");
      return;
    }
    setMedicalId(clean);
    setBusy(true);
    const { data: rows, error } = await supabase.rpc("find_patient_by_medical_id", {
      _medical_id: clean,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    const row = rows?.[0];
    if (!row) {
      await log({ action: "Emergency identification failed — unknown Medical ID", success: false });
      return toast.error("No patient found for this Medical ID");
    }
    setFound({ patient_id: row.patient_id, full_name: row.full_name });
    setStep("verify");
  }

  async function onVerified(r: VerificationResult) {
    setResult(r);
    if (r.status !== "match") {
      await log({
        patient_id: found?.patient_id,
        action: "Emergency access denied — verification failed",
        success: false,
        verification_result: `${r.status} (${r.method})`,
      });
      return;
    }
    const { data: prof, error } = await supabase.rpc("emergency_profile", {
      _medical_id: medicalId,
    });
    if (error || !prof) return toast.error(error?.message ?? "Could not load profile");
    await log({
      patient_id: found?.patient_id,
      action: "Emergency access initiated — emergency profile viewed",
      success: true,
      verification_result: `${r.status} (${r.method})`,
      categories: ["blood", "allergies", "medications", "conditions", "surgeries"],
    });
    setData(prof as unknown as EmergencyProfile);
    setStep("profile");
  }

  function reset() {
    setStep("identify");
    setMedicalId("");
    setFound(null);
    setResult(null);
    setData(null);
  }

  return (
    <>
      <PageHeading
        title="Emergency patient access"
        description="Only critical information is shown. Every access is recorded in the audit log."
        action={step !== "identify" ? <Button variant="outline" onClick={reset}>New patient</Button> : null}
      />

      {step === "identify" ? (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card-surface space-y-4 p-6">
            <h2 className="font-semibold">Enter Medical ID</h2>
            <div className="space-y-1.5">
              <Label htmlFor="mid">Medical ID</Label>
              <Input
                id="mid"
                className="mono-id text-lg uppercase"
                placeholder="CK-7F82A19C"
                value={medicalId}
                maxLength={11}
                onChange={(e) => setMedicalId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Access reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => identify()} disabled={busy}>
              {busy ? "Looking up…" : "Identify patient"}
            </Button>
          </div>
          <div className="card-surface space-y-4 p-6">
            <h2 className="font-semibold">Scan QR</h2>
            {scanning ? (
              <QrScanner
                onResult={(text) => {
                  setScanning(false);
                  void identify(text);
                }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Scan the patient's CareKey QR. It contains only their Medical ID.
              </p>
            )}
            <Button variant="outline" className="w-full" onClick={() => setScanning((s) => !s)}>
              {scanning ? "Stop camera" : "Start QR scanner"}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "verify" && found ? (
        <FaceVerify
          patientName={found.full_name}
          medicalId={medicalId}
          result={result}
          onResult={onVerified}
        />
      ) : null}

      {step === "profile" && data ? <EmergencyView data={data} /> : null}
    </>
  );
}

function QrScanner({ onResult }: { onResult: (text: string) => void }) {
  const id = "qr-reader";
  useEffect(() => {
    let scanner: { stop: () => Promise<void>; clear: () => void } | null = null;
    let done = false;
    void import("html5-qrcode").then(({ Html5Qrcode }) => {
      const s = new Html5Qrcode(id);
      scanner = s;
      s.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 220 },
        (text) => {
          if (done) return;
          done = true;
          onResult(text);
        },
        () => {},
      ).catch(() => toast.error("Camera unavailable — enter the Medical ID instead"));
    });
    return () => {
      scanner?.stop().then(() => scanner?.clear()).catch(() => {});
    };
  }, [onResult]);
  return <div id={id} className="overflow-hidden rounded-lg border" />;
}

function FaceVerify({
  patientName,
  medicalId,
  result,
  onResult,
}: {
  patientName: string;
  medicalId: string;
  result: VerificationResult | null;
  onResult: (r: VerificationResult) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camera, setCamera] = useState<"off" | "on" | "denied">("off");
  const [captured, setCaptured] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamera("on");
    } catch {
      setCamera("denied");
    }
  }

  async function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    // Frame stays in memory only, is passed to the verifier, then discarded.
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
    setCaptured(true);
    setBusy(true);
    const r = await liveVerifier.verify(medicalId, blob);
    setBusy(false);
    if (r.status === "unavailable") {
      toast.info("Face model not connected yet — use Demo Verification.");
      return;
    }
    onResult(r);
  }

  async function demo() {
    setBusy(true);
    const r = await demoVerifier.verify(medicalId, null);
    setBusy(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onResult(r);
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <div className="card-surface p-6">
        <h2 className="font-semibold">Verify patient identity</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Patient: <strong>{patientName}</strong> · <span className="mono-id">{medicalId}</span>
        </p>
        <div className="mt-4 flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-muted">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={camera === "on" ? "h-full w-full object-cover" : "hidden"}
          />
          {camera === "off" ? (
            <p className="text-sm text-muted-foreground">Camera is off</p>
          ) : null}
          {camera === "denied" ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Camera permission denied. Use Demo Verification below.
            </p>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {camera !== "on" ? (
            <Button variant="outline" onClick={startCamera}>
              Allow camera
            </Button>
          ) : (
            <Button variant="outline" onClick={capture} disabled={busy}>
              Capture frame
            </Button>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          No images are stored. Captured frames are used only for comparison and then discarded.
        </p>
      </div>

      <div className="space-y-4">
        <div className="card-surface p-5">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Verification status</p>
          <p className="mt-2 text-lg font-semibold">
            {busy
              ? "Verifying…"
              : result
                ? result.status === "match"
                  ? "Match"
                  : "No match"
                : captured
                  ? "Model unavailable"
                  : "Waiting"}
          </p>
          {result ? (
            <p className="text-xs text-muted-foreground">
              Method: {result.method} · {result.durationMs} ms
            </p>
          ) : null}
        </div>
        <div className="rounded-lg border-2 border-dashed border-warning bg-warning-soft p-5">
          <p className="text-xs font-bold uppercase">Demo verification</p>
          <p className="mt-1 text-sm">
            For project demonstrations only. Simulates a successful match without biometric
            processing. Recorded as “demo” in the audit log.
          </p>
          <Button className="mt-3 w-full" onClick={demo} disabled={busy}>
            Run demo verification
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmergencyView({ data }: { data: EmergencyProfile }) {
  const blood = data.blood_group
    ? `${data.blood_group}${data.rh_factor === "negative" ? "−" : "+"}`
    : "Unknown";
  return (
    <div className="space-y-4">
      <div className="rounded-md bg-success-soft p-3 text-sm font-medium">
        Emergency access has been logged.
      </div>
      <div className="card-surface flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-2xl font-bold">{data.full_name}</p>
          <p className="mono-id text-sm text-muted-foreground">{data.medical_id}</p>
        </div>
        <div className="text-right text-sm">
          <p className="text-xs uppercase text-muted-foreground">Emergency contact</p>
          <p className="font-semibold">{data.emergency_contact_name ?? "—"}</p>
          {data.emergency_contact_phone ? (
            <a className="text-primary underline" href={`tel:${data.emergency_contact_phone}`}>
              {data.emergency_contact_phone}
            </a>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border-4 border-critical bg-critical-soft p-6">
          <p className="text-sm font-bold uppercase tracking-widest">Blood group</p>
          <p className="mt-2 text-6xl font-bold">{blood}</p>
        </div>
        <BigCard title="⚠ Allergies" critical={data.allergies.length > 0}>
          {data.allergies.map((a, i) => (
            <li key={i}>
              <strong>{a.allergen}</strong> — {a.reaction ?? "reaction unknown"}{" "}
              <span className="text-xs font-bold uppercase">({a.severity})</span>
            </li>
          ))}
        </BigCard>
        <BigCard title="⚠ Critical conditions" critical={data.conditions.length > 0}>
          {data.conditions.map((c, i) => (
            <li key={i}>
              <strong>{c.name}</strong> ({c.status})
            </li>
          ))}
        </BigCard>
        <BigCard title="Current medications">
          {data.medications.map((m, i) => (
            <li key={i}>
              <strong>{m.name}</strong> {m.dosage ?? ""} {m.frequency ? `· ${m.frequency}` : ""}
            </li>
          ))}
        </BigCard>
        <BigCard title="Major surgeries">
          {data.surgeries.map((s, i) => (
            <li key={i}>
              <strong>{s.procedure}</strong> · {formatDate(s.surgery_date)} {s.hospital ? `· ${s.hospital}` : ""}
            </li>
          ))}
        </BigCard>
      </div>
    </div>
  );
}

function BigCard({
  title,
  critical,
  children,
}: {
  title: string;
  critical?: boolean;
  children: React.ReactNode[];
}) {
  return (
    <div
      className={`rounded-lg p-6 ${critical ? "border-4 border-critical bg-critical-soft" : "card-surface"}`}
    >
      <p className="text-sm font-bold uppercase tracking-widest">{title}</p>
      {children.length === 0 ? (
        <p className="mt-3 text-base text-muted-foreground">None recorded</p>
      ) : (
        <ul className="mt-3 space-y-2 text-base">{children}</ul>
      )}
    </div>
  );
}
