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
    expect(screen.getAllByRole("checkbox").length).toBe(6);
    expect(screen.getByText("Quick check")).toBeTruthy();
  });
  it("checklist progress and quiz feedback respond to clicks", () => {
    render(<LessonBody body={day1} />);
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByText("1/6")).toBeTruthy();
    fireEvent.click(screen.getByText(/Is this a test copy or production/));
    expect(screen.getByText("Correct.")).toBeTruthy();
  });
});

describe("rich blocks", () => {
  it("highlights what goes wrong on a card", () => {
    render(<LessonBody body={"```cards\ncode | App | text here | Scope keeps growing\n```"} />);
    expect(screen.getByText("What goes wrong")).toBeTruthy();
    expect(screen.getByText("Scope keeps growing")).toBeTruthy();
  });
  it("renders flow steps without browser list numbers", () => {
    render(<LessonBody body={"```flow\nA | one\nB | two\n```"} />);
    const ol = screen.getByLabelText("Process") as HTMLElement;
    expect(ol.style.listStyleType === "none" || ol.style.listStyle === "none").toBe(true);
  });
  it("renders an architecture diagram with a cross-cutting band", () => {
    render(<LessonBody body={"```arch\n# Portal\nExperience | Web app, Mobile app\n~Security | SSO\n```"} />);
    expect(screen.getByLabelText("Portal")).toBeTruthy();
    expect(screen.getByText("Web app")).toBeTruthy();
    expect(screen.getByText("SSO")).toBeTruthy();
  });
  it("renders story blocks: chat, timeline, RAG and an interactive decision", () => {
    const { container } = render(<LessonBody body={day1} />);
    expect(screen.getByLabelText("Team chat, Tuesday, 9:47 AM")).toBeTruthy();
    expect(screen.getByLabelText("Timeline")).toBeTruthy();
    expect(screen.getByLabelText("Project health").children.length).toBe(4);
    fireEvent.click(screen.getByText(/Triage: ask Priya/));
    expect(screen.getByText("Good call")).toBeTruthy();
    expect(container.textContent).toContain("Senior PMs triage before they act");
  });
  it("renders a reference card with framework, location and use", () => {
    render(<LessonBody body={"```ref\nNIST | CSF 2.0, Govern function | Use it to frame accountability.\n```"} />);
    expect(screen.getByLabelText("Reference and interview prep")).toBeTruthy();
    expect(screen.getByText("NIST")).toBeTruthy();
    expect(screen.getByText(/Use it to frame accountability/)).toBeTruthy();
  });
  it("renders mind map, incident and interview answer blocks", () => {
    const body = [
      "```mindmap\n# Agentic AI\nRoles | FDE, Harness engineer\n```",
      "```incident\n# Agent deleted data (illustrative)\nWhat happened | It ran a delete\nResolution | Restore from backup\n```",
      "```answer\n? How do you govern an agent?\n- I trust it | no controls\n+ Least privilege and human approval.\n= Mention the customer site for FDE roles.\n```",
    ].join("\n\n");
    render(<LessonBody body={body} />);
    expect(screen.getByLabelText("Mind map")).toBeTruthy();
    expect(screen.getByText("Harness engineer")).toBeTruthy();
    expect(screen.getByText(/Agent deleted data/)).toBeTruthy();
    expect(screen.getByText("Resolution")).toBeTruthy();
    expect(screen.getByText(/Least privilege and human approval/)).toBeTruthy();
    expect(screen.getByText(/Mention the customer site/)).toBeTruthy();
  });
  it("flashcards flip, repeat missed cards and finish", () => {
    render(<LessonBody body={"```flashcards\nFront A | Back A\nFront B | Back B\n```"} />);
    expect(screen.getByText("Front A")).toBeTruthy();
    fireEvent.click(screen.getByText("Front A"));
    expect(screen.getByText("Back A")).toBeTruthy();
    fireEvent.click(screen.getByText("Review again"));
    expect(screen.getByText("Front B")).toBeTruthy();
    fireEvent.click(screen.getByText("Front B"));
    fireEvent.click(screen.getByText("Got it"));
    expect(screen.getByText("Front A")).toBeTruthy();
    fireEvent.click(screen.getByText("Front A"));
    fireEvent.click(screen.getByText("Got it"));
    expect(screen.getByRole("status").textContent).toContain("Deck complete");
  });
});
