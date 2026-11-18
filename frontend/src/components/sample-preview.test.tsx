// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SAMPLE_ARTIFACTS } from "@/lib/samples";
import { SampleCertificate } from "./sample-certificate";
import { SamplePortfolio } from "./sample-portfolio";

afterEach(cleanup);

describe("SampleCertificate", () => {
  it("is clearly marked as a sample and can be closed", () => {
    const onClose = vi.fn();
    render(<SampleCertificate level={2} title="Agile and Hybrid Delivery" lessons={30} onClose={onClose} />);
    expect(screen.getByRole("region").textContent).toContain("SAMPLE");
    expect(screen.getByRole("region").textContent).toContain("SAMPLE-L2");
    expect(screen.getByRole("region").textContent).toContain("Level 2: Agile and Hybrid Delivery");
    fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("SamplePortfolio", () => {
  it("shows three sample artifacts, each labelled Sample with a review", () => {
    expect(SAMPLE_ARTIFACTS).toHaveLength(3);
    render(<SamplePortfolio />);
    for (const a of SAMPLE_ARTIFACTS) {
      expect(screen.getByText(a.title)).toBeTruthy();
      expect(a.sections.length).toBeGreaterThanOrEqual(4);
      expect(a.score).toBeGreaterThan(0);
      expect(a.score).toBeLessThanOrEqual(100);
    }
    expect(screen.getAllByText(/· Sample/)).toHaveLength(3);
    expect(screen.getAllByText("Mentor review")).toHaveLength(3);
  });
});
