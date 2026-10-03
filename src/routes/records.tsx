import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RequireRole } from "@/components/RequireRole";
import { PageHeading } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DOC_TYPES, formatDate } from "@/lib/carekey";

export const Route = createFileRoute("/records")({
  head: () => ({
    meta: [
      { title: "Medical records — CareKey" },
      {
        name: "description",
        content: "Upload and view prescriptions, lab reports, discharge summaries and imaging reports.",
      },
      { property: "og:title", content: "Medical records — CareKey" },
      {
        property: "og:description",
        content: "Store your medical documents privately and share them only with consent.",
      },
    ],
  }),
  component: () => (
    <RequireRole roles={["patient"]}>
      <RecordsPage />
    </RequireRole>
  ),
});

export async function openDocument(path: string | null) {
  if (!path) return toast.error("File not available");
  const { data, error } = await supabase.storage
    .from("medical-documents")
    .createSignedUrl(path, 60);
  if (error || !data) return toast.error(error?.message ?? "Could not open file");
  window.open(data.signedUrl, "_blank", "noopener");
}

function RecordsPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("prescription");
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["documents", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("patient_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function upload() {
    if (!user || !file) return toast.error("Choose a file first");
    if (file.size > 10 * 1024 * 1024) return toast.error("Max file size is 10 MB");
    setBusy(true);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
    const path = `${user.id}/${Date.now()}-${safe}`;
    const up = await supabase.storage.from("medical-documents").upload(path, file);
    if (up.error) {
      setBusy(false);
      return toast.error(up.error.message);
    }
    const { error } = await supabase.from("documents").insert({
      patient_id: user.id,
      file_name: file.name.slice(0, 150),
      doc_type: docType,
      storage_path: path,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setFile(null);
    toast.success("Document uploaded");
    await qc.invalidateQueries({ queryKey: ["documents", user.id] });
  }

  async function remove(id: string, path: string | null) {
    if (path) await supabase.storage.from("medical-documents").remove([path]);
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await qc.invalidateQueries({ queryKey: ["documents", user?.id] });
  }

  return (
    <>
      <PageHeading title="Medical records" description="Documents are private unless you share them." />
      <div className="grid gap-6 md:grid-cols-[340px_1fr]">
        <div className="card-surface h-fit space-y-4 p-6">
          <h2 className="font-semibold">Upload document</h2>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((d) => (
                  <SelectItem key={d.key} value={d.key}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="file">File (PDF or image, max 10 MB)</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button className="w-full" onClick={upload} disabled={busy || !file}>
            {busy ? "Uploading…" : "Upload"}
          </Button>
        </div>

        <div className="card-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">File</th>
                <th className="p-3">Type</th>
                <th className="p-3">Uploaded</th>
                <th className="p-3">Owner</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-muted-foreground">
                    No documents yet.
                  </td>
                </tr>
              ) : (
                data!.map((d) => (
                  <tr key={d.id}>
                    <td className="p-3 font-medium">{d.file_name}</td>
                    <td className="p-3">
                      <Badge variant="secondary">
                        {DOC_TYPES.find((t) => t.key === d.doc_type)?.label ?? d.doc_type}
                      </Badge>
                    </td>
                    <td className="p-3">{formatDate(d.created_at)}</td>
                    <td className="p-3">{profile?.full_name}</td>
                    <td className="space-x-1 whitespace-nowrap p-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => openDocument(d.storage_path)}>
                        View
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(d.id, d.storage_path)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
