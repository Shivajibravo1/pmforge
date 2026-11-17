import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, List, Section } from "@/components/legal";
import {
  CONTACT_EMAIL,
  REFUND_LESSON_THRESHOLD,
  REFUND_COMPLETION_PERCENT,
  REFUND_RESPONSE_BUSINESS_DAYS,
  REFUND_WINDOW_DAYS,
} from "@/lib/legal";
import { TOTAL_DAYS } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Refund Policy | PMForge",
  description: `Refunds are available within ${REFUND_WINDOW_DAYS} days of purchase, unless you have completed ${REFUND_COMPLETION_PERCENT}% or more of the program.`,
  alternates: { canonical: "/refund" },
};

export default function Refund() {
  return (
    <LegalPage
      title="Refund Policy"
      intro="We want you to try PMForge with confidence. This policy explains when you can get your money back for a paid plan."
    >
      <Section n={1} title="The short version">
        <List
          items={[
            <>You can ask for a refund within <strong>{REFUND_WINDOW_DAYS} days</strong> of the date of purchase.</>,
            <>
              A refund is <strong>not available</strong> if you have completed <strong>{REFUND_COMPLETION_PERCENT}% or more</strong> of the
              program, which is {REFUND_LESSON_THRESHOLD} or more of the {TOTAL_DAYS} lessons.
            </>,
            "Days 1 to 10 are free, so you can try the start of the program before you pay.",
          ]}
        />
      </Section>

      <Section n={2} title="Who and what this covers">
        <p>
          This policy applies to paid plans bought directly on PMForge: the monthly plan and the yearly plan. The refund
          window runs from the date and time of the purchase shown on your payment receipt.
        </p>
      </Section>

      <Section n={3} title="How we measure the 30% limit">
        <List
          items={[
            <>
              We count the lessons marked as completed in your PMForge account at the time you send your refund request. All
              completed lessons count, including free lessons you finished before you paid.
            </>,
            <>
              The program has {TOTAL_DAYS} lessons, so the limit is reached at {REFUND_LESSON_THRESHOLD} completed lessons.
            </>,
            "Opening a lesson without completing it does not count as completed.",
          ]}
        />
      </Section>

      <Section n={4} title="How to request a refund">
        <List
          items={[
            <>
              Email <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the email address on your
              PMForge account, with the subject &quot;Refund request&quot;.
            </>,
            "Include the date of purchase and the plan you bought.",
            <>We aim to reply within {REFUND_RESPONSE_BUSINESS_DAYS} business days with a decision.</>,
          ]}
        />
      </Section>

      <Section n={5} title="How refunds are paid">
        <List
          items={[
            "Approved refunds go back to the original payment method, through the payment provider that took your payment, and in the currency you paid.",
            "After we approve a refund, the time it takes to appear depends on your bank or card issuer and the payment provider.",
            "When a refund is approved, your paid access ends and your account returns to the free plan.",
          ]}
        />
      </Section>

      <Section n={6} title="Cancelling a plan">
        <p>
          You can cancel at any time by emailing us. Cancelling stops future renewals. Your access continues until the end
          of the period you have already paid for. Cancelling does not by itself create a refund, so please send a refund
          request if you are within the window.
        </p>
      </Section>

      <Section n={7} title="Misuse">
        <p>
          We may decline a refund if there is evidence of abuse, such as copying or sharing course content or sharing an
          account, as described in our <Link className="underline" href="/terms">Terms of Service</Link>.
        </p>
      </Section>

      <Section n={8} title="Your legal rights">
        <p>
          This policy does not limit any rights you have under the consumer laws that apply where you live.
        </p>
      </Section>

      <Section n={9} title="Contact">
        <p>
          Questions about this policy: <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </Section>
    </LegalPage>
  );
}
