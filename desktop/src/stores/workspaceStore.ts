import { create } from "zustand";

export type ActivePage = "chat" | "documents" | "models" | "system" | "settings";

export interface ProjectItem {
  id: string;
  name: string;
  path: string;
  lastOpened?: number;
}

interface WorkspaceState {
  activePage: ActivePage;
  railExpanded: boolean;        // left icon rail
  inspectorOpen: boolean;       // right inspector drawer
  inspectorSection: string;     // which section to jump to when opened

  // Projects / Workspace mode
  projects: ProjectItem[];
  activeProject: ProjectItem | null; // null = "No Project" (General Chat mode)

  setActivePage: (page: ActivePage) => void;
  setRailExpanded: (v: boolean) => void;
  toggleRail: () => void;
  setInspectorOpen: (v: boolean) => void;
  toggleInspector: () => void;
  openInspector: (section?: string) => void;

  // Project management
  setActiveProject: (project: ProjectItem | null) => void;
  addProject: (name: string, path: string) => ProjectItem;
  removeProject: (id: string) => void;
}

const RAIL_KEY = "leo_rail_expanded";
const PROJECTS_KEY = "leo_projects_list";
const ACTIVE_PROJECT_KEY = "leo_active_project_id";

// Default empty list of projects (no hardcoding)
const DEFAULT_PROJECTS: ProjectItem[] = [];

function loadRailPref(): boolean {
  try { return localStorage.getItem(RAIL_KEY) === "true"; }
  catch { return false; }
}

function loadProjects(): ProjectItem[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return DEFAULT_PROJECTS;
}

function loadActiveProject(projects: ProjectItem[]): ProjectItem | null {
  try {
    const activeId = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (!activeId || activeId === "none") return null;
    const found = projects.find((p) => p.id === activeId);
    if (found) return found;
  } catch { /* ignore */ }
  return null; // Default to "No Project" mode
}

export const useWorkspaceStore = create<WorkspaceState>((set) => {
  const initialProjects = loadProjects();
  const initialActive = loadActiveProject(initialProjects);

  return {
    activePage: "chat",
    railExpanded: loadRailPref(),
    inspectorOpen: false,
    inspectorSection: "route",

    projects: initialProjects,
    activeProject: initialActive,

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

    setActiveProject: (project) => {
      try {
        if (project === null) {
          localStorage.setItem(ACTIVE_PROJECT_KEY, "none");
        } else {
          localStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
        }
      } catch { /* */ }
      set({ activeProject: project });
    },

    addProject: (name, path) => {
      const newProj: ProjectItem = {
        id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        path,
        lastOpened: Date.now(),
      };
      set((s) => {
        const next = [newProj, ...s.projects.filter((p) => p.path !== path)];
        try {
          localStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
          localStorage.setItem(ACTIVE_PROJECT_KEY, newProj.id);
        } catch { /* */ }
        return { projects: next, activeProject: newProj };
      });
      return newProj;
    },

    removeProject: (id) => {
      set((s) => {
        const next = s.projects.filter((p) => p.id !== id);
        const nextActive = s.activeProject?.id === id ? null : s.activeProject;
        try {
          localStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
          localStorage.setItem(ACTIVE_PROJECT_KEY, nextActive ? nextActive.id : "none");
        } catch { /* */ }
        return { projects: next, activeProject: nextActive };
      });
    },
  };
});
