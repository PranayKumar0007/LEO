import React, { useState, useRef, useEffect } from "react";
import {
  Paperclip, FileText, Trash2, CheckSquare, Square,
  RefreshCw, AlertCircle,
} from "lucide-react";
import { useDocumentStore } from "../../stores/documentStore";

interface Props {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export function AttachMenu({ open, onClose, anchorRef }: Props) {
  const {
    documents, uploadState, selectedDocIds,
    upload, deleteDoc, toggleDocSelection, loadDocuments,
  } = useDocumentStore();

  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Load documents when menu opens
  useEffect(() => {
    if (open) {
      loadDocuments();
    }
  }, [open, loadDocuments]);

  if (!open) return null;

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);
    try {
      for (let i = 0; i < fileList.length; i++) {
        await upload(fileList[i]);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const hasDocuments = documents.length > 0;

  return (
    <div
      ref={menuRef}
      style={{
        position: "absolute",
        bottom: "calc(100% + 8px)",
        left: 0,
        zIndex: 60,
        width: 280,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-mid)",
        borderRadius: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: "6px",
      }}
    >
      {/* ── Primary action: Add files or photos ── */}
      <MenuRow
        icon={<Paperclip size={16} strokeWidth={1.75} />}
        label="Add files or photos"
        shortcut="Ctrl U"
        loading={uploadState.isUploading}
        loadingLabel={`Uploading ${uploadState.fileName || "file"}…`}
        onClick={() => fileInputRef.current?.click()}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        style={{ display: "none" }}
      />

      {/* ── Error ── */}
      {(errorMessage || uploadState.error) && (
        <div style={{
          padding: "6px 12px",
          margin: "2px 0",
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 11, color: "var(--status-err)",
          borderRadius: 8,
          background: "rgba(239,68,68,0.06)",
        }}>
          <AlertCircle size={12} style={{ flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {errorMessage || uploadState.error}
          </span>
        </div>
      )}

      {/* ── Upload progress ── */}
      {uploadState.isUploading && (
        <div style={{
          padding: "6px 12px",
          margin: "2px 0",
          display: "flex", alignItems: "center", gap: 8,
          fontSize: 11, color: "var(--accent)",
          borderRadius: 8,
          background: "var(--accent-dim)",
        }}>
          <RefreshCw size={12} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
          <span>Ingesting & embedding into vector store…</span>
        </div>
      )}

      {/* ── Uploaded documents section (only shown when docs exist) ── */}
      {hasDocuments && (
        <>
          <div style={{
            height: 1,
            background: "var(--border)",
            margin: "4px 8px",
          }} />

          <div style={{
            padding: "6px 12px 2px",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--text-3)",
          }}>
            Uploaded ({documents.length})
          </div>

          <div style={{
            maxHeight: 180,
            overflowY: "auto",
            padding: "2px 0",
          }}>
            {documents.map((doc) => {
              const isSelected = selectedDocIds.includes(doc.document_id);
              return (
                <DocRow
                  key={doc.document_id}
                  filename={doc.filename}
                  chunks={doc.chunks_indexed}
                  isSelected={isSelected}
                  onToggle={() => toggleDocSelection(doc.document_id)}
                  onDelete={() => deleteDoc(doc.document_id)}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Menu action row (ChatGPT / Claude style) ── */
function MenuRow({
  icon,
  label,
  shortcut,
  loading,
  loadingLabel,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  loading?: boolean;
  loadingLabel?: string;
  onClick: () => void;
}) {
  const [hov, setHov] = useState(false);

  return (
    <button
      onClick={loading ? undefined : onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      disabled={loading}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 10,
        background: hov && !loading ? "rgba(255,255,255,0.05)" : "transparent",
        border: "none",
        cursor: loading ? "default" : "pointer",
        color: loading ? "var(--text-3)" : "var(--text-1)",
        fontSize: 13,
        fontWeight: 400,
        transition: "background 0.1s",
        textAlign: "left",
        opacity: loading ? 0.6 : 1,
      }}
    >
      <span style={{ display: "flex", flexShrink: 0, color: loading ? "var(--accent)" : "var(--text-2)" }}>
        {loading ? <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> : icon}
      </span>
      <span style={{ flex: 1 }}>
        {loading ? loadingLabel : label}
      </span>
      {shortcut && !loading && (
        <span style={{
          fontSize: 11,
          color: "var(--text-3)",
          fontFamily: "monospace",
          letterSpacing: "0.02em",
        }}>
          {shortcut}
        </span>
      )}
    </button>
  );
}

/* ── Single document row ── */
function DocRow({
  filename, chunks, isSelected, onToggle, onDelete,
}: {
  filename: string;
  chunks: number;
  isSelected: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [hov, setHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 8px",
        margin: "0 4px",
        borderRadius: 8,
        background: hov ? "rgba(255,255,255,0.03)" : "transparent",
        transition: "background 0.1s",
        cursor: "default",
      }}
    >
      {/* Selection toggle */}
      <button
        onClick={onToggle}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: isSelected ? "var(--accent)" : "var(--text-3)",
          padding: 0, display: "flex", flexShrink: 0,
        }}
      >
        {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
      </button>

      {/* Icon */}
      <FileText size={13} strokeWidth={1.5} style={{ color: "var(--badge-code)", flexShrink: 0 }} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, color: "var(--text-1)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {filename}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-3)" }}>
          {chunks} chunks indexed
        </div>
      </div>

      {/* Delete */}
      {hov && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Remove document"
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-3)", padding: 2, display: "flex",
            flexShrink: 0, borderRadius: 4, transition: "color 0.1s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.color = "var(--status-err)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)")
          }
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}
