import { useEffect } from "react";
import { Shell } from "./components/layout/Shell";
import { useSettingsStore } from "./stores/settingsStore";

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;

    const apply = (isDark: boolean) => {
      root.setAttribute("data-theme", isDark ? "dark" : "light");
    };

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mq.matches);
      const handler = (e: MediaQueryListEvent) => apply(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      apply(theme === "dark");
    }
  }, [theme]);

  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider>
      <Shell />
    </ThemeProvider>
  );
}

export default App;
