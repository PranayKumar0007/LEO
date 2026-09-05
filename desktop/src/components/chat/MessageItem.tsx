import { useState } from "react";
import type { Message } from "../../stores/chatStore";
import { MarkdownRenderer } from "../markdown/MarkdownRenderer";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { useChatStore } from "../../stores/chatStore";

interface Props {
  message: Message;
}

const DOMAIN_CLASS: Record<string, string> = {
  code:         "badge-code",
  math:         "badge-math",
  medical:      "badge-medical",
  general:      "badge-general",
  code_math:    "badge-code",
  medical_math: "badge-medical",
};

export function MessageItem({ message }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser      = message.role === "user";
  const isStreaming = !!message.isStreaming;
  const hasContent  = message.content.length > 0;

  // Only read streamPhase from store for the actively streaming message
  const streamPhase  = useChatStore((s) => s.streamPhase);
  const activeModel  = useChatStore((s) => s.activeModel);
  const showThinking = isStreaming && !hasContent;
  const phase        = streamPhase ?? "thinking";

  const copy = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: isUser ? "flex-end" : "flex-start",
      padding: "6px 24px",
    }}>
      <div style={{ maxWidth: "82%", minWidth: 60, position: "relative" }}>

        {/* Route + model badge — assistant only */}
        {!isUser && message.route && (
          <div style={{ marginBottom: 5, display: "flex", alignItems: "center", gap: 8 }}>
            <span className={`badge ${DOMAIN_CLASS[message.route.domain] ?? "badge-general"}`}>
              {message.route.domain}
            </span>
            {message.model && (
              <span style={{ color: "var(--text-3)", fontSize: 10, fontFamily: "monospace" }}>
                {message.model.model}
              </span>
            )}
          </div>
        )}

        {/* Content area */}
        <div
          className="selectable"
          style={{
            background:   isUser ? "var(--accent-dim)" : "transparent",
            border:       isUser ? "1px solid rgba(139,92,246,0.2)" : "none",
            borderRadius: isUser ? 14 : 0,
            padding:      isUser ? "10px 14px" : "2px 0",
            color:        "var(--text-1)",
            fontSize: 14,
            lineHeight: 1.65,
          }}
        >
          {showThinking ? (
            /* Phase-aware thinking indicator — shown until first token */
            <ThinkingIndicator phase={phase} model={activeModel} />
          ) : isUser ? (
            <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {message.content}
            </span>
          ) : (
            /* Streaming: content animates in per chunk via CSS class */
            <div className={isStreaming ? "token-animate" : undefined}>
              <MarkdownRenderer content={message.content} />
            </div>
          )}
        </div>

        {/* Copy button — assistant only, after done */}
        {!isUser && !isStreaming && hasContent && (
          <button
            onClick={copy}
            title="Copy response"
            style={{
              marginTop: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: copied ? "var(--status-ok)" : "var(--text-3)",
              fontSize: 11,
              padding: "2px 0",
              display: "flex",
              alignItems: "center",
              gap: 4,
              transition: "color 0.15s",
            }}
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}
