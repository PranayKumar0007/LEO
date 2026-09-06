import React, { useEffect } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import { Activity, CheckCircle2, XCircle, RefreshCw, Server, Database, Terminal } from "lucide-react";

export const SystemPage: React.FC = () => {
  const {
    backendUrl, isConnected, routerModel, qdrantCollection,
    lastHealthError, isCheckingHealth, checkConnection,
  } = useSettingsStore();

  useEffect(() => { checkConnection(); }, [checkConnection]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-app)", overflowY: "auto", padding: 24 }}>
      <div style={{ maxWidth: 760, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-1)", display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
              <Activity size={18} strokeWidth={1.75} style={{ color: "var(--accent)" }} />
              System Diagnostics & Health
            </h1>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4, marginBottom: 0 }}>
              Live status from backend endpoint <code style={{ color: "var(--accent)", fontSize: 11 }}>GET /api/health</code>
            </p>
          </div>
          <button
            onClick={() => checkConnection()}
            disabled={isCheckingHealth}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 12px", borderRadius: 8,
              background: "var(--bg-elevated)", border: "1px solid var(--border-mid)",
              color: "var(--text-2)", fontSize: 12, cursor: "pointer",
              opacity: isCheckingHealth ? 0.5 : 1, transition: "opacity 0.15s",
            }}
          >
            <RefreshCw size={13} style={{ animation: isCheckingHealth ? "spin 1s linear infinite" : "none" }} />
            Check Now
          </button>
        </div>

        {/* Connection status card */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: isConnected ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${isConnected ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {isConnected
                ? <CheckCircle2 size={18} style={{ color: "var(--status-ok)" }} />
                : <XCircle size={18} style={{ color: "var(--status-err)" }} />
              }
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", display: "flex", alignItems: "center", gap: 8 }}>
                FastAPI Backend Server:
                <span style={{
                  fontSize: 11, fontFamily: "monospace", padding: "2px 8px", borderRadius: 5,
                  background: isConnected ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                  color: isConnected ? "var(--status-ok)" : "var(--status-err)",
                  border: `1px solid ${isConnected ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                }}>
                  {isConnected ? "Connected" : "Unavailable"}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "monospace", marginTop: 3 }}>
                {backendUrl}
              </div>
            </div>
          </div>
        </Card>

        {/* Subsystems grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Card>
            <Label Icon={Server} label="Router Model" iconColor="var(--badge-code)" />
            <div style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: "var(--text-1)", marginTop: 6 }}>
              {routerModel || (isConnected ? "Standard" : "—")}
            </div>
            <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, marginBottom: 0 }}>
              Reported by <code style={{ fontSize: 10, color: "var(--accent)" }}>/api/health</code> router_model field.
            </p>
          </Card>

          <Card>
            <Label Icon={Database} label="Qdrant Collection" iconColor="var(--badge-math)" />
            <div style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: "var(--text-1)", marginTop: 6 }}>
              {qdrantCollection || (isConnected ? "leo_documents" : "—")}
            </div>
            <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, marginBottom: 0 }}>
              Target vector collection for RAG document chunk embeddings.
            </p>
          </Card>
        </div>

        {/* Troubleshooting */}
        {!isConnected && (
          <div style={{
            padding: "16px 20px", borderRadius: 12,
            background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.18)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Terminal size={14} style={{ color: "var(--badge-general)" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--badge-general)" }}>How to Start LEO Backend</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 10 }}>
              The desktop app could not reach LEO at <code style={{ color: "var(--accent)", fontSize: 11 }}>{backendUrl}</code>. Run this in your terminal:
            </p>
            <div className="selectable-text" style={{
              padding: "10px 14px", borderRadius: 8, background: "var(--bg-elevated)",
              border: "1px solid var(--border-mid)", fontSize: 12, fontFamily: "monospace",
              color: "var(--badge-code)",
            }}>
              uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
            </div>
            {lastHealthError && (
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8 }}>
                Error detail: <span style={{ color: "var(--status-err)", fontFamily: "monospace" }}>{lastHealthError}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: "16px 18px", borderRadius: 12,
      background: "var(--bg-surface)", border: "1px solid var(--border)",
    }}>
      {children}
    </div>
  );
}

function Label({ Icon, label, iconColor }: { Icon: typeof Server; label: string; iconColor: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <Icon size={13} strokeWidth={1.75} style={{ color: iconColor }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>{label}</span>
    </div>
  );
}
