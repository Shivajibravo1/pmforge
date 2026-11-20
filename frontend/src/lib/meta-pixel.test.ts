// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSENT_KEY, readConsent, saveConsent, track } from "./meta-pixel";

afterEach(() => {
  window.localStorage.clear();
  delete window.fbq;
});

describe("Meta Pixel consent", () => {
  it("starts with no choice and remembers the visitor's answer", () => {
    expect(readConsent()).toBeNull();
    saveConsent("denied");
    expect(readConsent()).toBe("denied");
    expect(window.localStorage.getItem(CONSENT_KEY)).toBe("denied");
  });

  it("never sends an event without consent", () => {
    const fbq = vi.fn() as unknown as NonNullable<typeof window.fbq>;
    window.fbq = fbq;
    track("PageView");
    saveConsent("denied");
    track("PageView");
    expect(fbq).not.toHaveBeenCalled();
    saveConsent("granted");
    track("CompleteRegistration", { content_name: "free_signup" });
    expect(fbq).toHaveBeenCalledWith("track", "CompleteRegistration", { content_name: "free_signup" });
  });
});
