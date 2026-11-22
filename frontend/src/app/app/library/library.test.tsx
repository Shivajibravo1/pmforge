// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  useApi: () => ({
    data: { items: [
      { id: "api-gateway", title: "API gateway", tagline: "One controlled front door.", category: "Integration", free: true, locked: false },
      { id: "zero-trust", title: "Zero trust", tagline: "Never assume safe.", category: "Security", free: false, locked: true },
    ] }, error: null, loading: false, reload: vi.fn(),
  }),
}));
import Library from "./page";

afterEach(cleanup);

describe("Library", () => {
  it("lists every explainer and marks the locked one", () => {
    render(<Library />);
    expect(screen.getByText("API gateway")).toBeTruthy();
    expect(screen.getByText("Zero trust")).toBeTruthy();
    expect(screen.getAllByLabelText("Full program").length).toBe(1);
  });

  it("filters by search and by category", () => {
    render(<Library />);
    fireEvent.change(screen.getByLabelText("Search the library"), { target: { value: "gateway" } });
    expect(screen.queryByText("Zero trust")).toBeNull();
    fireEvent.change(screen.getByLabelText("Search the library"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Security" }));
    expect(screen.queryByText("API gateway")).toBeNull();
    expect(screen.getByText("Zero trust")).toBeTruthy();
  });

  it("says so when nothing matches", () => {
    render(<Library />);
    fireEvent.change(screen.getByLabelText("Search the library"), { target: { value: "zzzz" } });
    expect(screen.getByText(/Nothing matches/)).toBeTruthy();
  });
});
