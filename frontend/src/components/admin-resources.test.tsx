// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ upload: vi.fn(), api: vi.fn() }));
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  useApi: () => ({ data: { items: [{ id: "r1", kind: "pdf", title: "Guide", size: 2048, in_email: false, created_at: "" }] }, error: null, loading: false, reload: vi.fn() }),
  apiUpload: m.upload,
  api: m.api,
}));
import { AdminResources } from "./admin-resources";

afterEach(cleanup);

function pick(name: string, size = 100) {
  const f = new File([new Uint8Array(size)], name, { type: "application/pdf" });
  fireEvent.change(screen.getByLabelText("File"), { target: { files: [f] } });
}

describe("AdminResources", () => {
  it("lists files and blocks an upload with no title or file", async () => {
    render(<AdminResources />);
    expect(screen.getByText(/Guide/)).toBeTruthy();
    fireEvent.click(screen.getByText("Upload"));
    expect(await screen.findByText(/Choose a PDF, PNG or JPG/)).toBeTruthy();
    expect(m.upload).not.toHaveBeenCalled();
  });

  it("refuses files over 5 MB in the browser", async () => {
    render(<AdminResources />);
    pick("big.pdf", 5 * 1024 * 1024 + 1);
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Big file" } });
    fireEvent.click(screen.getByText("Upload"));
    expect(await screen.findByText(/larger than 5 MB/)).toBeTruthy();
    expect(m.upload).not.toHaveBeenCalled();
  });

  it("uploads with the title and the email option", async () => {
    m.upload.mockResolvedValue({});
    render(<AdminResources />);
    pick("a.pdf");
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Risk guide" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Upload"));
    await waitFor(() => expect(m.upload).toHaveBeenCalled());
    expect(m.upload.mock.calls[0][0]).toBe("/api/v1/admin/resources?title=Risk%20guide&in_email=true");
  });
});
