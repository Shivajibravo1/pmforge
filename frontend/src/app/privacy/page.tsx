import type { Metadata } from "next";
import Link from "next/link";
import { DataTable, LegalPage, List, Section } from "@/components/legal";
import { CONTACT_EMAIL, PRIVACY_RESPONSE_DAYS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy | PMForge",
  description: "What personal data PMForge collects, why, who receives it, and your rights.",
  alternates: { canonical: "/privacy" },
};

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This policy explains what personal data PMForge collects, why we use it, who receives it and what rights you have. It applies to pmforge.pm and the PMForge app."
    >
      <Section n={1} title="What we collect">
        <DataTable
          head={["Data", "Why we need it"]}
          rows={[
            ["Email address", "To create your account and send your one-time sign-in code."],
            ["Full name", "To set up your account, personalise the app and print your name on certificates."],
            ["Mobile number, given at enrollment (we do not verify it by SMS)", "To contact you about your account and service."],
            ["Learning progress: completed days, XP, completion dates", "To run the program, show progress and issue certificates."],
            ["Work you submit: project artifacts, and the score and feedback the AI mentor returns", "To give you reviews and build your portfolio."],
            ["Certificates: code, level, issue date", "To issue certificates and let others verify them."],
            ["Portfolio settings: public link and on or off choice", "To show your portfolio only if you choose."],
            ["Interview email opt-in record: date and time, and the wording you agreed to (paid members who choose the daily interview question bonus only)", "To send the daily questions you asked for, and to prove your consent."],
            ["Plan status", "To know whether you are on the free or a paid plan."],
            ["Usage counts and cost of AI calls", "To enforce daily limits and a monthly budget."],
            ["Technical data: IP address, device and request information", "To keep the service secure, limit abuse and fix faults."],
          ]}
        />
        <p>
          Mentor chat messages are sent to our AI provider to produce a reply. We do not store the text of your chat
          messages. We keep only usage counts and cost.
        </p>
        <p>We do not collect your payment card details. Our payment provider handles payments.</p>
      </Section>

      <Section n={2} title="How we use your data">
        <List
          items={[
            "To provide PMForge: sign you in, deliver lessons, review your work, track progress and issue certificates.",
            "To keep PMForge secure and prevent abuse, including rate limiting and fraud checks.",
            "To communicate with you about your account, sign-in codes, purchases and important changes.",
            "To meet legal, tax and accounting duties.",
            "To improve PMForge using your usage in aggregate form.",
          ]}
        />
        <p>
          Where the law requires a legal basis, we rely on your consent, on the need to perform our contract with you, on
          our legitimate interests in running and securing the service, and on legal obligations.
        </p>
      </Section>

      <Section n={3} title="Who receives your data">
        <p>We use service providers to run PMForge. They process data on our behalf.</p>
        <DataTable
          head={["Provider type", "What they do", "Data involved"]}
          rows={[
            ["Hosting and database", "Run the website, the app and the database", "All account and learning data"],
            ["Email delivery", "Send your sign-in codes and, if you opt in, the daily interview question", "Email address and the message sent"],
            ["AI provider (OpenAI)", "Produce mentor replies and artifact reviews", "The text you submit for review or chat, after we remove detected personal data"],
            ["Payment provider", "Take and refund payments", "Payment and plan details, handled by the provider"],
          ]}
        />
        <p>
          Before text goes to the AI provider, we automatically remove patterns that look like email addresses, phone
          numbers, card numbers and secret keys. This is automated and can miss some data, so please do not enter personal
          or confidential information. We ask the provider not to store requests for later retrieval. The provider may keep
          limited data for safety and abuse monitoring under its own terms.
        </p>
        <p>
          We do not sell your personal data. We share it with authorities only when the law requires it, or to protect
          people and our rights.
        </p>
      </Section>

      <Section n={4} title="Public information">
        <List
          items={[
            "Your portfolio is private unless you switch it on. When it is on, anyone with its link can see the items in it. We do not show your email address there.",
            "A certificate verification page shows the level, level title and issue date for a valid certificate code. It does not show your name or email.",
          ]}
        />
      </Section>

      <Section n={5} title="Cookies">
        <p>
          We use only essential cookies, which keep you signed in and protect your session. We do not currently use
          advertising or analytics cookies on PMForge. If that changes, we will update this policy and ask for consent where
          the law requires it.
        </p>
      </Section>

      <Section n={6} title="International transfers">
        <p>
          Our providers may process data in countries other than yours, including outside India and the European Economic
          Area. Where the law requires safeguards for such transfers, we use appropriate ones.
        </p>
      </Section>

      <Section n={7} title="How long we keep data">
        <List
          items={[
            "Account, progress, submissions and certificates: while your account is open.",
            "When you ask us to delete your account, we delete or anonymise your personal data, except records we must keep by law, such as payment and tax records.",
            "Backups and security logs are kept for a limited period and then removed.",
          ]}
        />
      </Section>

      <Section n={8} title="Security">
        <List
          items={[
            "Traffic is encrypted in transit using HTTPS.",
            "Sign-in codes expire after 5 minutes, allow a limited number of attempts, and are stored only as hashes.",
            "Requests are rate limited to reduce abuse.",
            "Mentor text is filtered for personal data and screened before it reaches the AI provider.",
            "If a personal data breach affects you, we will notify you and the relevant authority as the law requires.",
          ]}
        />
        <p>No system is perfectly secure, so please use a mailbox you protect and keep your sign-in codes private.</p>
      </Section>

      <Section n={9} title="Your rights">
        <p>Depending on where you live, including under India&apos;s Digital Personal Data Protection Act and the EU General Data Protection Regulation, you can:</p>
        <List
          items={[
            "ask for access to the personal data we hold about you;",
            "ask us to correct or complete it;",
            "ask us to erase it;",
            "withdraw consent at any time, without affecting earlier processing;",
            "object to or ask us to restrict certain processing, and ask for a portable copy where the law gives you that right;",
            "nominate another person to exercise your rights if you die or cannot act, where the law allows;",
            "complain to us, and then to your data protection authority, such as the Data Protection Board of India or an EU supervisory authority.",
          ]}
        />
        <p>
          To use a right, email <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from your account
          email. We aim to respond within {PRIVACY_RESPONSE_DAYS} days.
        </p>
      </Section>

      <Section n={10} title="Children">
        <p>
          PMForge is for adults aged 18 or over. We do not knowingly collect data from children. If you believe a child has
          given us data, email us and we will delete it.
        </p>
      </Section>

      <Section n={11} title="Changes to this policy">
        <p>
          We may update this policy. We will change the date at the top and, for material changes, tell you by email or in
          the app.
        </p>
      </Section>

      <Section n={12} title="Contact and grievances">
        <p>
          For privacy questions, requests or complaints, email{" "}
          <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. See also our{" "}
          <Link className="underline" href="/terms">Terms of Service</Link> and{" "}
          <Link className="underline" href="/refund">Refund Policy</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
