import type { PublicConfig } from "@/lib/public-config";

const CHECKOUT_HOSTS = new Set(["superprofile.bio", "www.superprofile.bio"]);

/** Accepts only HTTPS SuperProfile links, so a mistyped setting can never send buyers to another site. */
export function checkoutUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && CHECKOUT_HOSTS.has(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
}

export function pixelId(value: string | undefined): string | null {
  return value && /^\d{10,20}$/.test(value) ? value : null;
}

export function readPublicConfig(env: Record<string, string | undefined> = process.env): PublicConfig {
  return {
    metaPixelId: pixelId(env.META_PIXEL_ID),
    monthlyUrl: checkoutUrl(env.SUPERPROFILE_MONTHLY_URL),
    yearlyUrl: checkoutUrl(env.SUPERPROFILE_YEARLY_URL),
  };
}
