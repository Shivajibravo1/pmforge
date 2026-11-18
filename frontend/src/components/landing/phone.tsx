import { Award, BookOpen, Briefcase, FileCheck2, Home, MessageCircle, Sparkles, UserCircle } from "lucide-react";

const tabs = [
  ["Today", Home],
  ["Course", BookOpen],
  ["Portfolio", Briefcase],
  ["Mentor", MessageCircle],
  ["You", UserCircle],
] as const;

/** Decorative preview of the Today screen. Day 5 and Day 6 are real titles from the curriculum. */
export function PhoneToday() {
  return (
    <div className="relative mx-auto w-fit">
      <Chip className="-left-3 -top-4 sm:-left-36 sm:top-8" delay="0s" icon={FileCheck2} text="Artifact shipped" />
      <Chip className="-right-3 top-44 sm:-right-20" delay="1.2s" icon={Sparkles} text="Mentor review" />
      <Chip className="-left-3 bottom-8 sm:-left-36 sm:bottom-20" delay="2.1s" icon={Award} text="Level certificate" />
      <PhoneBody />
    </div>
  );
}

function Chip({ className, delay, icon: Icon, text }: { className: string; delay: string; icon: typeof Award; text: string }) {
  return (
    <span
      aria-hidden
      style={{ animationDelay: delay }}
      className={`pm-bob absolute z-10 flex items-center gap-2 rounded-full border border-line bg-surface/95 px-3 py-2 text-xs font-medium shadow-lg backdrop-blur ${className}`}
    >
      <Icon className="h-4 w-4 text-lime" />
      {text}
    </span>
  );
}

function PhoneBody() {
  return (
    <div
      role="img"
      aria-label="Preview of the PMForge Today screen showing Day 5, Write a project charter for a website migration"
      className="mx-auto w-[17.5rem] rounded-[2.2rem] border border-line bg-surface p-3 shadow-[0_0_80px_-20px_#7e3bed]"
    >
      <div className="rounded-[1.6rem] bg-black p-4" aria-hidden>
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span>Day 5 of 120</span>
          <span className="rounded-full bg-surface2 px-2 py-0.5 text-lime">Level 1</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface2">
          <div className="pm-hero-bar h-full w-[4%] rounded-full bg-lime" />
        </div>
        <p className="mt-5 text-[11px] font-medium text-lime">Today · Build sprint</p>
        <p className="mt-1 text-base font-semibold leading-snug">Write a project charter for a website migration</p>
        <p className="mt-2 text-xs text-muted">Deliver the artifact, then get a rubric review from your AI mentor.</p>
        <div className="mt-4 rounded-xl bg-violet px-4 py-2.5 text-center text-sm font-semibold">Start today&apos;s build</div>
        <div className="mt-4 rounded-xl border border-line bg-surface p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted">Up next</p>
          <p className="mt-0.5 text-xs font-medium">Day 6 · Healthcare.gov launch (2013)</p>
        </div>
        <div className="mt-5 grid grid-cols-5 gap-1 border-t border-line pt-3 text-center text-[9px] text-muted">
          {tabs.map(([label, Icon], i) => (
            <span key={label} className={i === 0 ? "text-lime" : ""}>
              <Icon className="mx-auto mb-0.5 h-4 w-4" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
