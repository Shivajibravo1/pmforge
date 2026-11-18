import { Button } from "@/components/ui";

/**
 * Admin preview of a completion certificate. The SAMPLE watermark and code make it impossible
 * to mistake for a real, verifiable certificate.
 */
export function SampleCertificate({ level, title, lessons, onClose }: { level: number; title: string; lessons: number; onClose: () => void }) {
  return (
    <div className="space-y-3" role="region" aria-label={`Sample certificate for Level ${level}`}>
      <div className="relative overflow-hidden rounded-2xl border-4 border-violet bg-white p-8 text-center text-black">
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="-rotate-12 select-none text-7xl font-black tracking-widest text-black/10 sm:text-8xl">SAMPLE</span>
        </div>
        <div className="relative space-y-3">
          <p className="text-sm font-bold tracking-widest">PM<span className="rounded bg-black px-1 text-lime">Forge</span></p>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet">Certificate of completion</p>
          <p className="pt-2 text-sm text-black/70">This certifies that</p>
          <p className="border-b-2 border-lime pb-1 text-2xl font-bold">Sample Learner</p>
          <p className="text-sm text-black/70">has completed all {lessons} lessons and the assessment of</p>
          <p className="text-lg font-bold">Level {level}: {title}</p>
          <p className="text-sm text-black/70">in the PMForge programme for IT project managers.</p>
          <div className="flex items-end justify-between pt-4 text-left text-xs text-black/70">
            <div><p className="font-semibold text-black">Issued</p><p>Sample date</p></div>
            <div className="text-right"><p className="font-semibold text-black">Verification code</p><p className="font-mono">SAMPLE-L{level}</p></div>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted">Admin preview only. A real certificate gets a unique code and a public verification page.</p>
      <Button variant="ghost" onClick={onClose}>Close preview</Button>
    </div>
  );
}
