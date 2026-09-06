import { useState } from "react";
import { FileText, X } from "lucide-react";
import type { DocumentItem } from "../../types/documents";

interface Props {
  document: DocumentItem;
  onDismiss: (documentId: string) => void;
}

export function AttachmentChip({ document, onDismiss }: Props) {
  const [hov, setHov] = useState(false);

  const sizeLabel = document.size_bytes
    ? document.size_bytes < 1024 * 1024
      ? `${(document.size_bytes / 1024).toFixed(0)} KB`
      : `${(document.size_bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${document.chunks_indexed} chunks`;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px 4px 6px",
        background: "var(--bg-elevated)",
        border: `1px solid ${hov ? "var(--border-mid)" : "var(--border)"}`,
        borderRadius: 8,
        fontSize: 11,
        color: "var(--text-2)",
        maxWidth: 200,
        transition: "border-color 0.12s",
      }}
    >
      <FileText size={12} strokeWidth={1.75} style={{ color: "var(--badge-code)", flexShrink: 0 }} />
      <span style={{
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        minWidth: 0,
      }}>
        {document.filename}
      </span>
      <span style={{ color: "var(--text-3)", fontSize: 10, flexShrink: 0 }}>
        {sizeLabel}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(document.document_id);
        }}
        title="Remove attachment"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-3)",
          padding: 0,
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          transition: "color 0.1s",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-1)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)")
        }
      >
        <X size={12} />
      </button>
    </div>
  );
}
