// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "risk-register" }) }));
const detail = {
  id: "risk-register", title: "Risk register", tagline: "t", layout: "table", purpose: "p", when: "w", check: null,
  columns: [
    { key: "risk", label: "Risk", hint: "", kind: "text" }, { key: "l", label: "Likelihood", hint: "", kind: "number" },
    { key: "i", label: "Impact", hint: "", kind: "number" }, { key: "s", label: "Score", hint: "", kind: "product:l,i" },
  ],
  example: [{ risk: "Vendor slips", l: "3", i: "4" }], tips: ["Tip one"], mistakes: ["Mistake one"],
};
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  useApi: (path: string) => ({ data: path.includes("templates/") ? detail : { email: "a@b.c" }, error: null, loading: false, reload: vi.fn() }),
}));
import TemplatePage from "./[id]/page";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("Template page", () => {
  it("calculates the score and keeps a draft", () => {
    render(<TemplatePage />);
    fireEvent.change(screen.getByLabelText("Likelihood row 1"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Impact row 1"), { target: { value: "4" } });
    expect(screen.getByLabelText("Score row 1").textContent).toBe("12");
    expect(localStorage.getItem("pmforge.template.risk-register")).toContain('"l":"3"');
  });
  it("adds and removes rows", () => {
    render(<TemplatePage />);
    fireEvent.click(screen.getByRole("button", { name: /Add row/ }));
    expect(screen.getByLabelText("Risk row 4")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove row 4" }));
    expect(screen.queryByLabelText("Risk row 4")).toBeNull();
  });
  it("shows the worked example on request", () => {
    render(<TemplatePage />);
    expect(screen.queryByText("Vendor slips")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /worked example/ }));
    expect(screen.getByText("Vendor slips")).toBeTruthy();
  });
});
