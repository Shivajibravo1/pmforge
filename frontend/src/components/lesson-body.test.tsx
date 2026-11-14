// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LessonBody } from "./lesson-body";

const day1 = readFileSync(new URL("../../../backend/app/content/lessons/day-001.md", import.meta.url), "utf-8");

describe("LessonBody", () => {
  it("renders tables, flow, cards, checklist and quiz for Day 1", () => {
    const { container } = render(<LessonBody body={day1} />);
    expect(container.querySelectorAll("table").length).toBe(1);
    expect(container.textContent).not.toContain("| --- |");
    expect(screen.getByLabelText("Process").querySelectorAll("li").length).toBe(5);
    expect(screen.getAllByRole("checkbox").length).toBe(5);
    expect(screen.getByText("Quick check")).toBeTruthy();
  });
  it("checklist progress and quiz feedback respond to clicks", () => {
    render(<LessonBody body={day1} />);
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByText("1/5")).toBeTruthy();
    fireEvent.click(screen.getByText(/Is this running in a test copy/));
    expect(screen.getByText("Correct.")).toBeTruthy();
  });
});
