// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("next/link", () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "agile-pm-01" }) }));
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  useApi: (path: string) => path.includes("/me")
    ? { data: { id: "u", email: "a@b.co", role: "learner", tier: "free" }, error: null, loading: false, reload: vi.fn() }
    : { data: { id: "agile-pm-01", role: "agile-pm", type: "Behavioural", question: "Tell me about scope change.", time_seconds: 180, rubric: ["Protects the goal", "Offers options"] }, error: null, loading: false, reload: vi.fn() },
  api: m.api,
}));
import PracticeQuestion from "./page";

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

describe("PracticeQuestion", () => {
  it("runs the timer, scores from the ticks and then reveals the model answer", async () => {
    m.api.mockResolvedValue({ attempt_id: "a1", self_score: 50, model_answer: "A model answer text." });
    render(<PracticeQuestion />);
    expect(screen.queryByLabelText("Your answer")).toBeNull();
    fireEvent.click(screen.getByText("Start the timer"));
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(screen.getByRole("timer").textContent).toBe("2:57");
    fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "I met the product owner and offered options." } });
    fireEvent.click(screen.getByText("Done, check my answer"));
    expect(screen.queryByText("A model answer text.")).toBeNull(); // not before the member has answered and checked
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getByText("See my score and a model answer"));
    await waitFor(() => expect(m.api).toHaveBeenCalledWith("/api/v1/practice/questions/agile-pm-01/attempt",
      expect.objectContaining({ method: "POST", body: expect.objectContaining({ ticks: [true, false] }) })));
    await waitFor(() => expect(screen.getByText("A model answer text.")).toBeTruthy());
    expect(screen.getByText("Get AI feedback")).toBeTruthy();
  });

  it("asks for AI feedback only when pressed", async () => {
    m.api.mockResolvedValueOnce({ attempt_id: "a1", self_score: 100, model_answer: "Model." })
      .mockResolvedValueOnce({ review_id: "r", score: 77, strengths: ["Clear"], gaps: ["No dates"], next_steps: ["Add owners"] });
    render(<PracticeQuestion />);
    fireEvent.click(screen.getByText("Start the timer"));
    fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "I met the product owner and offered options." } });
    fireEvent.click(screen.getByText("Done, check my answer"));
    fireEvent.click(screen.getByText("See my score and a model answer"));
    await waitFor(() => screen.getByText("Get AI feedback"));
    expect(m.api).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText("Get AI feedback"));
    await waitFor(() => expect(screen.getByText("No dates")).toBeTruthy());
    expect(m.api).toHaveBeenLastCalledWith("/api/v1/practice/attempts/a1/feedback", { method: "POST" });
  });
});
