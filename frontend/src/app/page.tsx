import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { LinkButton, Card } from "@/components/ui";
import { MentorPreview } from "@/components/landing/mentor-preview";
import { PhoneToday } from "@/components/landing/phone";
import { Pricing } from "@/components/landing/pricing";
import { Bot, Cloud, ClipboardList, Workflow } from "lucide-react";
import { DayMap } from "@/components/landing/day-map";
import { Evolution } from "@/components/landing/evolution";
import { LearningLoop } from "@/components/landing/loop";
import { Stats } from "@/components/landing/stats";
import { Gates, Pressure, Reality, Segments } from "@/components/landing/sections";
import { SiteFooter } from "@/components/landing/footer";
import { FREE_DAYS, TOTAL_DAYS, countryFromHeaders, resolveCurrency } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "PMForge: build proof, not notes",
  description: `A ${TOTAL_DAYS}-day program for working IT project managers. Ship a real project artifact every day, get an AI mentor review, and finish with a public portfolio and verifiable certificates.`,
  alternates: { canonical: "/" },
};

const levels = [
  { lv: "Level 1", days: "Days 1 to 30", title: "IT Delivery Foundations", text: "Charter, plan, RAID log and status reporting for real IT projects.", sample: "Day 5: Write a project charter for a website migration" },
  { lv: "Level 2", days: "Days 31 to 60", title: "Agile and Hybrid Delivery", text: "Scrum, flow metrics, SAFe, vendors and leading people.", sample: "Day 34: Build a 20-story backlog in Jira or Azure DevOps" },
  { lv: "Level 3", days: "Days 61 to 90", title: "Cloud, DevSecOps and Service Delivery", text: "Cloud migration, release, security by design and ITIL 4.", sample: "Day 80: Critical CVE found 2 days before go-live" },
  { lv: "Level 4", days: "Days 91 to 120", title: "AI-enabled IT Programs", text: "AI business cases, evals, governance and a capstone program plan.", sample: "Day 100: 20-row eval set run against the OpenAI API" },
];

const levelIcons = [ClipboardList, Workflow, Cloud, Bot];

const faqs = [
  ["Who is PMForge for?", "Working IT project managers who want to move from basic IT delivery to AI-enabled programs, and anyone preparing for a PM interview in that space."],
  ["What do I get for free?", `Days 1 to ${FREE_DAYS} of Level 1, including the AI mentor review and your progress profile. Paid plans unlock all ${TOTAL_DAYS} days.`],
  ["How does sign-in work?", "You enter your email and we send a one-time 6-digit code. There is no password to create, reuse or leak. Codes expire after 5 minutes and allow only a few attempts."],
  ["Is the mentor a person?", "No. The mentor is an AI that reviews your work against a rubric. It can be wrong, so verify important answers, and never paste passwords, personal data or confidential client information."],
  ["Do I get proof of my work?", "Yes. Each level ends with an assessment and certificate, and your portfolio can be shared through a public link. Certificates can be checked through a verification page."],
  ["Does PMForge cover AI security, cost and compliance?", "Yes. Level 4 covers AI business cases, evals, cost models, risk registers, NIST AI Risk Management Framework, ISO/IEC 42001, the EU AI Act and LLM security. Level 3 covers cloud cost, DevSecOps and compliance."],
  ["What is the daily interview question bonus?", "Paid members can opt in to one interview question a day by email, rotating across AI project management, AI security and AI product management. It is optional, is sent to your account email, and you can stop at any time with the unsubscribe link in every email."],
  ["How long does it take?", `The program is ${TOTAL_DAYS} days in 4 levels of 30 days. Each level includes a buffer day for catching up.`],
];

