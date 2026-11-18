// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ api: vi.fn(), reload: vi.fn(), detail: { current: {} as Record<string, unknown> } }));

const users = [
  { id: "a1", email: "aishivajibravo@gmail.com", role: "admin", tier: "free", plan: "admin", created_at: "2026-11-15T00:00:00Z", lessons_done: 4, total_xp: 40, last_active: "2026-11-18" },
  { id: "u1", email: "free.user@example.com", role: "learner", tier: "free", plan: "free", created_at: "2026-11-16T00:00:00Z", lessons_done: 0, total_xp: 0, last_active: null },
  { id: "u2", email: "paid.user@example.com", role: "learner", tier: "paid", plan: "paid", created_at: "2026-11-17T00:00:00Z", lessons_done: 12, total_xp: 120, last_active: "2026-11-17" },
];

vi.mock("@/lib/api", () => ({
  ApiError: class extends Error { constructor(public status: number, public code: string) { super(code); } },
  api: h.api,
  friendly: () => "Something went wrong. Please try again.",
  useApi: (path: string | null) => {
    if (path?.startsWith("/api/v1/admin/users?")) return { data: { total: 3, items: users }, error: null, loading: false, reload: h.reload };
    return { data: h.detail.current, error: null, loading: false, reload: h.reload };
  },
}));

import { AdminUsers, PlanBadge, UsersList } from "./admin-users";

const detail = (plan: string) => ({
  id: "x", email: "x@example.com", plan, created_at: "2026-11-16T00:00:00Z",
  progress: [{ day: 1, xp: 10, completed_on: "2026-11-17" }], reviews: [{ day: 5, score: 88, created_at: "2026-11-17T00:00:00Z" }],
  certificates: [], ai_usage_month: [{ kind: "review", calls: 1, cost_usd: 0.0123 }], audit: [],
});

beforeEach(() => { h.api.mockReset(); h.reload.mockReset(); h.api.mockResolvedValue({}); });
afterEach(cleanup);

describe("plan labels", () => {
  it("shows Free, Paid and Admin", () => {
    render(<><PlanBadge plan="free" /><PlanBadge plan="paid" /><PlanBadge plan="admin" /></>);
    for (const t of ["Free", "Paid", "Admin"]) expect(screen.getByText(t)).toBeTruthy();
  });
  it("labels each row by plan, with the admin account shown as Admin", () => {
    render(<UsersList items={users as never} selected={null} onSelect={vi.fn()} />);
    const row = (email: string) => screen.getByText(email).closest("button") as HTMLElement;
    expect(row("aishivajibravo@gmail.com").textContent).toContain("Admin");
    expect(row("free.user@example.com").textContent).toContain("Free");
    expect(row("paid.user@example.com").textContent).toContain("Paid");
    expect(row("free.user@example.com").textContent).toContain("last active None yet");
  });
  it("tells the admin when nothing matches", () => {
    render(<UsersList items={[]} selected={null} onSelect={vi.fn()} />);
    expect(screen.getByText("No users match.")).toBeTruthy();
  });
});

describe("admin console", () => {
  it("lists users and opens a free user with a Change to Paid action", async () => {
    h.detail.current = detail("free");
    render(<AdminUsers />);
    expect(screen.getByText("3 users")).toBeTruthy();
    fireEvent.click(screen.getByText("free.user@example.com"));
    fireEvent.click(screen.getByRole("button", { name: "Change to Paid" }));
    await waitFor(() => expect(h.api).toHaveBeenCalledWith("/api/v1/admin/users/u1/tier", { method: "PUT", body: { tier: "paid" } }));
    await waitFor(() => expect(h.reload).toHaveBeenCalled());
  });
  it("offers Change to Free for a paid user", () => {
    h.detail.current = detail("paid");
    render(<AdminUsers />);
    fireEvent.click(screen.getByText("paid.user@example.com"));
    expect(screen.getByRole("button", { name: "Change to Free" })).toBeTruthy();
  });
  it("gives the admin account no plan control", () => {
    h.detail.current = detail("admin");
    render(<AdminUsers />);
    fireEvent.click(screen.getByText("aishivajibravo@gmail.com"));
    expect(screen.queryByRole("button", { name: /Change to/ })).toBeNull();
    expect(screen.getByText(/Admin account\. Full access/)).toBeTruthy();
  });
  it("shows the learning record without artifact text", () => {
    h.detail.current = detail("free");
    render(<AdminUsers />);
    fireEvent.click(screen.getByText("free.user@example.com"));
    expect(screen.getByText("Day 5: 88/100 on 2026-11-17")).toBeTruthy();
    expect(screen.getByText("review: 1 calls, $0.0123")).toBeTruthy();
  });
});
