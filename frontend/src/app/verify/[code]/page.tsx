import { Card } from "@/components/ui";

type Cert = { valid: boolean; level: number; level_title: string; issued_at: string };

export default async function Verify({ params }: PageProps<"/verify/[code]">) {
  const { code } = await params;
  const api = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const res = await fetch(`${api}/public/certificates/${encodeURIComponent(code)}`, { cache: "no-store" });
  const cert: Cert | null = res.ok ? await res.json() : null;
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-12">
      <Card>
        {cert ? (
          <>
            <p className="text-sm font-semibold text-lime">Verified certificate</p>
            <h1 className="mt-2 text-xl font-bold">PMForge Level {cert.level}: {cert.level_title}</h1>
            <p className="mt-2 text-sm text-muted">Issued {cert.issued_at}</p>
          </>
        ) : (
          <><h1 className="text-xl font-bold">Certificate not found</h1><p className="mt-2 text-sm text-muted">This code is not valid.</p></>
        )}
      </Card>
    </main>
  );
}
