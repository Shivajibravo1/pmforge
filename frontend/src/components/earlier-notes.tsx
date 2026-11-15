"use client";
import { NotebookPen } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore, useState } from "react";
import { type Note, collectNotes } from "@/lib/notes";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

// Serialised so the snapshot is stable between renders.
function read(day: number): string {
  try { return JSON.stringify(collectNotes(day, localStorage)); } catch { return "[]"; }
}

export function EarlierNotes({ day }: { day: number }) {
  const raw = useSyncExternalStore(subscribe, () => read(day), () => "[]");
  const notes = JSON.parse(raw) as Note[];
  const [open, setOpen] = useState(false);

  if (notes.length === 0) return null;
  return (
    <div>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface2 px-4 text-sm text-white hover:border-violet">
        <NotebookPen aria-hidden className="h-4 w-4 text-lime" />
        Notes from earlier lessons ({notes.length})
      </button>
      {open && (
        <ul className="mt-3 space-y-3 rounded-2xl border border-line bg-surface2 p-4" aria-label="Your notes from earlier lessons">
          {notes.map((n) => (
            <li key={n.day}>
              <Link href={`/app/lesson/${n.day}`} className="text-xs font-semibold uppercase tracking-wide text-lime underline">Day {n.day}</Link>
              <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm text-muted">{n.text}</p>
            </li>
          ))}
          <li className="text-xs text-muted">Saved on this device only.</li>
        </ul>
      )}
    </div>
  );
}
