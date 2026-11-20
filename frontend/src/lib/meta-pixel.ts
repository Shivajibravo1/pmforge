/**
 * Meta Pixel, loaded only after the visitor allows it. Every function is safe to call when the pixel is off:
 * it then does nothing. No personal data is ever passed in event parameters.
 */
export type Consent = "granted" | "denied" | null;
export const CONSENT_KEY = "pmforge_ads_consent";
const CHANGE = "pmforge-consent-change";

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue: unknown[][];
  push: unknown; loaded: boolean; version: string };
declare global {
  interface Window { fbq?: Fbq; _fbq?: Fbq }
}

export function readConsent(): Consent {
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function saveConsent(v: "granted" | "denied") {
  try {
    window.localStorage.setItem(CONSENT_KEY, v);
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
  window.dispatchEvent(new Event(CHANGE));
}

export function onConsentChange(cb: () => void) {
  window.addEventListener(CHANGE, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CHANGE, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Meta's standard loader, written out so it runs from our own (nonce-trusted) bundle under the CSP. */
export function loadPixel(id: string) {
  if (window.fbq) return;
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  fbq("init", id);
}

export type PixelEvent = "PageView" | "CompleteRegistration" | "InitiateCheckout" | "ViewContent";

export function track(event: PixelEvent, params?: Record<string, string | number>) {
  if (typeof window === "undefined" || !window.fbq || readConsent() !== "granted") return;
  if (params) window.fbq("track", event, params);
  else window.fbq("track", event);
}
