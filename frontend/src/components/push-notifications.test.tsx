// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ data: null as unknown }));
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  useApi: () => ({ data: state.data, error: null, loading: false, reload: vi.fn() }),
  api: vi.fn(),
}));
import { PushNotifications } from "./push-notifications";

afterEach(cleanup);

describe("PushNotifications", () => {
  it("shows nothing when the server has no push keys", () => {
    state.data = { available: false, public_key: "", needs_consent: false, endpoints: [] };
    const { container } = render(<PushNotifications />);
    expect(container.textContent).toBe("");
  });

  it("shows nothing before the member agreed to tips and offers", () => {
    state.data = { available: true, public_key: "k", needs_consent: true, endpoints: [] };
    const { container } = render(<PushNotifications />);
    expect(container.textContent).toBe("");
  });

  it("explains when the browser cannot show notifications", () => {
    state.data = { available: true, public_key: "k", needs_consent: false, endpoints: [] };
    render(<PushNotifications />);
    expect(screen.getByText(/cannot show notifications/)).toBeTruthy();
    expect(screen.queryByText("Allow notifications")).toBeNull();
  });

  it("offers Allow notifications when the browser supports it", () => {
    Object.defineProperty(navigator, "serviceWorker", { value: { getRegistration: () => Promise.resolve(undefined) }, configurable: true });
    Object.defineProperty(window, "PushManager", { value: class {}, configurable: true });
    Object.defineProperty(window, "Notification", { value: class {}, configurable: true });
    state.data = { available: true, public_key: "k", needs_consent: false, endpoints: [] };
    render(<PushNotifications />);
    expect(screen.getByText("Allow notifications")).toBeTruthy();
  });
});
