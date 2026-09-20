import React, { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Pencil, Trash2, MessageSquare } from "lucide-react";
import { useChatStore } from "../../stores/chatStore";
import { useHistoryStore } from "../../stores/historyStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import type { Conversation } from "../../types/chat";

interface Props {
  conversation: Conversation;
}

export function HistoryItem({ conversation }: Props) {
  const { activeConversationId, selectConversation, deleteConversation } = useChatStore();
  const { getTitle, rename, removeTitle } = useHistoryStore();
  const { setActivePage } = useWorkspaceStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = activeConversationId === conversation.id;
  const rawTitle = getTitle(conversation.id, conversation.title) || "New Chat";
  const displayTitle = conversation.projectName ? `${conversation.projectName} > ${rawTitle}` : rawTitle;

  // Focus input when renaming starts
  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleClick = () => {
    if (isRenaming) return;
    selectConversation(conversation.id);
    setActivePage("chat");
  };

  const handleRenameStart = () => {
    setRenameValue(displayTitle);
    setIsRenaming(true);
    setMenuOpen(false);
  };

  const handleRenameCommit = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== conversation.title) {
      rename(conversation.id, trimmed);
    }
    setIsRenaming(false);
  };

  const handleRenameKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRenameCommit();
    } else if (e.key === "Escape") {
      setIsRenaming(false);
    }
  };

  const handleDelete = () => {
    setMenuOpen(false);
    deleteConversation(conversation.id);
    removeTitle(conversation.id);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
      onClick={handleClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 10px",
        borderRadius: 8,
        cursor: isRenaming ? "default" : "pointer",
        background: isActive
          ? "rgba(255,255,255,0.06)"
          : hovered
            ? "rgba(255,255,255,0.03)"
            : "transparent",
        transition: "background 0.1s",
        position: "relative",
        minHeight: 34,
      }}
    >
      <MessageSquare
        size={14}
        strokeWidth={1.5}
        style={{
          flexShrink: 0,
          color: isActive ? "var(--text-1)" : "var(--text-3)",
        }}
      />

      {isRenaming ? (
        <input
          ref={inputRef}
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={handleRenameCommit}
          onKeyDown={handleRenameKey}
          onClick={(e) => e.stopPropagation()}
          style={{
            flex: 1,
            minWidth: 0,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-mid)",
            borderRadius: 5,
            padding: "2px 6px",
            fontSize: 12,
            color: "var(--text-1)",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
      ) : (
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 12,
            color: isActive ? "var(--text-1)" : "var(--text-2)",
            fontWeight: isActive ? 500 : 400,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayTitle}
        </span>
      )}

      {/* ⋯ button — shown on hover */}
      {hovered && !isRenaming && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          style={{
            flexShrink: 0,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-3)",
            padding: 2,
            display: "flex",
            alignItems: "center",
            borderRadius: 4,
            transition: "color 0.1s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-1)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)")
          }
        >
          <MoreHorizontal size={14} />
        </button>
      )}

      {/* Dropdown menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            zIndex: 100,
            marginTop: 2,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-mid)",
            borderRadius: 10,
            padding: 4,
            minWidth: 140,
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          <MenuBtn
            icon={<Pencil size={13} />}
            label="Rename"
            onClick={(e) => {
              e.stopPropagation();
              handleRenameStart();
            }}
          />
          <MenuBtn
            icon={<Trash2 size={13} />}
            label="Delete"
            danger
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ── Dropdown menu button ── */
function MenuBtn({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 7,
        background: hov ? "rgba(255,255,255,0.04)" : "transparent",
        border: "none",
        cursor: "pointer",
        color: danger
          ? hov
            ? "var(--status-err)"
            : "var(--text-2)"
          : hov
            ? "var(--text-1)"
            : "var(--text-2)",
        fontSize: 12,
        fontWeight: 400,
        transition: "background 0.1s, color 0.1s",
        textAlign: "left",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
