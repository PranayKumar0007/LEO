import { create } from "zustand";

// ─────────────────────────────────────────
// historyStore — custom title overrides only
//
// chatStore already persists conversations, titles, and messages.
// This store adds:
//   • rename (custom title override)
//   • clearAll (wipe custom titles, called alongside chatStore.clearConversations)
// ─────────────────────────────────────────

interface HistoryState {
  customTitles: Record<string, string>; // conversationId → user-set title

  rename: (id: string, title: string) => void;
  getTitle: (id: string, autoTitle: string) => string;
  removeTitle: (id: string) => void;
  clearAll: () => void;
}

const STORAGE_KEY = "leo_history_custom_titles";

function loadCustomTitles(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveCustomTitles(titles: Record<string, string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(titles));
  } catch (err) {
    console.error("Failed to persist custom titles", err);
  }
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  customTitles: loadCustomTitles(),

  rename: (id, title) => {
    set((s) => {
      const next = { ...s.customTitles, [id]: title };
      saveCustomTitles(next);
      return { customTitles: next };
    });
  },

  getTitle: (id, autoTitle) => {
    return get().customTitles[id] || autoTitle;
  },

  removeTitle: (id) => {
    set((s) => {
      const next = { ...s.customTitles };
      delete next[id];
      saveCustomTitles(next);
      return { customTitles: next };
    });
  },

  clearAll: () => {
    saveCustomTitles({});
    set({ customTitles: {} });
  },
}));
