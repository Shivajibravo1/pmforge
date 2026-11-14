import { LinkButton, Card } from "@/components/ui";

const levels = [
  ["Level 1", "IT Delivery Foundations", "Charter, plan, RAID log and status reporting for real IT projects."],
  ["Level 2", "Agile and Hybrid Delivery", "Scrum, flow metrics, SAFe, vendors and leading people."],
  ["Level 3", "Cloud, DevSecOps and Service Delivery", "Cloud migration, release, security by design and ITIL 4."],
  ["Level 4", "AI-enabled IT Programs", "AI business cases, evals, governance and a capstone program plan."],
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10">
      <header className="flex items-center justify-between">
        <span className="text-xl font-bold">PM<span className="text-lime">Forge</span></span>
        <LinkButton href="/sign-in" variant="ghost">Sign in</LinkButton>
      </header>
      <section className="py-16">
        <p className="mb-3 text-sm font-medium text-lime">120 days · for working IT project managers</p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">Build proof, not notes.</h1>
        <p className="mt-5 max-w-2xl text-lg text-muted">
          Every day you ship a real project artifact and get an AI mentor review against a rubric. You finish with a
          public portfolio and verifiable certificates that show what you can deliver, from basic IT projects to AI-enabled programs.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <LinkButton href="/sign-in" variant="lime">Start free</LinkButton>
          <LinkButton href="#program" variant="ghost">See the program</LinkButton>
        </div>
      </section>
      <section id="program" className="grid gap-4 sm:grid-cols-2">
        {levels.map(([lv, title, text]) => (
          <Card key={lv}>
            <p className="text-sm text-lime">{lv}</p>
            <h2 className="mt-1 text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted">{text}</p>
          </Card>
        ))}
      </section>
      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          ["Daily build sprints", "Short lessons, then you build a charter, RAID log, release plan or AI business case."],
          ["AI mentor reviews", "Rubric-based feedback on your work, with clear gaps and next steps."],
          ["Portfolio and certificates", "A public portfolio link and a certificate anyone can verify."],
        ].map(([t, d]) => (
          <Card key={t}><h3 className="font-semibold">{t}</h3><p className="mt-2 text-sm text-muted">{d}</p></Card>
        ))}
      </section>
    </main>
  );
}
