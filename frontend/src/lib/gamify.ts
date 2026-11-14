/** Gamification rules. XP total across the 120-day curriculum is 2,650. */
export type Form = { tier: number; name: string; title: string; minXp: number; blurb: string };

export const FORMS: Form[] = [
  { tier: 1, name: "Spark", title: "Rookie Planner", minXp: 0, blurb: "Every delivery lead starts with a plan and a notebook." },
  { tier: 2, name: "Scout", title: "Risk Scout", minXp: 150, blurb: "You now spot problems before they spot you." },
  { tier: 3, name: "Builder", title: "Sprint Builder", minXp: 400, blurb: "You ship real work and keep teams moving." },
  { tier: 4, name: "Strategist", title: "Delivery Strategist", minXp: 800, blurb: "You lead with a flag, a plan and a clear route." },
  { tier: 5, name: "Guardian", title: "Security Guardian", minXp: 1300, blurb: "Cloud and DevSecOps armour. Nothing ships unprotected." },
  { tier: 6, name: "Architect", title: "Programme Architect", minXp: 1900, blurb: "You see the whole system and the people in it." },
  { tier: 7, name: "Legend", title: "AI Programme Legend", minXp: 2500, blurb: "You lead AI-enabled programmes with confidence." },
];

export function formFor(xp: number): Form {
  let f = FORMS[0];
  for (const x of FORMS) if (xp >= x.minXp) f = x;
  return f;
}

export function nextForm(xp: number): Form | null {
  return FORMS.find((f) => f.minXp > xp) ?? null;
}

/** Progress inside the current form, 0 to 100. Maxed out returns 100. */
export function formProgress(xp: number): number {
  const cur = formFor(xp);
  const nxt = nextForm(xp);
  if (!nxt) return 100;
  return Math.round(((xp - cur.minXp) / (nxt.minXp - cur.minXp)) * 100);
}

export type Badge = { id: string; label: string; hint: string; icon: string; earned: boolean };

export function badges(p: { completed: number[]; streak: number; total_xp: number }): Badge[] {
  const done = new Set(p.completed);
  const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i).every((d) => done.has(d));
  return [
    { id: "first", label: "First step", hint: "Complete 1 lesson", icon: "flag", earned: done.size >= 1 },
    { id: "free", label: "Free tier done", hint: "Complete Days 1 to 10", icon: "check", earned: range(1, 10) },
    { id: "streak3", label: "3 day streak", hint: "Learn 3 days in a row", icon: "zap", earned: p.streak >= 3 },
    { id: "streak7", label: "7 day streak", hint: "Learn 7 days in a row", icon: "zap", earned: p.streak >= 7 },
    { id: "l1", label: "Foundations", hint: "Finish Level 1", icon: "book", earned: range(1, 30) },
    { id: "half", label: "Halfway", hint: "Complete 60 lessons", icon: "map", earned: done.size >= 60 },
    { id: "all", label: "Full programme", hint: "Complete all 120 lessons", icon: "rocket", earned: done.size >= 120 },
    { id: "xp1000", label: "1,000 XP", hint: "Earn 1,000 XP", icon: "spark", earned: p.total_xp >= 1000 },
  ];
}
