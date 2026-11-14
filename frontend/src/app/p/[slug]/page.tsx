import { Badge, Card } from "@/components/ui";

type Pub = { items: { day: number; title: string; score: number; content: string }[] };

export default async function PublicPortfolio({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const api = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const res = await fetch(`${api}/public/portfolio/${encodeURIComponent(slug)}`, { cache: "no-store" });
  const data: Pub | null = res.ok ? await res.json() : null;
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-5 py-10">
      <h1 className="text-2xl font-bold">PM<span className="text-lime">Forge</span> portfolio</h1>
      {!data && <Card><p className="text-sm text-muted">This portfolio is private or does not exist.</p></Card>}
      {data?.items.map((i) => (
        <Card key={i.day}>
          <div className="flex items-center justify-between"><h2 className="font-semibold">Day {i.day}: {i.title}</h2><Badge tone="lime">{i.score}/100</Badge></div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{i.content}</p>
        </Card>
      ))}
    </main>
  );
}
