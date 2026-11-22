// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/app/course", useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/lib/auth-client", () => ({ authClient: { useSession: () => ({ data: { user: { id: "u1", name: "Asha Rao", phone: "+919876543210" } }, isPending: false }) } }));
vi.mock("@/lib/api", () => ({ useApi: () => ({ data: { total_xp: 1250, streak: 4, completed: [] }, error: null, loading: false, reload: vi.fn() }) }));

import AppLayout from "./layout";

afterEach(cleanup);

describe("top navigation bar", () => {
  it("shows the logo, the five menu items and streak and XP", () => {
    render(<AppLayout><p>page</p></AppLayout>);
    expect(screen.getByLabelText("PMForge, go to Today").getAttribute("href")).toBe("/app");
    const nav = within(screen.getByRole("navigation", { name: "Primary" }));
    for (const label of ["Today", "Course", "Library", "Portfolio", "Mentor", "You"]) expect(nav.getByText(label)).toBeTruthy();
    const progress = within(screen.getByLabelText("Your progress"));
    expect(progress.getByText("4")).toBeTruthy();
    expect(progress.getByText("1,250")).toBeTruthy();
    expect(screen.getByText("page")).toBeTruthy();
  });
  it("marks the current section", () => {
    render(<AppLayout><p>page</p></AppLayout>);
    expect(screen.getByText("Course").closest("a")?.getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("Today").closest("a")?.getAttribute("aria-current")).toBeNull();
  });
});
