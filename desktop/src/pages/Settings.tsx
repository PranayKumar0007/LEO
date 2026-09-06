import React, { useState } from "react";
import { useSettingsStore, AppTheme } from "../stores/settingsStore";
import { useChatStore } from "../stores/chatStore";
import { useHistoryStore } from "../stores/historyStore";
import { Settings, Server, Palette, Trash2, ShieldCheck, Check } from "lucide-react";

export const SettingsPage: React.FC = () => {
  const { backendUrl, theme, setBackendUrl, setTheme } = useSettingsStore();
  const { clearConversations } = useChatStore();
  const { clearAll: clearCustomTitles } = useHistoryStore();

  const [inputUrl, setInputUrl] = useState(backendUrl);
  const [savedUrl, setSavedUrl] = useState(false);
  const [clearedChats, setClearedChats] = useState(false);

  const handleSaveUrl = () => {
    setBackendUrl(inputUrl);
    setSavedUrl(true);
    setTimeout(() => setSavedUrl(false), 2000);
  };

  const handleClearChats = () => {
    if (window.confirm("Are you sure you want to clear all local chat history?")) {
      clearConversations();
      clearCustomTitles();
      setClearedChats(true);
      setTimeout(() => setClearedChats(false), 2000);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-app)", overflowY: "auto", padding: 24 }}>
      <div style={{ maxWidth: 760, margin: "0 auto", width: "100%" }}>

        {/* Header */}
        <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16, marginBottom: 24 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-1)", display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
            <Settings size={18} strokeWidth={1.75} style={{ color: "var(--accent)" }} />
            Workbench Settings
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4, marginBottom: 0 }}>
            Configure local connections and desktop workbench appearance.
          </p>
        </div>

        {/* Backend URL */}
        <Section>
          <SectionHeader Icon={Server} label="FastAPI Backend URL" iconColor="var(--badge-code)" />
          <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 10 }}>
            The address where your local LEO FastAPI server is running. Default: <code style={{ color: "var(--accent)" }}>http://127.0.0.1:8000</code>
          </p>
          <div style={{ display: "flex", gap: 8, maxWidth: 480 }}>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="selectable-text"
              style={{
                flex: 1, padding: "7px 12px", borderRadius: 8,
                background: "var(--bg-elevated)", border: "1px solid var(--border-mid)",
                color: "var(--text-1)", fontSize: 13, fontFamily: "monospace",
                outline: "none",
              }}
              placeholder="http://127.0.0.1:8000"
            />
            <button
              onClick={handleSaveUrl}
              style={{
                padding: "7px 16px", borderRadius: 8, border: "none",
                background: "var(--accent)", color: "var(--accent-fg)",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              {savedUrl ? <Check size={13} /> : null}
              {savedUrl ? "Saved" : "Apply"}
            </button>
          </div>
        </Section>

        {/* Theme */}
        <Section>
          <SectionHeader Icon={Palette} label="Theme & Appearance" iconColor="var(--accent)" />
          <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 10 }}>
            Select your preferred desktop interface theme.
          </p>
          <div style={{ display: "flex", gap: 6 }}>
            {(["dark", "light", "system"] as AppTheme[]).map((t) => (
              <ThemeBtn key={t} label={t} active={theme === t} onClick={() => setTheme(t)} />
            ))}
          </div>
        </Section>

        {/* Air-gap */}
        <Section style={{ background: "var(--airgap-bg)", border: "1px solid var(--airgap-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <ShieldCheck size={15} style={{ color: "var(--airgap-text)" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--airgap-text)" }}>
              Air-Gapped & Local-First Compliance
            </span>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, margin: 0 }}>
            This application does not transmit any prompts, document text, or telemetry to external cloud services.
            All model inference and vector queries remain completely on your local infrastructure.
          </p>
        </Section>

        {/* Data management */}
        <Section>
          <SectionHeader Icon={Trash2} label="Local Conversations Data" iconColor="var(--status-err)" />
          <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 10 }}>
            Delete all saved chat threads stored in local browser storage.
          </p>
          <button
            onClick={handleClearChats}
            style={{
              padding: "7px 14px", borderRadius: 8, cursor: "pointer",
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              color: "var(--status-err)", fontSize: 12, fontWeight: 500,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <Trash2 size={13} />
            {clearedChats ? "Chats Cleared" : "Clear All Chats"}
          </button>
        </Section>
      </div>
    </div>
  );
};

/* ── helpers ── */
function Section({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      padding: "18px 20px", borderRadius: 12,
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      marginBottom: 14, ...style,
    }}>
      {children}
    </div>
  );
}

function SectionHeader({ Icon, label, iconColor }: { Icon: typeof Settings; label: string; iconColor: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
      <Icon size={14} strokeWidth={1.75} style={{ color: iconColor }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>{label}</span>
    </div>
  );
}

function ThemeBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 500,
        cursor: "pointer", textTransform: "capitalize",
        background: active ? "var(--accent)" : "var(--bg-elevated)",
        color: active ? "var(--accent-fg)" : "var(--text-2)",
        border: active ? "none" : "1px solid var(--border-mid)",
        transition: "background 0.12s, color 0.12s",
      }}
    >
      {label}
    </button>
  );
}
