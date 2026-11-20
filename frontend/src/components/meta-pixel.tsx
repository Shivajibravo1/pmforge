"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { loadPixel, onConsentChange, readConsent, saveConsent, track } from "@/lib/meta-pixel";
import { usePublicConfig } from "@/lib/public-config";

const serverConsent = () => "pending" as const;

function useConsent() {
  return useSyncExternalStore(onConsentChange, () => readConsent() ?? "unset", serverConsent);
}

/** Loads the pixel after consent and records one PageView per screen. Renders the consent banner until the
 *  visitor chooses. Shows nothing at all when no pixel is configured. */
export function MetaPixel() {
  const { metaPixelId } = usePublicConfig();
  const consent = useConsent();
  const path = usePathname();

  useEffect(() => {
    if (metaPixelId && consent === "granted") loadPixel(metaPixelId);
  }, [metaPixelId, consent]);

  useEffect(() => {
    if (metaPixelId && consent === "granted") track("PageView");
  }, [metaPixelId, consent, path]);

  if (!metaPixelId || consent !== "unset") return null;
  return (
    <div role="dialog" aria-live="polite" aria-label="Advertising measurement choice"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-line bg-surface p-4 text-sm shadow-lg">
      <p>
        We use the Meta Pixel to measure our Facebook and Instagram ads. It sets advertising cookies only if you allow
        it. See our <Link href="/privacy" className="underline">Privacy Policy</Link>.
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => saveConsent("granted")}
          className="min-h-11 rounded-xl bg-lime px-4 font-semibold text-black">Allow</button>
        <button type="button" onClick={() => saveConsent("denied")}
          className="min-h-11 rounded-xl border border-line px-4 font-semibold">Decline</button>
      </div>
    </div>
  );
}
