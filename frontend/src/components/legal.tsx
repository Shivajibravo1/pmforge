import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_UPDATED } from "@/lib/legal";
import { SiteFooter } from "@/components/landing/footer";

export function LegalPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-3">
          <Link href="/" className="text-xl font-bold" aria-label="PMForge home">PM<span className="text-lime">Forge</span></Link>
          <Link href="/sign-in?mode=signin" className="text-sm text-muted hover:text-white">Sign in</Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated {LEGAL_UPDATED}</p>
        <p className="mt-6 text-muted">{intro}</p>
        <div className="mt-8 space-y-8">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`s${n}`}>
      <h2 id={`s${n}`} className="text-xl font-semibold">{n}. {title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#e6e6ee]">{children}</div>
    </section>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((t, i) => <li key={i}>{t}</li>)}
    </ul>
  );
}

export function DataTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-surface2 text-muted">
            {head.map((h) => <th key={h} scope="col" className="p-3 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line align-top last:border-0">
              {r.map((c, j) => <td key={j} className="p-3">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
