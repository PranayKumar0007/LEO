import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useChatStore } from "../../stores/chatStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";

export function InspectorDrawer() {
  const { inspectorOpen, setInspectorOpen } = useWorkspaceStore();
  const { messages, currentRoute, retrievedChunks, activeModel } = useChatStore();

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && inspectorOpen) setInspectorOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [inspectorOpen, setInspectorOpen]);

  if (!inspectorOpen) return null;

  const lastMsg = messages[messages.length - 1];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setInspectorOpen(false)}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.25)",
          zIndex: 40,
        }}
      />

      {/* Drawer panel */}
      <aside
        className="drawer-enter"
        style={{
          position: "fixed",
          top: 0, right: 0, bottom: 0,
          width: 360,
          background: "var(--bg-surface)",
          borderLeft: "1px solid var(--border)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          height: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-1)" }}>
            Context Inspector
          </span>
          <button
            onClick={() => setInspectorOpen(false)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-3)", padding: 4, display: "flex",
              borderRadius: 6, transition: "color 0.12s",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--text-1)"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)"}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

          <Section label="Route">
            {currentRoute ? (
              <span className={`badge badge-${currentRoute.split("_")[0]}`}>
                {currentRoute}
              </span>
            ) : (
              <Muted>No route yet</Muted>
            )}
          </Section>

          <Section label="Model">
            {activeModel ? (
              <code style={{ color: "var(--badge-code)", fontSize: 12, fontFamily: "monospace" }}>
                {activeModel}
              </code>
            ) : (
              <Muted>—</Muted>
            )}
          </Section>

          <Section label={`Retrieved chunks (${retrievedChunks.length})`}>
            {retrievedChunks.length === 0 ? (
              <Muted>No chunks retrieved</Muted>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {retrievedChunks.map((c, i) => (
                  <div key={i} style={{
                    background: "var(--bg-elevated)", borderRadius: 8,
                    padding: "8px 12px", fontSize: 12, color: "var(--text-2)", lineHeight: 1.5,
                  }}>
                    <div style={{ color: "var(--text-3)", marginBottom: 4, fontSize: 11 }}>
                      Chunk {i + 1}
                      {c.metadata?.filename && ` · ${c.metadata.filename}`}
                      {c.metadata?.page != null && ` p.${c.metadata.page}`}
                    </div>
                    <div className="selectable" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {c.text}
                    </div>
                    {c.score != null && (
                      <div style={{ marginTop: 4, color: "var(--text-3)", fontSize: 10 }}>
                        score: {c.score.toFixed(3)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {lastMsg?.role === "assistant" && (
            <Section label="Last response">
              <Row label="Words">{lastMsg.content.split(/\s+/).filter(Boolean).length}</Row>
              {lastMsg.model && <Row label="Model">{lastMsg.model.model}</Row>}
              {lastMsg.route && <Row label="Route">{lastMsg.route.domain}</Row>}
              {lastMsg.route && (
                <Row label="Confidence">{(lastMsg.route.confidence * 100).toFixed(0)}%</Row>
              )}
            </Section>
          )}

          <Section label="Conversation">
            <Row label="Messages">{messages.length}</Row>
            <Row label="User turns">{messages.filter((m) => m.role === "user").length}</Row>
          </Section>
        </div>
      </aside>
    </>
  );
}

/* ── helpers ── */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
        color: "var(--text-3)", textTransform: "uppercase", marginBottom: 8,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "var(--text-3)", fontSize: 12 }}>{children}</span>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "5px 0", borderBottom: "1px solid var(--border)", fontSize: 12,
    }}>
      <span style={{ color: "var(--text-3)" }}>{label}</span>
      <span style={{ color: "var(--text-2)" }}>{children}</span>
    </div>
  );
}
