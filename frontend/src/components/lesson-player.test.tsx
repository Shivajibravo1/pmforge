// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LessonPlayer } from "./lesson-player";

const day1 = readFileSync(resolve(process.cwd(), "../backend/app/content/lessons/day-001.md"), "utf-8");
afterEach(cleanup);

describe("LessonPlayer", () => {
  it("shows one screen at a time with progress and no Listen button", () => {
    render(<LessonPlayer day={1} body={day1} finale={<p>finale</p>} />);
    expect(screen.getByText("Tuesday, 9:47 AM")).toBeTruthy();
    expect(screen.queryByText("Listen")).toBeNull();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("1");
    expect(screen.queryByText("The one sentence that defines your job")).toBeNull();
  });
  it("advances with Continue, goes back, and reaches the journal and finale", () => {
    render(<LessonPlayer day={1} body={day1} finale={<p>finale</p>} />);
    fireEvent.click(screen.getByText("Continue"));
    expect(screen.getByText("The one sentence that defines your job")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Previous screen"));
    expect(screen.getByText("Tuesday, 9:47 AM")).toBeTruthy();
    const total = Number(screen.getByRole("progressbar").getAttribute("aria-valuemax"));
    for (let k = 1; k < total; k++) {
      const next = screen.queryByText("Continue") ?? screen.queryByText("Skip feedback and continue");
      if (next) fireEvent.click(next);
    }
    expect(screen.getByText("finale")).toBeTruthy();
  });
});

describe("LessonPlayer navigation across days", () => {
  it("offers a link back to the previous day from the first screen", () => {
    render(<LessonPlayer day={2} body={"## One\nHello\n\n## Two\nWorld"} finale={<p>f</p>} />);
    const link = screen.getByLabelText("Previous day, Day 1") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/app/lesson/1");
  });
  it("moves within the lesson after the first screen", () => {
    render(<LessonPlayer day={2} body={"## One\nHello\n\n## Two\nWorld"} finale={<p>f</p>} />);
    fireEvent.click(screen.getByText("Continue"));
    expect(screen.getByLabelText("Previous screen")).toBeTruthy();
  });
});
