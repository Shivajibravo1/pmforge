"use client";
import { AdminUsers } from "@/components/admin-users";
import { Card, LinkButton, Notice, Spinner } from "@/components/ui";
import { useApi } from "@/lib/api";

type Stats = { users: number; active_7d?: number; lessons_completed: number; reviews: number; certificates: number; ai_cost_month_usd: number };

export default function Admin() {
  const { data, error } = useApi<Stats>("/api/v1/admin/stats");
  if (error) return <Notice>{error.status === 403 ? "Admin access required." : "Could not load stats."}</Notice>;
  if (!data) return <Spinner />;
  const rows: [string, string | number][] = [
    ["Users", data.users], ["Seen in last 7 days", data.active_7d ?? 0], ["Lessons completed", data.lessons_completed], ["Mentor reviews", data.reviews],
    ["Certificates", data.certificates], ["AI cost this month (USD)", data.ai_cost_month_usd.toFixed(4)],
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Admin</h1>
      <div className="grid grid-cols-2 gap-3">
        {rows.map(([k, v]) => <Card key={k}><p className="text-xs text-muted">{k}</p><p className="text-2xl font-bold">{v}</p></Card>)}
      </div>
      <div className="flex flex-wrap gap-3">
        <LinkButton href="/app/admin/emails">Email Composer</LinkButton>
        <LinkButton href="/app/admin/subscribers" variant="ghost">Subscribers</LinkButton>
      </div>
      <AdminUsers />
    </div>
  );
}
