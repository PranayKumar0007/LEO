import React, { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { getHighlighter, getShikiTheme, highlightCodeSync } from "../../lib/highlighter";

interface CodeBlockProps {
  language?: string;
  value: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language = "text", value }) => {
  const [copied, setCopied] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(() =>
    highlightCodeSync(value, language)
  );

  useEffect(() => {
    let isMounted = true;
    const theme = getShikiTheme();

    getHighlighter().then((highlighter) => {
      if (!isMounted) return;
      const lang = language.toLowerCase();
      try {
        const html = highlighter.codeToHtml(value, { lang, theme });
        setHighlightedHtml(html);
      } catch {
        try {
          const html = highlighter.codeToHtml(value, { lang: "text", theme });
          setHighlightedHtml(html);
        } catch { /* ignore */ }
      }
    });

    return () => { isMounted = false; };
  }, [value, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div style={{
      margin: "12px 0",
      borderRadius: 10,
      border: "1px solid var(--border-mid)",
      background: "var(--bg-elevated)",
      overflow: "hidden",
      fontSize: 13,
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 12px",
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
      }}>
        <span style={{
          fontFamily: "monospace",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--badge-code)",
        }}>
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            borderRadius: 5,
            border: "none",
            background: "none",
            cursor: "pointer",
            color: copied ? "var(--status-ok)" : "var(--text-3)",
            fontSize: 11,
            transition: "color 0.12s",
          }}
          title="Copy code"
        >
          {copied ? (
            <><Check size={12} /><span>Copied!</span></>
          ) : (
            <><Copy size={12} /><span>Copy</span></>
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="selectable" style={{ padding: "12px", overflowX: "auto", fontFamily: "monospace", lineHeight: 1.6 }}>
        {highlightedHtml ? (
          <div
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            style={{ all: "unset" } as React.CSSProperties}
          />
        ) : (
          <pre style={{ margin: 0, padding: 0, color: "var(--text-1)", whiteSpace: "pre", fontSize: 13 }}>
            <code>{value}</code>
          </pre>
        )}
      </div>
    </div>
  );
};
