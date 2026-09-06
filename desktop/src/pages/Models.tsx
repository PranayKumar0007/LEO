import React from "react";
import { Cpu, Compass } from "lucide-react";

const DOMAIN_COLORS: Record<string, string> = {
  code:    "var(--badge-code)",
  math:    "var(--badge-math)",
  medical: "var(--badge-medical)",
  general: "var(--badge-general)",
};

const DOMAIN_BG: Record<string, string> = {
  code:    "var(--badge-code-bg)",
  math:    "var(--badge-math-bg)",
  medical: "var(--badge-medical-bg)",
  general: "var(--badge-general-bg)",
};

const DOMAIN_BORDER: Record<string, string> = {
  code:    "var(--badge-code-border)",
  math:    "var(--badge-math-border)",
  medical: "var(--badge-medical-border)",
  general: "var(--badge-general-border)",
};

const models = [
  {
    domain: "code", name: "qwen2.5-coder:3b", temperature: 0.15,
    description: "Local coding expert specialized for syntax, debugging, and algorithms.",
    systemPrompt: "You are a local coding expert. Provide practical, secure code and explain important tradeoffs. If documents are cited, include source citations.",
  },
  {
    domain: "math", name: "qwen2.5-coder:1.5b", temperature: 0.1,
    description: "Local math expert focused on step-by-step calculations and formula proofs.",
    systemPrompt: "You are a local math expert. Show calculation steps clearly and flag assumptions.",
  },
  {
    domain: "medical", name: "qwen2.5:3b", temperature: 0.1,
    description: "Cautious medical information assistant for local clinical documentation.",
    systemPrompt: "You are a cautious medical information assistant. Provide educational information, cite local documents when used, and recommend professional clinical judgment for care decisions.",
  },
  {
    domain: "general", name: "qwen2.5:3b", temperature: 0.3,
    description: "General-purpose orchestrator for business, document summaries, and casual queries.",
    systemPrompt: "You are a careful local general-purpose assistant running inside an air-gapped organization. Answer using only the provided context and user conversation.",
  },
];

export const ModelsPage: React.FC = () => {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-app)", overflowY: "auto", padding: 24 }}>
      <div style={{ maxWidth: 760, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header */}
        <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-1)", display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
            <Cpu size={18} strokeWidth={1.75} style={{ color: "var(--badge-code)" }} />
            Model Registry & Orchestrator
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4, marginBottom: 0 }}>
            Configured local models registered in LEO backend. The prompt router automatically selects the expert domain model for each query.
          </p>
        </div>

        {/* Router card */}
        <div style={{ padding: "14px 18px", borderRadius: 12, background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>
              <Compass size={14} strokeWidth={1.75} style={{ color: "var(--badge-code)" }} />
              Prompt Router (Orchestrator)
            </div>
            <span style={{
              fontFamily: "monospace", fontSize: 11, padding: "2px 9px", borderRadius: 5,
              background: "var(--badge-code-bg)", color: "var(--badge-code)", border: "1px solid var(--badge-code-border)",
            }}>
              qwen2.5:1.5b-instruct
            </span>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0, lineHeight: 1.6 }}>
            Classifies user intent into domain tags with confidence and rationale. All prompts pass through this router before hitting an expert model.
          </p>
        </div>

        {/* Domain models */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", marginBottom: 10 }}>
            Domain Expert Models (4 Registered)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {models.map((m) => (
              <div
                key={m.domain}
                style={{
                  padding: "14px 16px", borderRadius: 12, display: "flex",
                  flexDirection: "column", gap: 10,
                  background: "var(--bg-surface)", border: "1px solid var(--border)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{
                      fontSize: 10, fontFamily: "monospace", fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.07em",
                      padding: "2px 8px", borderRadius: 5,
                      color: DOMAIN_COLORS[m.domain],
                      background: DOMAIN_BG[m.domain],
                      border: `1px solid ${DOMAIN_BORDER[m.domain]}`,
                    }}>
                      {m.domain}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "monospace" }}>
                      temp: {m.temperature}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>
                    {m.name}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.55, margin: 0 }}>
                    {m.description}
                  </p>
                </div>
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", fontWeight: 600, marginBottom: 5 }}>
                    System Prompt
                  </div>
                  <div className="selectable-text" style={{
                    fontSize: 11, color: "var(--text-2)", fontFamily: "monospace",
                    background: "var(--bg-elevated)", padding: "8px 10px",
                    borderRadius: 7, border: "1px solid var(--border)",
                    lineHeight: 1.5, overflow: "hidden",
                    display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const,
                  }}>
                    {m.systemPrompt}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
