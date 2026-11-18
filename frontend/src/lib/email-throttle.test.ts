import { describe, expect, it } from "vitest";
import { bucketFor, EmailThrottle } from "./email-throttle";

const HOUR = 60 * 60 * 1000;

describe("EmailThrottle", () => {
  it("blocks after the limit and is case and whitespace insensitive", () => {
    const th = new EmailThrottle({ send: { max: 2, windowMs: HOUR } });
    expect(th.allow("send", "A@x.com")).toBe(true);
    expect(th.allow("send", " a@X.com ")).toBe(true);
    expect(th.allow("send", "a@x.com")).toBe(false);
  });

  it("limits per email, not globally", () => {
    const th = new EmailThrottle({ send: { max: 1, windowMs: HOUR } });
    expect(th.allow("send", "a@x.com")).toBe(true);
    expect(th.allow("send", "b@x.com")).toBe(true);
    expect(th.allow("send", "a@x.com")).toBe(false);
  });

  it("keeps send and verify buckets separate", () => {
    const th = new EmailThrottle({ send: { max: 1, windowMs: HOUR }, verify: { max: 1, windowMs: HOUR } });
    expect(th.allow("send", "a@x.com")).toBe(true);
    expect(th.allow("verify", "a@x.com")).toBe(true);
  });

  it("allows again once the window has passed", () => {
    let t = 0;
    const th = new EmailThrottle({ send: { max: 1, windowMs: HOUR } }, 100, () => t);
    expect(th.allow("send", "a@x.com")).toBe(true);
    expect(th.allow("send", "a@x.com")).toBe(false);
    t = HOUR + 1;
    expect(th.allow("send", "a@x.com")).toBe(true);
  });

  it("stays bounded under a flood of distinct emails", () => {
    const th = new EmailThrottle({ send: { max: 5, windowMs: HOUR } }, 50);
    for (let i = 0; i < 500; i++) th.allow("send", `u${i}@x.com`);
    expect(th.size).toBeLessThanOrEqual(50);
  });

  it("maps auth paths to buckets", () => {
    expect(bucketFor("/email-otp/send-verification-otp")).toBe("send");
    expect(bucketFor("/sign-in/email-otp")).toBe("verify");
    expect(bucketFor("/get-session")).toBeNull();
  });
});
