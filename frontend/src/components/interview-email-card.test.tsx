// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ data: null as unknown, post: vi.fn() }));
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  useApi: () => ({ data: state.data, error: null, loading: false, reload: vi.fn() }),
  api: state.post,
}));
import { InterviewEmailCard } from "./interview-email-card";

afterEach(cleanup);
const base = { email: "a@b.co", consent_version: "v1", consent_text: "Send me one question a day." };

describe("InterviewEmailCard", () => {
  it("tells free members it is a paid bonus and offers no switch", () => {
    state.data = { ...base, eligible: false, subscribed: false };
    render(<InterviewEmailCard />);
    expect(screen.getByText(/bonus for full program members/)).toBeTruthy();
    expect(screen.queryByText("Turn on")).toBeNull();
  });

  it("needs the consent box ticked before Turn on works, and sends the consent version", async () => {
    state.data = { ...base, eligible: true, subscribed: false };
    state.post.mockResolvedValue({});
    render(<InterviewEmailCard />);
    const btn = screen.getByText("Turn on") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(btn);
    await waitFor(() => expect(state.post).toHaveBeenCalledWith("/api/v1/interview-email/subscribe", { method: "POST", body: { agree: true, consent_version: "v1" } }));
  });

  it("shows Turn off when subscribed", () => {
    state.data = { ...base, eligible: true, subscribed: true };
    render(<InterviewEmailCard />);
    expect(screen.getByText("Turn off")).toBeTruthy();
  });
});
