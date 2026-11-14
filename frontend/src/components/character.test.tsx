// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Character } from "./character";
import { FORMS } from "@/lib/gamify";

afterEach(cleanup);

describe("Character", () => {
  it("renders every one of the seven forms", () => {
    for (const f of FORMS) {
      const { unmount } = render(<Character tier={f.tier} />);
      expect(screen.getByRole("img").getAttribute("aria-label")).toContain(`form ${f.tier} of 7`);
      unmount();
    }
  });
  it("adds wings only at the final form and clamps out-of-range tiers", () => {
    const { container, rerender } = render(<Character tier={6} />);
    expect(container.querySelector(".pm-flap")).toBeNull();
    rerender(<Character tier={7} />);
    expect(container.querySelector(".pm-flap")).not.toBeNull();
    rerender(<Character tier={99} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("form 7 of 7");
  });
  it("shows a locked form as a silhouette", () => {
    render(<Character tier={5} silhouette />);
    expect(screen.getByRole("img").getAttribute("class")).toContain("brightness-0");
  });
});
