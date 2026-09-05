import { create } from "zustand";
import { apiClient, DEFAULT_BACKEND_URL } from "../api/client";

export type AppTheme = "dark" | "light" | "system";

interface SettingsState {
  backendUrl: string;
  theme: AppTheme;
  isConnected: boolean | null;
  routerModel: string | null;
  qdrantCollection: string | null;
  lastHealthError: string | null;
  isCheckingHealth: boolean;

  // Actions
  setBackendUrl: (url: string) => void;
  setTheme: (theme: AppTheme) => void;
  checkConnection: () => Promise<boolean>;
}

const URL_STORAGE_KEY = "leo_backend_url";
const THEME_STORAGE_KEY = "leo_theme";

function getInitialUrl(): string {
  try {
    return localStorage.getItem(URL_STORAGE_KEY) || DEFAULT_BACKEND_URL;
  } catch {
    return DEFAULT_BACKEND_URL;
  }
}

function getInitialTheme(): AppTheme {
  try {
    return (localStorage.getItem(THEME_STORAGE_KEY) as AppTheme) || "dark";
  } catch {
    return "dark";
  }
}

const initialUrl = getInitialUrl();
apiClient.setBaseUrl(initialUrl);

export const useSettingsStore = create<SettingsState>((set, get) => ({
  backendUrl: initialUrl,
  theme: getInitialTheme(),
  isConnected: null,
  routerModel: null,
  qdrantCollection: null,
  lastHealthError: null,
  isCheckingHealth: false,

  setBackendUrl: (url: string) => {
    const cleanUrl = url.trim();
    apiClient.setBaseUrl(cleanUrl);
    try {
      localStorage.setItem(URL_STORAGE_KEY, cleanUrl);
    } catch (err) {
      console.error("Failed to save backend URL to localStorage", err);
    }
    set({ backendUrl: cleanUrl });
    get().checkConnection();
  },

  setTheme: (theme: AppTheme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (err) {
      console.error("Failed to save theme to localStorage", err);
    }
    set({ theme });
    // Actual data-theme attribute is managed by ThemeProvider in App.tsx
    // (handles system mode live updates via matchMedia)
  },

  checkConnection: async () => {
    set({ isCheckingHealth: true });
    try {
      const data = await apiClient.checkHealth();
      set({
        isConnected: data.status === "ok",
        routerModel: data.router_model,
        qdrantCollection: data.qdrant_collection,
        lastHealthError: null,
        isCheckingHealth: false,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({
        isConnected: false,
        lastHealthError: message,
        isCheckingHealth: false,
      });
      return false;
    }
  },
}));
