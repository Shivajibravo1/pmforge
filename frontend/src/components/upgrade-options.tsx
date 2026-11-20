"use client";
import { track } from "@/lib/meta-pixel";
import { PLANS, formatAmount } from "@/lib/pricing";
import { usePublicConfig } from "@/lib/public-config";

/** Paid plan buttons. Payment happens on SuperProfile; access unlocks automatically when the buyer pays with
 *  the same email as their PMForge account (backend: /public/payments/superprofile via the n8n bridge). */
export function UpgradeOptions({ email, renew = false }: { email: string; renew?: boolean }) {
  const { monthlyUrl, yearlyUrl } = usePublicConfig();
  const links = [
    { id: "monthly" as const, url: monthlyUrl },
    { id: "yearly" as const, url: yearlyUrl },
  ].filter((l) => l.url);
  if (links.length === 0) {
    return <p className="text-sm text-muted">Paid plans open soon.</p>;
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {links.map(({ id, url }) => {
          const plan = PLANS.find((p) => p.id === id)!;
          const inr = plan.amounts.INR;
          return (
            <a key={id} href={url!} target="_blank" rel="noopener noreferrer"
              onClick={() => track("InitiateCheckout", { content_name: `pmforge_${id}`, currency: "INR", value: inr ?? 0 })}
              className={`inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold ${
                id === "yearly" ? "bg-lime text-black" : "border border-line"}`}>
              {renew ? "Renew" : "Get"} {plan.name}{inr !== null ? `, ${formatAmount(inr, "INR")}` : ""}
            </a>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted">
        Pay with <span className="font-semibold text-white">{email}</span>, the email you use here, and your access
        opens automatically within a few minutes. Each payment adds 30 days (Monthly) or 365 days (Yearly); nothing
        renews on its own. If access has not opened after 30 minutes, write to contact.pmforge@gmail.com.
      </p>
    </div>
  );
}
