import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, List, Section } from "@/components/legal";
import { CONTACT_EMAIL } from "@/lib/legal";
import { FREE_DAYS, TOTAL_DAYS } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Terms of Service | PMForge",
  description: "The terms that apply when you use PMForge.",
  alternates: { canonical: "/terms" },
};

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These terms govern your use of PMForge, a learning program for IT project managers at pmforge.pm. By creating an account or using PMForge you agree to them. If you do not agree, please do not use PMForge."
    >
      <Section n={1} title="Who can use PMForge">
        <p>
          PMForge is for adults aged 18 or over. You must give an email address that you control. If we learn that someone
          under 18 has an account, we may close it.
        </p>
      </Section>

      <Section n={2} title="Your account and sign-in">
        <List
          items={[
            "You sign in with a one-time code sent to your email. There is no password.",
            "Keep your email account secure. You are responsible for activity on your PMForge account.",
            "One account is for one person. Do not share your account or your access.",
            "Tell us promptly if you think someone else has used your account.",
          ]}
        />
      </Section>

      <Section n={3} title="Free and paid plans">
        <List
          items={[
            `The free plan includes Days 1 to ${FREE_DAYS} of the ${TOTAL_DAYS}-day program. Paid plans unlock all ${TOTAL_DAYS} days.`,
            "Paid plans are billed monthly or yearly. The price, currency and any taxes are shown at checkout before you pay.",
            "Payments are handled by a third-party payment provider. We do not see or store your card details.",
            "We may change prices or plans. A change does not affect a period you have already paid for.",
            <>Refunds are covered by our <Link className="underline" href="/refund">Refund Policy</Link>.</>,
          ]}
        />
      </Section>

      <Section n={4} title="Your content">
        <List
          items={[
            "You keep ownership of the work you submit, such as project artifacts.",
            "You give us a limited licence to store, process and display your content only to run PMForge for you. This includes sending it to our AI provider to produce feedback.",
            "Your portfolio is private by default. It becomes public only if you switch it on, and you can switch it off again.",
            "Do not submit passwords, personal data about other people, or confidential information that belongs to your employer or clients.",
          ]}
        />
      </Section>

      <Section n={5} title="The AI mentor">
        <List
          items={[
            "The mentor is an automated AI system. It can be wrong, incomplete or out of date.",
            "Its feedback is for learning. It is not professional, legal, financial, security or compliance advice.",
            "Check important answers against official sources before you rely on them.",
            "Daily limits and a monthly budget apply to AI features, and we may change them.",
          ]}
        />
      </Section>

      <Section n={6} title="Acceptable use">
        <p>You agree not to:</p>
        <List
          items={[
            "copy, resell, publish or share PMForge lessons or materials, except your own work;",
            "scrape, crawl or bulk-download PMForge, or use bots to complete lessons;",
            "try to break, probe or overload our systems, bypass limits, or manipulate the AI mentor into ignoring its rules;",
            "submit unlawful, harmful or infringing content;",
            "use PMForge to harm others or to break any law.",
          ]}
        />
        <p>We may suspend or close accounts that break these rules.</p>
      </Section>

      <Section n={7} title="Our content and licence to you">
        <p>
          PMForge lessons, text, graphics, software and design belong to us or our licensors. While you have an account, we
          give you a personal, non-exclusive, non-transferable licence to use them for your own learning. Names of
          frameworks and standards, such as PMI, PMP, ITIL, NIST, ISO and OWASP, belong to their respective owners. PMForge
          is not affiliated with or endorsed by them.
        </p>
      </Section>

      <Section n={8} title="Certificates and portfolio">
        <List
          items={[
            "A PMForge certificate shows that you completed a level of the PMForge program. It is not an accredited qualification and it is not a PMP or any other credential from a professional body.",
            "Anyone with a certificate code can check its level, title and issue date on our verification page.",
            "You must not alter a certificate or claim one you have not earned.",
          ]}
        />
      </Section>

      <Section n={9} title="Availability and changes">
        <p>
          We work to keep PMForge available, but we do not promise it will be uninterrupted or error free. We may update,
          add or remove features and lessons. If we make a change that materially reduces what a paying customer receives, we
          will tell you.
        </p>
      </Section>

      <Section n={10} title="Disclaimers">
        <p>
          PMForge is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We do not promise that using
          PMForge will lead to a job, a promotion, a pay rise or any particular result. Statistics and forecasts shown on
          our site come from third-party sources named next to them, and we do not control them.
        </p>
      </Section>

      <Section n={11} title="Limit of liability">
        <p>
          To the extent the law allows, we are not liable for indirect or consequential loss, or for loss of profit, income,
          data or opportunity. Our total liability to you for any claim related to PMForge is limited to the amount you paid
          us in the 12 months before the claim. Nothing in these terms limits liability that cannot be limited by law.
        </p>
      </Section>

      <Section n={12} title="Ending your account">
        <p>
          You can stop using PMForge at any time and ask us to close your account by email. We may suspend or end your access
          if you break these terms or if we have to by law. Sections that by their nature should continue, such as
          intellectual property and liability, continue after your account ends.
        </p>
      </Section>

      <Section n={13} title="Changes to these terms">
        <p>
          We may update these terms. We will change the date at the top, and for material changes we will give notice by
          email or in the app. Continuing to use PMForge after a change means you accept it.
        </p>
      </Section>

      <Section n={14} title="Governing law">
        <p>
          These terms are governed by the laws of India, and the courts of India have jurisdiction, without removing any
          mandatory consumer rights you have where you live.
        </p>
      </Section>

      <Section n={15} title="Privacy and contact">
        <p>
          Our <Link className="underline" href="/privacy">Privacy Policy</Link> explains how we handle your data. For
          questions about these terms, email <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </Section>
    </LegalPage>
  );
}
