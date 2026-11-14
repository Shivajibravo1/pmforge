"use client";
import { useState } from "react";
import { Badge, Button, Card, LoadError, Spinner } from "@/components/ui";
import { api, useApi } from "@/lib/api";

type Portfolio = { public: boolean; slug: string | null; items: { day: number; title: string; score: number; content: string }[] };

export default function PortfolioPage() {
  const { data, error, reload } = useApi<Portfolio>("/api/v1/portfolio");
  const [busy, setBusy] = useState(false);
  if (error) return <LoadError status={error.status} onRetry={reload} />;
  if (!data) return <Spinner />;

  async function toggle() {
    setBusy(true);
    await api("/api/v1/portfolio/visibility", { method: "PUT", body: { public: !data!.public } });
    await reload();
    setBusy(false);
  }

  const url = data.slug && typeof window !== "undefined" ? `${window.location.origin}/p/${data.slug}` : null;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Portfolio</h1>
      <Card className="space-y-3">
        <p className="text-sm">Your portfolio is <strong>{data.public ? "public" : "private"}</strong>. Only reviewed artifacts are shown, without your name or email.</p>
        {data.public && url && <p className="break-all text-sm text-lime">{url}</p>}
        <Button variant="ghost" onClick={toggle} disabled={busy}>{data.public ? "Make private" : "Make public"}</Button>
      </Card>
      {data.items.length === 0 && <p className="text-sm text-muted">Submit an artifact for review and it will appear here.</p>}
      {data.items.map((i) => (
        <Card key={i.day}>
          <div className="flex items-center justify-between"><h2 className="font-semibold">Day {i.day}: {i.title}</h2><Badge tone="lime">{i.score}/100</Badge></div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{i.content}</p>
        </Card>
      ))}
    </div>
  );
}
