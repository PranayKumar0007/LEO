import { apiClient } from "./client";
import { SSEParser } from "./events";
import { SSEEvent } from "../types/backend";

export interface StreamAgentOptions {
  workspacePath: string;
  goal: string;
  sessionId?: string;
  signal?: AbortSignal;
  onEvent: (event: SSEEvent) => void;
  onError: (error: Error) => void;
  onDone: () => void;
}

export async function streamAgent({
  workspacePath,
  goal,
  sessionId,
  signal,
  onEvent,
  onError,
  onDone,
}: StreamAgentOptions): Promise<void> {
  const url = `${apiClient.getBaseUrl()}/api/agent/run/stream`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspace_path: workspacePath,
        goal,
        session_id: sessionId,
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Agent request failed [${response.status}]: ${errorText || response.statusText}`);
    }

    if (!response.body) {
      throw new Error("Response body is null, SSE stream unavailable");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const parser = new SSEParser();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const events = parser.feed(chunk);

      for (const event of events) {
        onEvent(event);
      }
    }

    const remaining = parser.flush();
    for (const event of remaining) {
      onEvent(event);
    }

    onDone();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      onDone();
      return;
    }

    const error = err instanceof Error ? err : new Error(String(err));
    onError(error);
  }
}
