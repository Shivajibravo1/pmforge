// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MentorReply } from "./mentor-reply";

afterEach(cleanup);

const REPLY = `In an AI project, **RAID** is a working log.

| Type | Example | PM action |
|---|---|---|
| **Risk** | Data may be incomplete | Assign an owner |
| **Issue** | Evaluation below threshold | Record impact |

- First point
- Second point

1. Step one
2. Step two

\`\`\`flow
Log it | Write the entry
Rate it | Impact and likelihood
Act | Assign an owner
\`\`\``;

describe("MentorReply", () => {
  it("renders paragraphs, bold, table, lists and a process flow without raw markdown", () => {
    const { container } = render(<MentorReply text={REPLY} />);
    expect(container.querySelectorAll("table").length).toBe(1);
    expect(container.querySelectorAll("th").length).toBe(3);
    expect(container.querySelectorAll("ul li").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelectorAll("ol li").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByLabelText("Process")).toBeTruthy();
    expect(container.querySelector("strong")?.textContent).toBe("RAID");
    expect(container.textContent).not.toContain("**");
    expect(container.textContent).not.toContain("|---|");
  });

  it("never renders HTML, scripts, links or images from the model", () => {
    const { container } = render(
      <MentorReply text={'Hi <script>alert(1)</script><img src=x onerror=alert(1)> [click](https://evil.example) ![pic](https://evil.example/a.png)'} />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
    expect(container.innerHTML).not.toContain("onerror");
  });

  it("does not turn other lesson block types into interactive widgets", () => {
    const { container } = render(<MentorReply text={"```quiz\n? q\n+ a\n- b\n= e\n```"} />);
    expect(container.querySelector("input,button")).toBeNull();
  });
});
