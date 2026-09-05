import { UploadedDocument } from "./backend";

export interface DocumentItem extends UploadedDocument {
  selectedForChat?: boolean;
}

export interface DocumentUploadState {
  isUploading: boolean;
  progress: number;
  fileName?: string;
  error?: string;
}
