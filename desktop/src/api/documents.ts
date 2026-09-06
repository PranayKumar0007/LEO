import { apiClient } from "./client";
import { UploadedDocument } from "../types/backend";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export async function uploadDocument(file: File): Promise<UploadedDocument> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File exceeds maximum size of 50 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
  }

  const allowedExtensions = [".pdf", ".docx", ".txt", ".md", ".csv"];
  const fileName = file.name.toLowerCase();
  const hasAllowedExt = allowedExtensions.some((ext) => fileName.endsWith(ext));
  if (!hasAllowedExt) {
    throw new Error("Supported file types: PDF, DOCX, TXT, MD, CSV");
  }

  const formData = new FormData();
  formData.append("file", file);

  const url = `${apiClient.getBaseUrl()}/api/documents`;
  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Document upload failed [${response.status}]: ${errorText || response.statusText}`);
  }

  const data = (await response.json()) as UploadedDocument;
  return {
    ...data,
    size_bytes: file.size,
    uploaded_at: new Date().toISOString(),
  };
}

export async function listDocuments(): Promise<UploadedDocument[] | null> {
  const url = `${apiClient.getBaseUrl()}/api/documents`;
  try {
    const response = await fetch(url, { method: "GET" });
    if (response.status === 404 || response.status === 405) {
      // Backend does not expose a list documents endpoint
      return null;
    }
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as UploadedDocument[];
  } catch {
    return null;
  }
}

export async function deleteDocument(documentId: string): Promise<boolean> {
  const url = `${apiClient.getBaseUrl()}/api/documents/${encodeURIComponent(documentId)}`;
  try {
    const response = await fetch(url, { method: "DELETE" });
    return response.ok;
  } catch {
    return false;
  }
}
