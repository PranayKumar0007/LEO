import React, { useRef, useState } from "react";
import { useDocumentStore } from "../stores/documentStore";
import {
  UploadCloud, FileText, Trash2, AlertCircle, File,
  CheckSquare, Square, RefreshCw,
} from "lucide-react";

export const DocumentsPage: React.FC = () => {
  const {
    documents, uploadState, selectedDocIds,
    upload, deleteDoc, toggleDocSelection, selectAllDocs, loadDocuments,
  } = useDocumentStore();

  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);
    try {
      await upload(fileList[0]);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-app)", overflowY: "auto", padding: 24 }}>
      <div style={{ maxWidth: 760, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-1)", display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
              <FileText size={18} strokeWidth={1.75} style={{ color: "var(--badge-code)" }} />
              Document Knowledge Base
            </h1>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4, marginBottom: 0 }}>
              Ingest local documents into Qdrant vector store. Ground your chat queries with source citations.
            </p>
          </div>
          <button
            onClick={() => loadDocuments()}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 12px", borderRadius: 8,
              background: "var(--bg-elevated)", border: "1px solid var(--border-mid)",
              color: "var(--text-2)", fontSize: 12, cursor: "pointer",
            }}
          >
            <RefreshCw size={13} />
            Sync
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border-mid)"}`,
            borderRadius: 12,
            padding: "32px 24px",
            textAlign: "center",
            cursor: "pointer",
            background: dragOver ? "var(--accent-dim)" : "var(--bg-surface)",
            transition: "border-color 0.15s, background 0.15s",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.csv"
            onChange={(e) => handleFiles(e.target.files)}
            style={{ display: "none" }}
          />
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "var(--accent-dim)", display: "flex",
            alignItems: "center", justifyContent: "center", margin: "0 auto 12px",
          }}>
            <UploadCloud size={22} style={{ color: "var(--accent)" }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", marginBottom: 4 }}>
            Click to upload or drag and drop
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", maxWidth: 360, margin: "0 auto" }}>
            Supports PDF, DOCX, TXT, MD, CSV. Extracted and embedded locally into Qdrant.
          </div>
        </div>

        {/* Upload status */}
        {uploadState.isUploading && (
          <div style={{
            padding: "10px 14px", borderRadius: 8,
            background: "var(--accent-dim)", border: "1px solid rgba(139,92,246,0.25)",
            display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--accent)",
          }}>
            <RefreshCw size={14} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
            <span><strong>Ingesting:</strong> {uploadState.fileName}… Extracting text and indexing chunks into Qdrant.</span>
          </div>
        )}

        {(errorMessage || uploadState.error) && (
          <div style={{
            padding: "10px 14px", borderRadius: 8,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--status-err)",
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            {errorMessage || uploadState.error}
          </div>
        )}

        {/* Document table */}
        <div style={{ borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden", background: "var(--bg-surface)" }}>
          <div style={{
            padding: "10px 14px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12,
          }}>
            <span style={{ fontWeight: 600, color: "var(--text-1)" }}>
              Ingested Documents ({documents.length})
            </span>
            {documents.length > 0 && (
              <button
                onClick={() => selectAllDocs(selectedDocIds.length !== documents.length)}
                style={{
                  display: "flex", alignItems: "center", gap: 5, fontSize: 12,
                  color: "var(--text-3)", background: "none", border: "none", cursor: "pointer",
                }}
              >
                {selectedDocIds.length === documents.length
                  ? <><CheckSquare size={13} style={{ color: "var(--accent)" }} /><span>Deselect All</span></>
                  : <><Square size={13} /><span>Select All for Grounding</span></>
                }
              </button>
            )}
          </div>

          {documents.length === 0 ? (
            <div style={{ padding: "32px 24px", textAlign: "center" }}>
              <File size={28} style={{ color: "var(--text-3)", margin: "0 auto 8px", display: "block", opacity: 0.4 }} />
              <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>
                No documents uploaded yet. Upload PDFs or text files to enable grounded RAG chat.
              </p>
            </div>
          ) : (
            <div>
              {documents.map((doc) => {
                const isSelected = selectedDocIds.includes(doc.document_id);
                return (
                  <div
                    key={doc.document_id}
                    style={{
                      padding: "10px 14px", display: "flex",
                      alignItems: "center", justifyContent: "space-between",
                      borderBottom: "1px solid var(--border)",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "var(--bg-elevated)"}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <button
                        onClick={() => toggleDocSelection(doc.document_id)}
                        style={{ color: isSelected ? "var(--accent)" : "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
                      >
                        {isSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                      </button>
                      <div style={{
                        width: 30, height: 30, borderRadius: 7,
                        background: "var(--bg-elevated)", display: "flex",
                        alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <FileText size={14} style={{ color: "var(--badge-code)" }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {doc.filename}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                          <span style={{ color: "var(--badge-medical)", fontFamily: "monospace" }}>{doc.chunks_indexed} chunks</span>
                          <span>·</span>
                          <span style={{ fontFamily: "monospace" }}>ID: {doc.document_id.slice(0, 8)}…</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteDoc(doc.document_id)}
                      style={{
                        padding: "5px", borderRadius: 6, background: "none", border: "none",
                        color: "var(--text-3)", cursor: "pointer", display: "flex", alignItems: "center",
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--status-err)"}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)"}
                      title="Remove Document"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
