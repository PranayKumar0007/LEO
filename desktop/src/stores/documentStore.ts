import { create } from "zustand";
import { DocumentItem, DocumentUploadState } from "../types/documents";
import { deleteDocument, listDocuments, uploadDocument } from "../api/documents";

interface DocumentState {
  documents: DocumentItem[];
  uploadState: DocumentUploadState;
  selectedDocIds: string[];

  // Actions
  upload: (file: File) => Promise<void>;
  deleteDoc: (documentId: string) => Promise<void>;
  toggleDocSelection: (documentId: string) => void;
  selectAllDocs: (selected: boolean) => void;
  loadDocuments: () => Promise<void>;
}

const STORAGE_KEY = "leo_documents_list";

function loadSavedDocuments(): DocumentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveDocuments(docs: DocumentItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch (err) {
    console.error("Failed to save documents to localStorage", err);
  }
}

export const useDocumentStore = create<DocumentState>((set) => {
  const initialDocs = loadSavedDocuments();

  return {
    documents: initialDocs,
    uploadState: {
      isUploading: false,
      progress: 0,
    },
    selectedDocIds: initialDocs.map((d) => d.document_id),

    loadDocuments: async () => {
      const remote = await listDocuments();
      if (remote && remote.length > 0) {
        set((state) => {
          // Merge local and remote
          const merged: DocumentItem[] = [...state.documents];
          for (const r of remote) {
            if (!merged.some((m) => m.document_id === r.document_id)) {
              merged.push({ ...r, selectedForChat: true });
            }
          }
          saveDocuments(merged);
          return { documents: merged };
        });
      }
    },

    upload: async (file: File) => {
      set({
        uploadState: {
          isUploading: true,
          progress: 20,
          fileName: file.name,
          error: undefined,
        },
      });

      try {
        set({ uploadState: { isUploading: true, progress: 60, fileName: file.name } });
        const uploaded = await uploadDocument(file);

        const newItem: DocumentItem = {
          ...uploaded,
          selectedForChat: true,
        };

        set((state) => {
          const next = [newItem, ...state.documents.filter((d) => d.document_id !== uploaded.document_id)];
          saveDocuments(next);
          return {
            documents: next,
            selectedDocIds: [...state.selectedDocIds, uploaded.document_id],
            uploadState: {
              isUploading: false,
              progress: 100,
              fileName: file.name,
            },
          };
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        set({
          uploadState: {
            isUploading: false,
            progress: 0,
            error: message,
          },
        });
        throw err;
      }
    },

    deleteDoc: async (documentId: string) => {
      await deleteDocument(documentId);
      set((state) => {
        const next = state.documents.filter((d) => d.document_id !== documentId);
        saveDocuments(next);
        return {
          documents: next,
          selectedDocIds: state.selectedDocIds.filter((id) => id !== documentId),
        };
      });
    },

    toggleDocSelection: (documentId: string) => {
      set((state) => {
        const exists = state.selectedDocIds.includes(documentId);
        const next = exists
          ? state.selectedDocIds.filter((id) => id !== documentId)
          : [...state.selectedDocIds, documentId];
        return { selectedDocIds: next };
      });
    },

    selectAllDocs: (selected: boolean) => {
      set((state) => ({
        selectedDocIds: selected ? state.documents.map((d) => d.document_id) : [],
      }));
    },
  };
});
