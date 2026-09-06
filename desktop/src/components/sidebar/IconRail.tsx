import { MessageSquare, Cpu, Heart, Settings, Zap } from "lucide-react";
import { useWorkspaceStore, ActivePage } from "../../stores/workspaceStore";
import { useChatStore } from "../../stores/chatStore";
import { ChatHistoryList } from "./ChatHistoryList";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  id: ActivePage;
  Icon: LucideIcon;
  label: string;
  title: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: "chat",      Icon: MessageSquare, label: "Chat",     title: "AI Chat" },
  { id: "models",    Icon: Cpu,           label: "Models",   title: "Models" },
  { id: "system",    Icon: Heart,         label: "Health",   title: "System Health" },
  { id: "settings",  Icon: Settings,      label: "Settings", title: "Settings" },
];

export function IconRail() {
  const { activePage, railExpanded, setActivePage, toggleRail } = useWorkspaceStore();
  const { isStreaming } = useChatStore();

  const W = railExpanded ? 200 : 54;

  return (
    <aside style={{
      width: W,
      minWidth: W,
      maxWidth: W,
      height: "100vh",
      background: "var(--bg-rail)",
      /* no border-right — rail blends into shell */
      display: "flex",
      flexDirection: "column",
      transition: "width 0.22s ease, min-width 0.22s ease, max-width 0.22s ease",
      overflow: "hidden",
      zIndex: 20,
      flexShrink: 0,
    }}>
      {/* Logo / expand toggle */}
      <button
        title={railExpanded ? "Collapse rail" : "Expand rail"}
        onClick={toggleRail}
        style={{
          height: 56,
          minHeight: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: railExpanded ? "flex-start" : "center",
          gap: 10,
          padding: railExpanded ? "0 16px" : "0",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-2)",
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: "-0.3px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          width: "100%",
        }}
      >
        <Zap size={20} strokeWidth={2} style={{ flexShrink: 0 }} />
        {railExpanded && <span style={{ color: "var(--text-1)", opacity: 0.9 }}>LEO</span>}
      </button>

      {/* Thin divider */}
      <div style={{ height: 1, background: "var(--border)", margin: "0 12px" }} />

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "10px 0", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_ITEMS.map((item) => {
          const active = activePage === item.id;
          const { Icon } = item;
          return (
            <button
              key={item.id}
              title={item.title}
              onClick={() => setActivePage(item.id)}
              style={{
                width: "100%",
                height: 42,
                display: "flex",
                alignItems: "center",
                justifyContent: railExpanded ? "flex-start" : "center",
                gap: 10,
                padding: railExpanded ? "0 14px" : "0",
                background: active ? "rgba(255,255,255,0.06)" : "none",
                border: "none",
                borderLeft: "2px solid transparent",
                cursor: "pointer",
                color: active ? "var(--text-1)" : "var(--text-3)",
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                whiteSpace: "nowrap",
                overflow: "hidden",
                transition: "background 0.12s, color 0.12s",
                borderRadius: railExpanded ? "0 8px 8px 0" : 0,
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)";
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)";
              }}
            >
              <Icon size={18} strokeWidth={active ? 1.75 : 1.5} style={{ flexShrink: 0 }} />
              {railExpanded && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Chat history — visible when rail is expanded */}
      {railExpanded && (
        <>
          <div style={{ height: 1, background: "var(--border)", margin: "0 12px" }} />
          <ChatHistoryList />
        </>
      )}

      {/* Bottom: streaming badge */}
      {isStreaming && (
        <div style={{
          padding: "10px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: railExpanded ? "flex-start" : "center",
          gap: 8,
          paddingLeft: railExpanded ? 16 : 0,
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "var(--status-ok)",
            flexShrink: 0,
            animation: "pulse 1.4s ease infinite",
          }} />
          {railExpanded && (
            <span style={{ color: "var(--text-3)", fontSize: 11 }}>Streaming…</span>
          )}
        </div>
      )}
    </aside>
  );
}
