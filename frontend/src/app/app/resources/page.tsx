"use client";
import { Download, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, LoadError, Notice, Spinner } from "@/components/ui";
import { ApiError, apiBlob, friendly, useApi } from "@/lib/api";
import { type ResourceItem, kb } from "@/lib/resources";

function ImagePreview({ id, title }: { id: string; title: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let made: string | null = null;
    let dead = false;
    apiBlob(`/api/v1/resources/${id}/file`).then((b) => {
      if (dead) return;
      made = URL.createObjectURL(b);
      setUrl(made);
    }).catch(() => undefined);
    return () => { dead = true; if (made) URL.revokeObjectURL(made); };
  }, [id]);
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt={title} className="mt-3 max-h-80 w-full rounded-lg object-contain" /> : <div className="mt-3 h-24" />;
}

export default function Resources() {
  const list = useApi<{ items: ResourceItem[] }>("/api/v1/resources");
  const [msg, setMsg] = useState("");

  async function download(r: ResourceItem) {
    setMsg("");
    try {
      const blob = await apiBlob(`/api/v1/resources/${r.id}/file`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${r.title}.${r.kind === "pdf" ? "pdf" : blob.type === "image/png" ? "png" : "jpg"}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      setMsg(friendly(e instanceof ApiError ? e : null));
    }
  }

  if (list.error) return <LoadError status={list.error.status} onRetry={list.reload} />;
  if (!list.data) return <Spinner />;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Resources</h1>
      {msg && <Notice>{msg}</Notice>}
      {list.data.items.length === 0 && <Card><p className="text-sm text-muted">Nothing here yet. New guides and images will appear here.</p></Card>}
      {list.data.items.map((r) => (
        <Card key={r.id}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {r.kind === "pdf" && <FileText aria-hidden className="h-5 w-5 shrink-0 text-lime" />}
              <div className="min-w-0">
                <h2 className="truncate font-semibold">{r.title}</h2>
                <p className="text-xs text-muted">{r.kind === "pdf" ? "PDF" : "Image"} · {kb(r.size)}</p>
              </div>
            </div>
            <Button variant="ghost" onClick={() => download(r)}><Download aria-hidden className="mr-1 inline h-4 w-4" />Download</Button>
          </div>
          {r.kind === "image" && <ImagePreview id={r.id} title={r.title} />}
        </Card>
      ))}
    </div>
  );
}
