// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import curriculumMap from "@/lib/curriculum-map.json";
import { FREE_DAYS } from "@/lib/pricing";
import { DayMap } from "./day-map";
import { Evolution } from "./evolution";
import { LearningLoop } from "./loop";
import { CountUp } from "./motion";

beforeEach(() => {
  // jsdom has no matchMedia or IntersectionObserver. Behave like a person who asked for reduced motion.
  window.matchMedia = ((q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
});
afterEach(cleanup);

describe("curriculum-map.json", () => {
  it("matches the backend curriculum, so the landing map never drifts", () => {
    const backend = JSON.parse(readFileSync(join(process.cwd(), "..", "backend", "app", "content", "curriculum.json"), "utf8"));
    const expected = backend.levels.flatMap((l: { days: { day: number; type: string; title: string }[] }) => l.days.map((d) => [d.day, d.type, d.title]));
    expect(curriculumMap).toEqual(expected);
    expect(curriculumMap).toHaveLength(120);
  });
});

describe("DayMap", () => {
  it("renders all 120 days and shows the real title of a selected day", () => {
    render(<DayMap />);
    expect(screen.getAllByRole("button", { name: /^Day \d+,/ })).toHaveLength(120);
    fireEvent.click(screen.getByRole("button", { name: /^Day 80,/ }));
    expect(screen.getByRole("status").textContent).toContain("Critical CVE");
    expect(screen.getByRole("status").textContent).toContain("Level 3");
  });

  it("marks exactly the free days", () => {
    render(<DayMap />);
    expect(screen.getAllByRole("button", { name: /\(free\)$/ })).toHaveLength(FREE_DAYS);
  });

  it("lets a lesson type be highlighted and cleared", () => {
    render(<DayMap />);
    const build = screen.getByRole("button", { name: /^Build 18$/ });
    fireEvent.click(build);
    expect(build.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(build);
    expect(build.getAttribute("aria-pressed")).toBe("false");
  });
});

describe("LearningLoop", () => {
  it("shows an example for the chosen step", () => {
    render(<LearningLoop />);
    fireEvent.click(screen.getByRole("button", { name: /Decide/ }));
    expect(screen.getByRole("status").textContent).toContain("Day 80");
  });
});

describe("Evolution", () => {
  it("steps through the seven forms", () => {
    render(<Evolution />);
    expect(screen.getByText(/Form 1 of 7/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Legend, form 7" }));
    expect(screen.getByText(/Form 7 of 7/)).toBeTruthy();
  });
});

describe("CountUp", () => {
  it("shows the final number and an accessible label with reduced motion", () => {
    render(<CountUp to={120} suffix="" />);
    expect(screen.getByLabelText("120")).toBeTruthy();
  });
});
