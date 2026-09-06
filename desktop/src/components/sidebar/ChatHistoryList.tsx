import { useMemo } from "react";
import { Plus } from "lucide-react";
import { useChatStore } from "../../stores/chatStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { HistoryItem } from "./HistoryItem";
import type { Conversation } from "../../types/chat";

// ─────────────────────────────────────────
// Time-based grouping (Today / Yesterday / Previous 7 Days / Older)
// ─────────────────────────────────────────

type GroupLabel = "Today" | "Yesterday" | "Previous 7 Days" | "Older";

interface ConversationGroup {
  label: GroupLabel;
  conversations: Conversation[];
}

function groupConversations(conversations: Conversation[]): ConversationGroup[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86_400_000;
  const weekStart = todayStart - 6 * 86_400_000; // 7 days including today

  const groups: Record<GroupLabel, Conversation[]> = {
    Today: [],
    Yesterday: [],
    "Previous 7 Days": [],
    Older: [],
  };

  // Sort by updatedAt descending first
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  for (const conv of sorted) {
    const t = conv.updatedAt;
    if (t >= todayStart) {
      groups.Today.push(conv);
    } else if (t >= yesterdayStart) {
      groups.Yesterday.push(conv);
    } else if (t >= weekStart) {
      groups["Previous 7 Days"].push(conv);
    } else {
      groups.Older.push(conv);
    }
  }

  // Return only non-empty groups in display order
  const order: GroupLabel[] = ["Today", "Yesterday", "Previous 7 Days", "Older"];
  return order
    .filter((label) => groups[label].length > 0)
    .map((label) => ({ label, conversations: groups[label] }));
}

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────

export function ChatHistoryList() {
  const conversations = useChatStore((s) => s.conversations);
  const createNewConversation = useChatStore((s) => s.createNewConversation);
  const { setActivePage } = useWorkspaceStore();

  const groups = useMemo(() => groupConversations(conversations), [conversations]);

  const handleNewChat = () => {
    createNewConversation();
    setActivePage("chat");
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      flex: 1,
      minHeight: 0,
      overflow: "hidden",
    }}>
      {/* New Chat button */}
      <button
        onClick={handleNewChat}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          margin: "4px 8px 6px",
          borderRadius: 8,
          border: "1px solid var(--border-mid)",
          background: "none",
          cursor: "pointer",
          color: "var(--text-2)",
          fontSize: 12,
          fontWeight: 500,
          transition: "background 0.12s, color 0.12s, border-color 0.12s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-1)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-strong)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "none";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-mid)";
        }}
      >
        <Plus size={14} strokeWidth={2} />
        New Chat
      </button>

      {/* Scrollable conversation list */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "0 6px 8px",
      }}>
        {groups.length === 0 ? (
          <div style={{
            padding: "20px 10px",
            textAlign: "center",
            color: "var(--text-3)",
            fontSize: 11,
          }}>
            No conversations yet
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} style={{ marginBottom: 4 }}>
              {/* Group header */}
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--text-3)",
                padding: "10px 10px 4px",
              }}>
                {group.label}
              </div>

              {/* Items */}
              {group.conversations.map((conv) => (
                <HistoryItem key={conv.id} conversation={conv} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
