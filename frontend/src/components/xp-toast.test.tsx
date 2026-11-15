// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EarlierNotes } from "./earlier-notes";
import { XpToast } from "./xp-toast";

afterEach(cleanup);

describe("XpToast", () => {
  it("shows the XP, total and streak, and can be closed", () => {
    const onClose = vi.fn();
    render(<XpToast gain={{ xp: 30, total: 120, streak: 3 }} onClose={onClose} />);
    expect(screen.getByRole("status").textContent).toContain("+30 XP");
    expect(screen.getByRole("status").textContent).toContain("3 day streak");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("EarlierNotes", () => {
  it("shows a chip only when earlier notes exist, and expands them", () => {
    localStorage.clear();
    const { container, rerender } = render(<EarlierNotes day={5} />);
    expect(container.textContent).toBe("");
    localStorage.setItem("pmforge:journal:2:1", "my day two note");
    rerender(<EarlierNotes day={6} />);
    fireEvent.click(screen.getByRole("button", { name: /Notes from earlier lessons \(1\)/ }));
    expect(screen.getByText("my day two note")).toBeTruthy();
    localStorage.clear();
  });
});
