import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search, Trash2, FileText, Pill, Calculator, Code2, BarChart2, Globe, ArrowUp, Square } from "lucide-react";
import { useChatStore } from "../stores/chatStore";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { MessageItem } from "../components/chat/MessageItem";
import type { LucideIcon } from "lucide-react";

type HeroPrompt = {
  Icon: LucideIcon;
  color: string;
  label: string;
  text: string;
};

const HERO_PROMPTS: HeroPrompt[] = [
  {
    Icon: FileText, color: "var(--badge-math)",
    label: "Summarise a paper",
    text: "Summarise the key findings from a recent paper on transformer attention mechanisms.",
  },
  {
    Icon: Pill, color: "var(--badge-medical)",
    label: "Drug interaction",
    text: "What are the known interactions between metformin and ibuprofen?",
  },
  {
    Icon: Calculator, color: "var(--badge-general)",
    label: "Explain a proof",
    text: "Explain Gödel's incompleteness theorems in plain language.",
  },
  {
    Icon: Code2, color: "var(--badge-code)",
    label: "Write code",
    text: "Write a Python function that implements binary search with full type hints.",
  },
  {
    Icon: BarChart2, color: "#f97316",
    label: "Analyse data",
    text: "What statistical tests should I use for a two-group comparison with non-normal data?",
  },
  {
    Icon: Globe, color: "#818cf8",
    label: "Translate & explain",
    text: "Translate this French medical abstract and highlight the main conclusions.",
  },
];

