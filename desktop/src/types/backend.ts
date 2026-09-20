export type Domain = "general" | "code" | "math" | "medical";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  document_ids?: string[];
  top_k?: number | null;
}

export interface RouteDecision {
  domain: Domain;
  confidence: number;
  rationale: string;
  needs_retrieval: boolean;
}

export interface ModelConfig {
  domain: Domain;
  model: string;
  temperature: number;
  system_prompt: string;
}

export interface RetrievedChunkMetadata {
  document_id: string;
  filename: string;
  page?: number | null;
  section?: string | null;
  chunk: number;
  [key: string]: unknown;
}

export interface RetrievedChunk {
  text: string;
  score: number;
  metadata: RetrievedChunkMetadata;
}

export interface UploadedDocument {
  document_id: string;
  filename: string;
  chunks_indexed: number;
  uploaded_at?: string;
  size_bytes?: number;
}

export interface HealthResponse {
  status: string;
  router_model: string;
  qdrant_collection: string;
}

export type SSEEvent =
  | { type: "route"; data: RouteDecision }
  | { type: "retrieval"; data: { chunks: RetrievedChunk[] } }
  | { type: "warning"; data: { message: string } }
  | { type: "model"; data: ModelConfig }
  | { type: "token"; data: { text: string } }
  | { type: "error"; data: { message: string } }
  | { type: "done"; data: Record<string, never> }
  | { type: "repository_context"; data: any }
  | { type: "plan_created"; data: any }
  | { type: "todo_updated"; data: any }
  | { type: "file_written"; data: any }
  | { type: "command_finished"; data: any }
  | { type: "verification_result"; data: any }
  | { type: "agent_finished"; data: any }
  | { type: "agent_error"; data: any };
