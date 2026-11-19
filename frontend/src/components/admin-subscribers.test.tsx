// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ api: vi.fn() }));
const items = [
  { id: "a", email: "a@x.com", opted_in: true, paused: false, last_sent_on: null },
  { id: "b", email: "b@x.com", opted_in: false, paused: false, last_sent_on: null },
  { id: "c", email: "c@x.com", opted_in: true, paused: false, last_sent_on: "2026-11-19" },
  { id: "d", email: "d@x.com", opted_in: true, paused: true, last_sent_on: null },
];
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  useApi: () => ({ data: { total: 4, shown: 4, counts: { paid: 4, free: 2 }, items }, error: null, loading: false, reload: vi.fn() }),
  api: m.api,
}));
import { AdminSubscribers } from "./admin-subscribers";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("AdminSubscribers", () => {
  it("shows plan tabs with counts", () => {
    render(<AdminSubscribers />);
    expect(screen.getByRole("tab", { name: "Paid (4)" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Free (2)" })).toBeTruthy();
  });

  it("only lets people who opted in (and are not paused) be chosen", () => {
    render(<AdminSubscribers />);
    expect((screen.getByLabelText("Select b@x.com") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("Select d@x.com") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("Select a@x.com") as HTMLInputElement).disabled).toBe(false);
  });

  it("select all picks every eligible member and sends them", async () => {
    m.api.mockResolvedValue({ requested: 2, sent: 1, failed: 0, skipped: 1 });
    render(<AdminSubscribers />);
    fireEvent.click(screen.getByLabelText(/Select all who opted in \(2\)/));
    fireEvent.click(screen.getByRole("button", { name: "Send to 2 selected" }));
    await waitFor(() => expect(m.api).toHaveBeenCalledTimes(1));
    expect(m.api.mock.calls[0][1].body.user_ids.sort()).toEqual(["a", "c"]);
    expect(await screen.findByText(/Sent to 1 of 2/)).toBeTruthy();
  });

  it("can send to one person only", async () => {
    m.api.mockResolvedValue({ requested: 1, sent: 1, failed: 0, skipped: 0 });
    render(<AdminSubscribers />);
    fireEvent.click(screen.getByLabelText("Select a@x.com"));
    fireEvent.click(screen.getByRole("button", { name: "Send to 1 selected" }));
    await waitFor(() => expect(m.api.mock.calls[0][1].body.user_ids).toEqual(["a"]));
  });
});
