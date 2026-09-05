import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { CodeBlock } from "../code/CodeBlock";

interface MarkdownRendererProps {
  content: string;
}

/**
 * Normalise whatever math-delimiter variant the model output into the
 * standard $...$ / $$...$$ format that remark-math understands.
 *
 * Models vary widely:
 *   \[...\]          → $$...$$   (display)
 *   \(...\)          → $...$     (inline)
 *   [ formula ]      → $$...$$ when the line is *only* that bracket group
 *                      and the content contains a LaTeX command (\frac etc.)
 */
function preprocessMath(content: string): string {
  // \[...\]  →  $$...$$
  content = content.replace(/\\\[\s*([\s\S]+?)\s*\\\]/g, "\n$$\n$1\n$$\n");

  // \(...\)  →  $...$
  content = content.replace(/\\\(\s*([\s\S]+?)\s*\\\)/g, "$$$1$$");

  // Bare [ ... ] on its own line where body contains a LaTeX command
  // e.g.  [ f(x) = f(a) + \frac{f''(a)}{2!}(x-a)^2 + \cdots ]
  content = content.replace(
    /^[ \t]*\[([^\]]*\\[a-zA-Z{][^\]]*)\][ \t]*$/gm,
    "\n$$\n$1\n$$\n"
  );

  return content;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const processed = preprocessMath(content);

  return (
    <div className="selectable" style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-1)" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match && !String(children).includes("\n");

            if (isInline) {
              return (
                <code
                  style={{
                    padding: "1px 6px",
                    borderRadius: 5,
                    background: "var(--bg-elevated)",
                    color: "var(--accent)",
                    fontFamily: "monospace",
                    fontSize: "0.9em",
                    border: "1px solid var(--border-mid)",
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <CodeBlock
                language={match ? match[1] : "text"}
                value={String(children).replace(/\n$/, "")}
              />
            );
          },

          h1({ children }) {
            return (
              <h1 style={{
                fontSize: "1.3em", fontWeight: 700, color: "var(--text-1)",
                borderBottom: "1px solid var(--border-mid)",
                paddingBottom: "0.4em", margin: "1.2em 0 0.6em",
              }}>
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 style={{
                fontSize: "1.15em", fontWeight: 600, color: "var(--text-1)",
                borderBottom: "1px solid var(--border)",
                paddingBottom: "0.3em", margin: "1.1em 0 0.5em",
              }}>
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 style={{ fontSize: "1.05em", fontWeight: 600, color: "var(--text-1)", margin: "1em 0 0.4em" }}>
                {children}
              </h3>
            );
          },
          p({ children }) {
            return <p style={{ margin: "0.5em 0", color: "var(--text-1)", lineHeight: 1.7 }}>{children}</p>;
          },
          ul({ children }) {
            return (
              <ul style={{ paddingLeft: "1.4em", margin: "0.5em 0", color: "var(--text-1)" }}>
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol style={{ paddingLeft: "1.4em", margin: "0.5em 0", color: "var(--text-1)" }}>
                {children}
              </ol>
            );
          },
          li({ children }) {
            return <li style={{ margin: "0.2em 0", lineHeight: 1.65 }}>{children}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote style={{
                borderLeft: "3px solid var(--accent)",
                paddingLeft: "0.9em", margin: "0.7em 0",
                color: "var(--text-2)", fontStyle: "italic",
                background: "var(--accent-dim)",
                borderRadius: "0 6px 6px 0",
                padding: "8px 12px",
              }}>
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div style={{ overflowX: "auto", margin: "0.7em 0", borderRadius: 8, border: "1px solid var(--border-mid)" }}>
                <table style={{ minWidth: "100%", borderCollapse: "collapse", fontSize: "0.9em" }}>
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead style={{ background: "var(--bg-elevated)", color: "var(--text-2)" }}>{children}</thead>;
          },
          th({ children }) {
            return (
              <th style={{
                padding: "8px 12px", fontWeight: 600, color: "var(--text-1)",
                borderBottom: "1px solid var(--border-mid)", textAlign: "left",
              }}>
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td style={{
                padding: "7px 12px", color: "var(--text-1)",
                borderBottom: "1px solid var(--border)",
              }}>
                {children}
              </td>
            );
          },
          hr() {
            return <hr style={{ border: "none", borderTop: "1px solid var(--border-mid)", margin: "1em 0" }} />;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--accent)", textDecoration: "underline", textDecorationColor: "var(--accent-dim)" }}
              >
                {children}
              </a>
            );
          },
          strong({ children }) {
            return <strong style={{ fontWeight: 600, color: "var(--text-1)" }}>{children}</strong>;
          },
          em({ children }) {
            return <em style={{ fontStyle: "italic", color: "var(--text-2)" }}>{children}</em>;
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
};
