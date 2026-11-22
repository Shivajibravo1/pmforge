// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ data: null as unknown, post: vi.fn() }));
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  useApi: () => ({ data: state.data, error: null, loading: false, reload: vi.fn() }),
  api: state.post,
}));
import { MarketingEmailCard } from "./marketing-email-card";

afterEach(cleanup);
const base = { email: "a@b.co", consent_version: "v1", consent_text: "Send me tips and offers." };

describe("MarketingEmailCard", () => {
  it("needs the consent box ticked before Turn on works, and sends the consent version", async () => {
    state.data = { ...base, subscribed: false };
    state.post.mockResolvedValue({});
    render(<MarketingEmailCard />);
    const btn = screen.getByText("Turn on") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(btn);
    await waitFor(() => expect(state.post).toHaveBeenCalledWith("/api/v1/marketing-email/subscribe", { method: "POST", body: { agree: true, consent_version: "v1" } }));
  });

  it("shows Turn off when subscribed", () => {
    state.data = { ...base, subscribed: true };
    render(<MarketingEmailCard />);
    expect(screen.getByText("Turn off")).toBeTruthy();
  });
});
