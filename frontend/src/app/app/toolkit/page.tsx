"use client";
import { FileSpreadsheet, Layers, Mic } from "lucide-react";
import Link from "next/link";

const tools = [
  { href: "/app/practice", title: "Interview practice", text: "Timed questions for Agile, Functional and AI project manager roles. Check yourself against a rubric, then compare with a model answer.", Icon: Mic },
  { href: "/app/library", title: "Architecture Library", text: "The technology your projects run on, explained in business language, with what to ask the engineers.", Icon: Layers },
  { href: "/app/templates", title: "PM templates", text: "Fill-in RAID log, risk register, charter, RACI and more, each with a worked example. Download as a spreadsheet file.", Icon: FileSpreadsheet },
] as const;

export default function Toolkit() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Toolkit</h1>
        <p className="mt-1 text-sm text-muted">Practical tools for the job and for the interview. Use them next to your daily lesson.</p>
      </div>
      <ul className="grid gap-3">
        {tools.map(({ href, title, text, Icon }) => (
          <li key={href}>
            <Link href={href} className="flex gap-4 rounded-2xl border border-line bg-surface2 p-4 transition hover:border-violet">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet/20 text-lime"><Icon aria-hidden className="h-5 w-5" /></span>
              <span><span className="block font-semibold text-white">{title}</span><span className="mt-1 block text-sm text-muted">{text}</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
