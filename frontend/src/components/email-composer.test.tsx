// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ api: vi.fn(), upload: vi.fn() }));
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  useApi: (path: string) => path.includes("audience")
    ? { data: { all: 3, paid: 1, free: 2, daily_limit: 80, mailing_address_set: true }, error: null, loading: false, reload: vi.fn() }
    : path.includes("resources")
    ? { data: { items: [
      { id: "img1", kind: "image", title: "Diagram", size: 1, in_email: true, created_at: "" },
      { id: "pdf1", kind: "pdf", title: "Guide", size: 1, in_email: false, created_at: "" }] }, error: null, loading: false, reload: vi.fn() }
    : { data: { items: [{ id: "e1", subject: "Old email", blocks: [{ type: "text", text: "Hi" }], attachment_id: null, send_on: "2026-12-01", send_hour: 7, status: "scheduled" }] }, error: null, loading: false, reload: vi.fn() },
  api: m.api,
  apiUpload: m.upload,
}));
import { EmailComposer } from "./email-composer";

beforeEach(() => m.api.mockResolvedValue({ id: "n1", status: "draft" }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("EmailComposer", () => {
  it("lists emails with status and hides Delete for a scheduled one", () => {
    render(<EmailComposer />);
    expect(screen.getAllByText("Old email").length).toBeGreaterThan(0);
    expect(screen.getAllByText("scheduled").length).toBeGreaterThan(0);
    expect(screen.queryByText("Delete")).toBeNull();
  });

  it("refuses to save without a subject", async () => {
    render(<EmailComposer />);
    fireEvent.click(screen.getByText("New email"));
    fireEvent.click(screen.getByText("Save draft"));
    expect(await screen.findByText(/subject of at least 3/)).toBeTruthy();
    expect(m.api).not.toHaveBeenCalled();
  });

  it("saves a draft with text, an image block between paragraphs, and the PDF", async () => {
    render(<EmailComposer />);
    fireEvent.click(screen.getByText("New email"));
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Weekly brief" } });
    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "First" } });
    fireEvent.click(screen.getByText("Add uploaded image"));
    fireEvent.change(screen.getByLabelText("Image"), { target: { value: "img1" } });
    fireEvent.click(screen.getByText("Add text"));
    fireEvent.change(screen.getAllByLabelText("Text")[1], { target: { value: "Second" } });
    fireEvent.change(screen.getByLabelText("PDF attachment"), { target: { value: "pdf1" } });
    fireEvent.click(screen.getByText("Save draft"));
    await waitFor(() => expect(m.api).toHaveBeenCalled());
    const [path, init] = m.api.mock.calls[0];
    expect(path).toBe("/api/v1/admin/emails");
    expect(init.body.blocks.map((b: { type: string }) => b.type)).toEqual(["text", "image", "text"]);
    expect(init.body.blocks[1].resource_id).toBe("img1");
    expect(init.body.attachment_id).toBe("pdf1");
    expect(init.body.send_on).toBeNull();
  });
  it("shows how many agreed members each send button reaches", () => {
    render(<EmailComposer />);
    expect(screen.getByText("Send to all users (3)")).toBeTruthy();
    expect(screen.getByText("Send to paid users (1)")).toBeTruthy();
    expect(screen.getByText("Send to free users (2)")).toBeTruthy();
  });

  it("asks first, then sends the chosen email to the chosen plan", async () => {
    m.api.mockResolvedValue({ sent: 2, failed: 0, remaining: 0, limit_reached: false });
    render(<EmailComposer />);
    fireEvent.click(screen.getByText("Send to free users (2)"));
    expect(m.api).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Yes, send"));
    await waitFor(() => expect(m.api).toHaveBeenCalledWith("/api/v1/admin/emails/e1/broadcast", { method: "POST", body: { audience: "free" } }));
    await waitFor(() => expect(screen.getByText("Sent to 2 free members.")).toBeTruthy());
  });
});
