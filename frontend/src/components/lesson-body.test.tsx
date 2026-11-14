// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LessonBody } from "./lesson-body";

const day1 = readFileSync(resolve(process.cwd(), "../backend/app/content/lessons/day-001.md"), "utf-8");

afterEach(cleanup);

describe("LessonBody", () => {
  it("renders tables, flow, cards, checklist and quiz for Day 1", () => {
    const { container } = render(<LessonBody body={day1} />);
    expect(container.querySelectorAll("table").length).toBe(1);
    expect(container.textContent).not.toContain("| --- |");
    expect(screen.getAllByLabelText("Process").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("checkbox").length).toBe(5);
    expect(screen.getByText("Quick check")).toBeTruthy();
  });
  it("checklist progress and quiz feedback respond to clicks", () => {
    render(<LessonBody body={day1} />);
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByText("1/5")).toBeTruthy();
    fireEvent.click(screen.getByText(/Is this a test copy or production/));
    expect(screen.getByText("Correct.")).toBeTruthy();
  });
});