export default async function Home() {
  const currency = resolveCurrency(countryFromHeaders(await headers()));

  return (
    <div className="pb-24 sm:pb-0">
      <header className="sticky top-0 z-20 border-b border-line bg-black/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" className="text-xl font-bold" aria-label="PMForge home">PM<span className="text-lime">Forge</span></Link>
          <nav aria-label="Page sections" className="hidden items-center gap-6 text-sm text-muted md:flex">
            <a href="#program" className="hover:text-white">Program</a>
            <a href="#mentor" className="hover:text-white">Mentor</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <LinkButton href="/sign-in?mode=signin" variant="ghost">Sign in</LinkButton>
            <span className="hidden sm:inline"><LinkButton href="/sign-in" variant="lime">Start free</LinkButton></span>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[52rem] -translate-x-1/2 rounded-full bg-violet/30 blur-[120px]" />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
            <div>
              <p className="mb-3 text-sm font-medium text-lime">{TOTAL_DAYS} days · for working IT project managers</p>
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Every IT project now has an AI question. Can you answer it?</h1>
              <p className="mt-5 max-w-xl text-lg text-muted">
                Build proof, not notes. Every day you ship a real project artifact and get an AI mentor review against a
                rubric, from basic IT delivery to AI-enabled programs that must stay secure, affordable and compliant. You
                finish with a public portfolio and verifiable certificates.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <LinkButton href="/sign-in" variant="lime">Start free</LinkButton>
                <LinkButton href="#program" variant="ghost">See the program</LinkButton>
              </div>
              <p className="mt-4 text-sm text-muted">Days 1 to {FREE_DAYS} are free. Sign in with a one-time email code.</p>
            </div>
            <PhoneToday />
          </div>
        </section>

        <Stats />

        <section className="mx-auto w-full max-w-6xl px-5 py-12">
          <p className="text-sm font-medium text-lime">The AI reality</p>
          <h2 className="mt-2 mb-8 max-w-3xl text-3xl font-bold">AI projects are failing on cost, value and risk. That is a project management problem.</h2>
          <Reality />
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-12">
          <p className="text-sm font-medium text-lime">Who it is for</p>
          <h2 className="mt-2 mb-8 max-w-3xl text-3xl font-bold">Built for people who deliver IT projects, or want to.</h2>
          <Segments />
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-12">
          <p className="text-sm font-medium text-lime">Four gates</p>
          <h2 className="mt-2 mb-8 max-w-3xl text-3xl font-bold">Every AI project must clear value, security, cost and compliance.</h2>
          <Gates />
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-12">
          <p className="text-sm font-medium text-lime">Real pressure, rehearsed</p>
          <h2 className="mt-2 mb-8 max-w-3xl text-3xl font-bold">Practise the hard calls before you face them at work.</h2>
          <Pressure />
        </section>

        <section id="program" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-12">
          <p className="text-sm font-medium text-lime">The program</p>
          <h2 className="mt-2 max-w-3xl text-3xl font-bold">Four levels, 30 days each, from basics to AI-enabled programs.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {levels.map((l, i) => {
              const Icon = levelIcons[i];
              return (
                <Card key={l.lv} className="group relative overflow-hidden transition hover:border-violet">
                  <div aria-hidden className="absolute inset-x-0 top-0 flex h-1">
                    {levels.map((_, k) => <span key={k} className={`flex-1 ${k <= i ? "bg-lime" : "bg-surface2"}`} />)}
                  </div>
                  <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet text-white transition group-hover:scale-110"><Icon className="h-6 w-6" /></span>
                    <div>
                      <p className="text-sm text-lime">{l.lv} · {l.days}</p>
                      <h3 className="mt-1 text-lg font-semibold">{l.title}</h3>
                      <p className="mt-2 text-sm text-muted">{l.text}</p>
                    </div>
                  </div>
                  <p className="mt-4 border-t border-line pt-3 text-xs text-muted">{l.sample}</p>
                </Card>
              );
            })}
          </div>
          <h3 className="mt-14 mb-4 text-xl font-semibold">Every day follows one loop</h3>
          <LearningLoop />
          <h3 className="mt-14 mb-2 text-xl font-semibold">All {TOTAL_DAYS} days, one screen</h3>
          <p className="mb-4 max-w-2xl text-sm text-muted">Hover, tap or tab through the map to read any day, or pick a lesson type to light it up.</p>
          <DayMap />
        </section>

        <section id="mentor" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-12">
          <p className="text-sm font-medium text-lime">The mentor</p>
          <div className="mt-2 grid items-start gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold">Feedback you can act on the same day.</h2>
              <p className="mt-4 text-muted">
                The AI mentor reviews each build against a rubric and returns what worked, what is missing and what to do
                next. It gives feedback, not a model answer, so the improvement is yours.
              </p>
            </div>
            <MentorPreview />
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-12">
          <p className="text-sm font-medium text-lime">Your progress, visible</p>
          <h2 className="mt-2 mb-8 max-w-3xl text-3xl font-bold">Your character grows as your skills do.</h2>
          <Evolution />
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-12">
          <p className="text-sm font-medium text-lime">Our ambition</p>
          <h2 className="mt-2 max-w-3xl text-3xl font-bold">Make every IT project manager AI-ready, with proof to show for it.</h2>
          <p className="mt-4 max-w-3xl text-muted">
            AI is now part of how IT projects are justified, funded, secured and audited. PMForge exists so that a project
            manager can walk into that conversation with real artifacts, not just a certificate: a charter, a cost model, a
            risk register, a governance pack. We are building the most practical, evidence-based path from basic IT delivery
            to AI-enabled programs, and we hold ourselves to the standard we teach.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["Practical", "Every day ends in an artifact a sponsor would recognise, not a quiz score."],
              ["Honest", "Cited numbers, labelled forecasts and no invented testimonials."],
              ["Secure by design", "One-time email codes, rate limits and filtered AI inputs from day one."],
            ].map(([t, d]) => (
              <Card key={t}><h3 className="font-semibold">{t}</h3><p className="mt-2 text-sm text-muted">{d}</p></Card>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">Built by a practising, PMP-certified IT project manager.</p>
          <p className="mt-1 text-xs text-muted">PMForge is new. There are no testimonials here yet, and we will not invent any.</p>
        </section>

        <section id="pricing" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-12">
          <p className="text-sm font-medium text-lime">Pricing</p>
          <h2 className="mt-2 mb-8 max-w-3xl text-3xl font-bold">Start free. Upgrade when you want all {TOTAL_DAYS} days.</h2>
          <Pricing initialCurrency={currency} />
        </section>

        <section id="faq" className="mx-auto w-full max-w-3xl scroll-mt-20 px-5 py-12">
          <p className="text-sm font-medium text-lime">Questions</p>
          <h2 className="mt-2 mb-6 text-3xl font-bold">Frequently asked questions</h2>
          <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {faqs.map(([q, a]) => (
              <details key={q} className="group p-5">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {q}
                  <span aria-hidden className="text-lime transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-16 text-center">
          <p className="text-sm font-medium text-lime">Day 001</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-5xl">Your first artifact is one sign-in away.</h2>
          <div className="mt-8 flex justify-center">
            <LinkButton href="/sign-in" variant="lime">Start free</LinkButton>
          </div>
        </section>
      </main>

      <SiteFooter />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-black/95 p-3 backdrop-blur sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted">Days 1 to {FREE_DAYS} are free</span>
          <LinkButton href="/sign-in" variant="lime">Start free</LinkButton>
        </div>
      </div>
    </div>
  );
}
