import { CalendarDays, Gift, Layers, Target } from "lucide-react";
import { FREE_DAYS, TOTAL_DAYS } from "@/lib/pricing";
import { CountUp } from "./motion";

const items = [
  { icon: CalendarDays, to: TOTAL_DAYS, label: "days of daily practice" },
  { icon: Layers, to: 4, label: "levels, basics to AI" },
  { icon: Target, to: 30, label: "days per level" },
  { icon: Gift, to: FREE_DAYS, label: "days free to start" },
];

/** Plain facts about the program, counted up once on scroll. */
export function Stats() {
  return (
    <ul className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-3 px-5 pb-4 md:grid-cols-4" aria-label="Program at a glance">
      {items.map(({ icon: Icon, to, label }) => (
        <li key={label} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet/25 text-lime">
            <Icon className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-3xl font-bold leading-none"><CountUp to={to} /></span>
            <span className="mt-1 block text-xs text-muted">{label}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
