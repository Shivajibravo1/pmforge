import { describe, expect, it } from "vitest";
import { REFUND_COMPLETION_PERCENT, REFUND_LESSON_THRESHOLD, REFUND_WINDOW_DAYS } from "./legal";
import { TOTAL_DAYS } from "./pricing";

describe("refund policy constants", () => {
  it("uses a 7 day window and a 30% completion limit", () => {
    expect(REFUND_WINDOW_DAYS).toBe(7);
    expect(REFUND_COMPLETION_PERCENT).toBe(30);
  });
  it("derives the lesson threshold from the program length", () => {
    expect(TOTAL_DAYS).toBe(120);
    expect(REFUND_LESSON_THRESHOLD).toBe(36);
  });
});
