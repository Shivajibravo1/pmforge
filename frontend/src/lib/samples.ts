/**
 * Admin-only preview content. These samples show admins how the You page certificate and the
 * Portfolio page look once a learner has finished work. They are illustrative composites:
 * no real organisation, person or measured result. They are never stored and never appear on a
 * public portfolio.
 */
export type SampleSection = { heading: string; body: string };
export type SampleArtifact = {
  day: number;
  title: string;
  score: number;
  context: string;
  sections: SampleSection[];
  strengths: string[];
  nextStep: string;
};

export const SAMPLE_ARTIFACTS: SampleArtifact[] = [
  {
    day: 5,
    title: "Project charter: website migration",
    score: 88,
    context: "Regional retailer moving its customer website from an ageing on-premises platform to a managed cloud platform.",
    sections: [
      { heading: "Purpose", body: "Move the customer website to a managed cloud platform so the team can release weekly and recover from failure without manual rebuilds." },
      { heading: "Scope", body: "In: product catalogue, checkout, customer accounts, content pages, redirects. Out: the warehouse system, the loyalty app, any redesign of the storefront." },
      { heading: "Success criteria", body: "1. Cutover completes inside the agreed weekend window with a tested rollback.\n2. Checkout and sign-in pass the agreed acceptance tests before go-live.\n3. Search traffic is protected by a verified redirect map." },
      { heading: "Key risks", body: "Checkout integration with the payment provider is unproven on the new platform. Mitigation: a proof of concept in week 2 with the provider's test environment." },
      { heading: "Governance", body: "Sponsor: Head of Digital. Project manager owns the plan and the RAID log. Fortnightly steering review. Any change to scope or date goes through the sponsor." },
    ],
    strengths: ["Scope states what is out, not only what is in.", "Success criteria are testable.", "Each risk has an owner and a first action."],
    nextStep: "Add a named approver for the budget and the date to the governance section.",
  },
  {
    day: 25,
    title: "RAID log: capstone migration programme",
    score: 91,
    context: "Same migration programme, week 6 of 12, prepared for the steering review.",
    sections: [
      { heading: "Risk R3 (high)", body: "Payment provider certification may not finish before the cutover window.\nOwner: Delivery lead. Action: confirm the certification date in writing this week. Trigger: no confirmed date by the end of week 8. Fallback: keep checkout on the existing provider for the first release." },
      { heading: "Assumption A2", body: "The business can freeze content changes for the two days around cutover.\nOwner: Head of Digital. Validate by the end of week 4." },
      { heading: "Issue I1 (open)", body: "Test environment is shared with another team and is unavailable on release days.\nOwner: Platform lead. Action: reserve a dedicated slot or a second environment. Escalated to the sponsor." },
      { heading: "Dependency D4", body: "Network team must open the firewall rules for the new platform before performance testing starts.\nNeeded by: start of week 9." },
    ],
    strengths: ["Every item has an owner, a trigger or a date.", "Issues are separated from risks.", "Escalation path is explicit."],
    nextStep: "Add a probability and impact rating to each risk so the steering group can rank them at a glance.",
  },
  {
    day: 109,
    title: "AI risk register and model card: support assistant",
    score: 84,
    context: "A customer-support assistant that drafts replies for agents. An agent reviews every reply before it is sent.",
    sections: [
      { heading: "Intended use", body: "Draft replies to order and delivery questions from the knowledge base. Not for refunds, legal questions or complaints about staff." },
      { heading: "Data", body: "Knowledge base articles and anonymised past replies. No customer names, emails or payment details are sent to the model." },
      { heading: "Top risks", body: "1. Wrong or invented policy answer. Control: answers must cite a knowledge base article; an agent approves every reply.\n2. Customer data in a prompt. Control: redaction before the call and a logging check.\n3. Prompt injection through pasted customer text. Control: customer text is treated as data, output is checked, the assistant has no tools that change records." },
      { heading: "Evaluation", body: "A fixed question set covering normal, edge and adversarial cases is re-run before each release. A release is blocked if the pass rate falls below the agreed threshold." },
      { heading: "Limits and owner", body: "English only. Known to struggle with multi-order questions. Product owner accountable; security reviews the controls each quarter." },
    ],
    strengths: ["Controls are mapped to named risks.", "Human review is part of the design, not an afterthought.", "Limits are stated plainly."],
    nextStep: "Define what happens when the evaluation fails after release: who can switch the assistant off, and how fast.",
  },
];
