"use client";
import { Sparkles } from "lucide-react";
import { useEffect } from "react";

export type XpGain = { xp: number; total: number; streak: number };

export function XpToast({ gain, onClose }: { gain: XpGain; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [gain, onClose]);

  return (
    <div role="status" aria-live="polite" className="pm-slide fixed inset-x-4 bottom-6 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-lime bg-black p-4 shadow-lg">
      <Sparkles aria-hidden className="h-6 w-6 shrink-0 text-lime" />
      <div className="flex-1">
        <p className="text-base font-bold text-lime">+{gain.xp} XP</p>
        <p className="text-xs text-muted">{gain.total} XP in total{gain.streak > 1 ? `, ${gain.streak} day streak` : ""}</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Dismiss" className="min-h-11 px-2 text-sm text-muted hover:text-white">Close</button>
    </div>
  );
}
