"use client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LessonBody } from "@/components/lesson-body";
import { Badge, Card, LinkButton, LoadError, Spinner } from "@/components/ui";
import { UpgradeOptions } from "@/components/upgrade-options";
import { type Me, useApi } from "@/lib/api";

type Detail = {
  id: string; title: string; tagline: string; category: string; business: string; analogy: string; arch: string;
  pm_cost: string[]; goes_wrong: string[]; ask: string[]; interview: string;
};

const list = (items: string[]) => (
  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
);

export default function LibraryItem() {
  const { id } = useParams<{ id: string }>();
  const { data, error, reload } = useApi<Detail>(`/api/v1/library/architecture/${encodeURIComponent(id)}`);
  const me = useApi<Me>("/api/v1/me");
  const back = (
    <Link href="/app/library" aria-label="Back to Library" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line hover:bg-surface2">
      <ArrowLeft size={20} aria-hidden="true" />
    </Link>
  );
  if (error?.status === 402) {
    return (
      <div className="space-y-4">
        {back}
        <Card>
          <Badge tone="violet">Full program</Badge>
          <h1 className="mt-3 text-xl font-semibold">This explainer is part of the full program</h1>
          <p className="mt-2 text-sm text-muted">Unlock all explainers, all 120 days and a daily interview question by email.</p>
          {me.data && <div className="mt-4"><UpgradeOptions email={me.data.email} /></div>}
          <div className="mt-4"><LinkButton href="/app/library" variant="ghost">Back to Library</LinkButton></div>
        </Card>
      </div>
    );
  }
  if (error) return <LoadError status={error.status} onRetry={reload} />;
  if (!data) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">{back}<div><Badge>{data.category}</Badge><h1 className="mt-1 text-2xl font-bold">{data.title}</h1></div></div>
      <p className="text-muted">{data.tagline}</p>
      <Card><h2 className="font-semibold">In business language</h2><p className="mt-2 text-sm">{data.business}</p></Card>
      <Card><h2 className="font-semibold">Think of it like this</h2><p className="mt-2 text-sm">{data.analogy}</p></Card>
      <LessonBody body={"```arch\n" + data.arch + "\n```"} />
      <Card><h2 className="font-semibold">What it does to your plan</h2>{list(data.pm_cost)}</Card>
      <Card><h2 className="font-semibold">What goes wrong</h2>{list(data.goes_wrong)}</Card>
      <Card><h2 className="font-semibold">Questions to ask the engineers</h2>{list(data.ask)}</Card>
      <Card><h2 className="font-semibold">Say it in an interview</h2><p className="mt-2 text-sm">{data.interview}</p><p className="mt-2 text-xs text-muted">Replace this with your own real project story.</p></Card>
    </div>
  );
}
