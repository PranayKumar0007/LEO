import { ModelConfig, RetrievedChunk, RouteDecision } from "./backend";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  route?: RouteDecision;
  model?: ModelConfig;
  retrievedChunks?: RetrievedChunk[];
  warnings?: string[];
  error?: string;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  projectId?: string | null;
  projectName?: string | null;
}
