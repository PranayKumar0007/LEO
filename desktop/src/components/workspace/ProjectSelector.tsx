import React, { useState, useRef, useEffect } from "react";
import {
  Folder,
  FolderPlus,
  FolderX,
  Zap,
  Check,
  Settings,
  ChevronDown,
  X,
  FolderOpen,
} from "lucide-react";
import { useWorkspaceStore, ProjectItem } from "../../stores/workspaceStore";

export function ProjectSelector() {
  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjPath, setNewProjPath] = useState("");

  const { projects, activeProject, setActiveProject, addProject } = useWorkspaceStore();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Close dropdown when clicking outside */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelect = (proj: ProjectItem | null) => {
    setActiveProject(proj);
    setOpen(false);
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const firstFile = files[0];
      const relPath = firstFile.webkitRelativePath || "";
      const dirName = relPath.split("/")[0] || firstFile.name || "My Project";
      
      // If running inside desktop wrapper with file.path available, extract base folder path
      let fullPath = "";
      if ((firstFile as any).path) {
        const rawPath: string = (firstFile as any).path;
        const relIdx = rawPath.indexOf(relPath);
        if (relIdx !== -1) {
          fullPath = rawPath.substring(0, relIdx) + dirName;
        } else {
          fullPath = rawPath;
        }
      } else {
        // Fallback default path for browser view
        fullPath = `C:\\Users\\B Yakambram\\OneDrive\\Desktop\\${dirName}`;
      }

      setNewProjName(dirName);
      setNewProjPath(fullPath);
    }
  };

  const triggerFileExplorer = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAddProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim() || !newProjPath.trim()) return;
    addProject(newProjName.trim(), newProjPath.trim());
    setNewProjName("");
    setNewProjPath("");
    setShowAddModal(false);
    setOpen(false);
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative", display: "inline-block" }}>
      {/* Hidden folder input for opening native OS file explorer */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFolderSelect}
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        style={{ display: "none" }}
      />

      {/* Trigger Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderRadius: 8,
          background: open ? "rgba(255,255,255,0.06)" : "transparent",
          border: "1px solid transparent",
          cursor: "pointer",
          color: "var(--text-1)",
          fontSize: 14,
          fontWeight: 600,
          transition: "background 0.12s",
        }}
        onMouseEnter={(e) => {
          if (!open) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
        }}
        onMouseLeave={(e) => {
          if (!open) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }}
      >
        <Folder size={16} style={{ color: activeProject ? "var(--accent)" : "var(--text-3)" }} />
        <span>{activeProject ? activeProject.name : "No Project"}</span>
        <ChevronDown size={14} style={{ color: "var(--text-3)", marginLeft: 2 }} />
      </button>

      {/* Dropdown Menu matching uploaded screenshot */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            width: 260,
            background: "#18181c",
            border: "1px solid var(--border-mid)",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            padding: "6px 0",
            zIndex: 1000,
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Projects List */}
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {projects.length === 0 ? (
              <div style={{ padding: "10px 14px", fontSize: 11, color: "var(--text-3)", fontStyle: "italic" }}>
                No project added yet. Click 'New Project' to add one.
              </div>
            ) : (
              projects.map((proj) => {
                const isSelected = activeProject?.id === proj.id;
                return (
                  <div
                    key={proj.id}
                    onClick={() => handleSelect(proj)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 14px",
                      cursor: "pointer",
                      background: isSelected ? "rgba(255,255,255,0.06)" : "transparent",
                      color: isSelected ? "var(--text-1)" : "var(--text-2)",
                      fontSize: 13,
                      fontWeight: isSelected ? 600 : 400,
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "transparent";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
                      <Folder size={15} style={{ color: isSelected ? "var(--accent)" : "var(--text-3)", flexShrink: 0 }} />
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {proj.name}
                      </span>
                    </div>

                    {isSelected && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-3)" }}>
                        <Settings size={13} style={{ cursor: "pointer" }} />
                        <Check size={14} style={{ color: "var(--text-1)" }} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "var(--border)", margin: "6px 0" }} />

          {/* Action Items */}
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 14px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-2)",
              fontSize: 13,
              textAlign: "left",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <FolderPlus size={15} style={{ color: "var(--text-3)" }} />
            <span>New Project</span>
          </button>

          <button
            onClick={() => {
              const quickProj = addProject("Quick Start", "c:\\Projects\\QuickStart");
              handleSelect(quickProj);
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 14px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-2)",
              fontSize: 13,
              textAlign: "left",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <Zap size={15} style={{ color: "var(--text-3)" }} />
            <span>Quick Start</span>
          </button>

          {/* Divider */}
          <div style={{ height: 1, background: "var(--border)", margin: "6px 0" }} />

          {/* No Project Mode */}
          <button
            onClick={() => handleSelect(null)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 14px",
              background: activeProject === null ? "rgba(255,255,255,0.06)" : "none",
              border: "none",
              cursor: "pointer",
              color: activeProject === null ? "var(--text-1)" : "var(--text-2)",
              fontSize: 13,
              fontWeight: activeProject === null ? 600 : 400,
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              if (activeProject !== null) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            }}
            onMouseLeave={(e) => {
              if (activeProject !== null) e.currentTarget.style.background = "none";
            }}
          >
            <FolderX size={15} style={{ color: "var(--text-3)" }} />
            <span>No Project</span>
            {activeProject === null && <Check size={14} style={{ color: "var(--text-1)", marginLeft: "auto" }} />}
          </button>
        </div>
      )}

      {/* Modal for Adding New Project */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
        >
          <div
            style={{
              width: 440,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-mid)",
              borderRadius: 14,
              padding: 24,
              boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--text-1)" }}>Add New Project</h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* File Explorer Selection Button */}
            <div style={{ marginBottom: 16 }}>
              <button
                type="button"
                onClick={triggerFileExplorer}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "10px 14px",
                  background: "rgba(68,147,248,0.1)",
                  border: "1px dashed var(--accent)",
                  borderRadius: 8,
                  color: "var(--accent)",
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <FolderOpen size={16} />
                <span>Open Folder in File Explorer</span>
              </button>
            </div>

            <form onSubmit={handleAddProjectSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>
                  Project Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. LEO"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "var(--bg-app)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text-1)",
                    fontSize: 13,
                    outline: "none",
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>
                  Project Folder Path
                </label>
                <input
                  type="text"
                  placeholder="e.g. c:\Users\B Yakambram\OneDrive\Desktop\LEO"
                  value={newProjPath}
                  onChange={(e) => setNewProjPath(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "var(--bg-app)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text-1)",
                    fontSize: 13,
                    outline: "none",
                  }}
                  required
                />
                <span style={{ display: "block", fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                  ℹ️ Web browser security masks absolute file paths. Please verify or paste your exact local folder path above.
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: "8px 14px",
                    background: "none",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text-2)",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 16px",
                    background: "var(--accent)",
                    border: "none",
                    borderRadius: 8,
                    color: "var(--accent-fg)",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Add Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
