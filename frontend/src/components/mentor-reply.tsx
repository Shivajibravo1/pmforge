"use client";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Flow } from "@/components/lesson-body";

/**
 * Renders a mentor reply as structured text: justified paragraphs, lists, tables and process flows.
 * The reply is untrusted model output, so only a small set of elements is allowed. Raw HTML is not rendered
 * (react-markdown ignores it), links and images are shown as plain text, and the only fenced block that
 * becomes a graphic is `flow`.
 */
export function MentorReply({ text }: { text: string }) {
  return (
    <div lang="en" className="prose-pm text-sm [&>p]:text-justify [&>p]:hyphens-auto">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        allowedElements={["p", "strong", "em", "code", "ul", "ol", "li", "h1", "h2", "h3", "h4", "table", "thead", "tbody", "tr", "th", "td", "pre", "br", "hr", "blockquote", "a", "img"]}
        components={{
          a: ({ children }) => <span>{children}</span>,
          img: ({ alt }) => <span>{alt}</span>,
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const lang = /language-(\w+)/.exec(className ?? "")?.[1];
            if (lang === "flow") return <Flow src={String(children)} />;
            if (lang) return <pre className="my-4 overflow-x-auto rounded-xl border border-line bg-black p-3 text-xs"><code>{children}</code></pre>;
            return <code className={className}>{children}</code>;
          },
          table: ({ children }) => <div className="my-4 overflow-x-auto rounded-2xl border border-line"><table>{children}</table></div>,
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}
