import { create } from "zustand";

export type ActivePage = "chat" | "documents" | "models" | "system" | "settings";

interface WorkspaceState {
  activePage: ActivePage;
  railExpanded: boolean;        // left icon rail
  inspectorOpen: boolean;       // right inspector drawer
  inspectorSection: string;     // which section to jump to when opened

  setActivePage: (page: ActivePage) => void;
  setRailExpanded: (v: boolean) => void;
  toggleRail: () => void;
  setInspectorOpen: (v: boolean) => void;
  toggleInspector: () => void;
  openInspector: (section?: string) => void;
}

const RAIL_KEY = "leo_rail_expanded";

function loadRailPref(): boolean {
  try { return localStorage.getItem(RAIL_KEY) === "true"; }
  catch { return false; } // default collapsed
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activePage: "chat",
  railExpanded: loadRailPref(),
  inspectorOpen: false,
  inspectorSection: "route",

  setActivePage: (page) => set({ activePage: page }),

  setRailExpanded: (v) => {
    try { localStorage.setItem(RAIL_KEY, String(v)); } catch { /* */ }
    set({ railExpanded: v });
  },

  toggleRail: () => {
    set((s) => {
      const next = !s.railExpanded;
      try { localStorage.setItem(RAIL_KEY, String(next)); } catch { /* */ }
      return { railExpanded: next };
    });
  },

  setInspectorOpen: (v) => set({ inspectorOpen: v }),

  toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),

  openInspector: (section = "route") =>
    set({ inspectorOpen: true, inspectorSection: section }),
}));
