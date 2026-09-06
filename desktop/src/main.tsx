import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "katex/dist/katex.min.css";


// Apply initial theme before first render to avoid flash
(function applyInitialTheme() {
  try {
    const stored = localStorage.getItem("leo_theme") || "dark";
    let resolved: "dark" | "light" = "dark";
    if (stored === "light") resolved = "light";
    else if (stored === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.setAttribute("data-theme", resolved);
  } catch {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