export function ChatPage() {
  const [input, setInput] = useState("");
  const { messages, isStreaming, error, sendMessage, stopStreaming, clearConversation } = useChatStore();
  const { toggleInspector } = useWorkspaceStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textRef   = useRef<HTMLTextAreaElement>(null);
  const abortRef  = useRef<AbortController | null>(null);

  const isEmpty = messages.length === 0;

  /* auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* auto-grow textarea */
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(Math.max(el.scrollHeight, 56), 200) + "px";
  }, [input]);

  const send = useCallback(() => {
    const q = input.trim();
    if (!q || isStreaming) return;
    setInput("");
    sendMessage(q, undefined, (ctrl) => { abortRef.current = ctrl; });
  }, [input, isStreaming, sendMessage]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    stopStreaming();
  }, [stopStreaming]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const fillPrompt = (text: string) => {
    setInput(text);
    setTimeout(() => textRef.current?.focus(), 0);
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      position: "relative",
      background: "var(--bg-app)",
    }}>
      {/* ── Top toolbar (visible when messages exist) ── */}
      {!isEmpty && (
        <div style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 22px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          <span style={{ fontWeight: 500, fontSize: 13, color: "var(--text-2)" }}>
            Thread
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <TopBarBtn Icon={Search} label="Inspect" onClick={toggleInspector} />
            <TopBarBtn Icon={Trash2} label="Clear chat" onClick={clearConversation} danger />
          </div>
        </div>
      )}

      {/* ── Centre region: hero or thread ── */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}>
        {isEmpty ? (
          /* ── Hero empty state ── */
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 24px 160px",
            minHeight: "100%",
          }}>
            <div style={{
              fontSize: 30,
              fontWeight: 500,
              color: "var(--text-1)",
              letterSpacing: "-0.5px",
              marginBottom: 8,
            }}>
              LEO
            </div>
            <p style={{
              color: "var(--text-3)",
              fontSize: 13,
              marginBottom: 36,
              textAlign: "center",
              maxWidth: 340,
              lineHeight: 1.6,
            }}>
              Local-first AI for research, code, and clinical reasoning — entirely on-premises.
            </p>

            {/* Quick-start cards */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(180px, 220px))",
              gap: 10,
              width: "100%",
              maxWidth: 680,
            }}>
              {HERO_PROMPTS.map((p) => (
                <HeroCard key={p.label} {...p} onClick={() => fillPrompt(p.text)} />
              ))}
            </div>
          </div>
        ) : (
          /* ── Thread ── */
          <div style={{
            display: "flex",
            flexDirection: "column",
            padding: "20px 0 180px",
            maxWidth: 760,
            width: "100%",
            margin: "0 auto",
          }}>
            {messages.map((msg) => (
              <MessageItem key={msg.id} message={msg} />
            ))}

            {/* Error */}
            {error && (
              <div style={{
                margin: "16px 24px",
                padding: "12px 16px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 10,
                color: "var(--status-err)",
                fontSize: 13,
              }}>
                {error}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
      
      {/* ── Codex-style input bar ── */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        padding: "12px 20px 20px",
        background: "linear-gradient(to top, var(--bg-app) 70%, transparent)",
        pointerEvents: "none",
      }}>
        <div style={{
          width: "100%",
          maxWidth: 740,
          pointerEvents: "all",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-mid)",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 2px 16px rgba(0,0,0,0.22)",
          transition: "border-color 0.15s",
          overflow: "hidden",
        }}>
          {/* Top: textarea — text starts top-left, exactly like Codex "Do anything" */}
          <textarea
            ref={textRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask LEO anything…"
            disabled={isStreaming}
            rows={2}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              outline: "none",
              resize: "none",
              color: "var(--text-1)",
              fontSize: 14,
              lineHeight: "1.6",
              fontFamily: "inherit",
              overflowY: "auto",
              maxHeight: 200,
              minHeight: 56,
              padding: "14px 16px 8px",
              boxSizing: "border-box",
              userSelect: "text",
            }}
          />

          {/* Bottom toolbar — mirrors Codex's bottom action row */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 10px 8px",
            borderTop: "1px solid var(--border)",
          }}>
            {/* Left: keyboard hint */}
            <span style={{
              fontSize: 11,
              color: "var(--text-3)",
              paddingLeft: 4,
              userSelect: "none",
            }}>
              ↵ Enter to send · Shift+Enter for newline
            </span>

            {/* Right: stop or send */}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {isStreaming ? (
                <button
                  onClick={stop}
                  title="Stop generation"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    color: "var(--status-err)",
                    borderRadius: 8,
                    width: 32, height: 32,
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.12s",
                  }}
                >
                  <Square size={13} fill="currentColor" strokeWidth={0} />
                </button>
              ) : (
                <button
                  onClick={send}
                  disabled={!input.trim()}
                  title="Send (Enter)"
                  style={{
                    background: input.trim() ? "var(--accent)" : "var(--bg-surface)",
                    border: input.trim() ? "none" : "1px solid var(--border-mid)",
                    color: input.trim() ? "var(--accent-fg)" : "var(--text-3)",
                    borderRadius: 8,
                    width: 32, height: 32,
                    cursor: input.trim() ? "pointer" : "default",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  <ArrowUp size={15} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Top bar labeled button ── */
function TopBarBtn({
  Icon, label, onClick, danger,
}: { Icon: LucideIcon; label: string; onClick: () => void; danger?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 10px",
        borderRadius: 7,
        border: `1px solid ${hov ? "var(--border-mid)" : "var(--border)"}`,
        background: "none",
        cursor: "pointer",
        color: hov
          ? (danger ? "var(--status-err)" : "var(--text-1)")
          : "var(--text-3)",
        fontSize: 12,
        fontWeight: 500,
        transition: "color 0.12s, border-color 0.12s",
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={13} strokeWidth={1.75} />
      {label}
    </button>
  );
}

/* ── Hero quick-start card ── */
function HeroCard({
  Icon, color, label, text, onClick,
}: HeroPrompt & { onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? "var(--bg-elevated)" : "var(--bg-surface)",
        border: `1px solid ${hov ? "var(--border-mid)" : "var(--border)"}`,
        borderRadius: 12,
        padding: "16px 16px",
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transition: "background 0.12s, border-color 0.12s",
        minHeight: 90,
      }}
    >
      <Icon size={18} strokeWidth={1.75} style={{ color, flexShrink: 0 }} />
      <div>
        <div style={{ color: "var(--text-1)", fontWeight: 600, fontSize: 12, marginBottom: 2 }}>
          {label}
        </div>
        <div style={{
          fontSize: 11,
          color: "var(--text-3)",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as const,
          lineHeight: 1.45,
        }}>
          {text}
        </div>
      </div>
    </button>
  );
}
