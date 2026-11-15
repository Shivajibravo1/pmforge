// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ReviewPanel } from "./review-panel";

afterEach(cleanup);
const base = { review_id: "r", score: 45, strengths: ["clear problem"], gaps: ["no metrics"], next_steps: ["add KPIs"] };

describe("ReviewPanel", () => {
  it("shows score, lists and the professional version", () => {
    render(<ReviewPanel review={{ ...base, model_answer: "Problem: slow reporting.\nAssumption (confirm): 20% faster." }} />);
    expect(screen.getByText(/45\/100/)).toBeTruthy();
    expect(screen.getByText("clear problem")).toBeTruthy();
    expect(screen.getByText("How a professional version looks")).toBeTruthy();
    expect(screen.getByText(/Assumption \(confirm\)/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /copy/i })).toBeTruthy();
  });
  it("hides the professional section for older reviews without one", () => {
    render(<ReviewPanel review={base} />);
    expect(screen.queryByText("How a professional version looks")).toBeNull();
  });
});
