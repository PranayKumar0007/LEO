import React from "react";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { IconRail } from "../sidebar/IconRail";
import { InspectorDrawer } from "../context/InspectorDrawer";
import { ChatPage } from "../../pages/ChatPage";
import { DocumentsPage } from "../../pages/Documents";
import { ModelsPage } from "../../pages/Models";
import { SystemPage } from "../../pages/System";
import { SettingsPage } from "../../pages/Settings";

const PAGE_MAP: Record<string, React.ReactNode> = {
  chat:      <ChatPage />,
  documents: <DocumentsPage />,
  models:    <ModelsPage />,
  system:    <SystemPage />,
  settings:  <SettingsPage />,
};

export function Shell() {
  const { activePage, inspectorOpen } = useWorkspaceStore();

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      width: "100vw",
      background: "var(--bg-app)",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Left icon rail */}
      <IconRail />

      {/* Centre — full remaining width */}
      <main style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "margin-right 0.22s ease",
        marginRight: inspectorOpen ? 360 : 0,
      }}>
        {PAGE_MAP[activePage] ?? <ChatPage />}
      </main>

      {/* Right inspector drawer (overlay, slide in from right) */}
      <InspectorDrawer />
    </div>
  );
}
