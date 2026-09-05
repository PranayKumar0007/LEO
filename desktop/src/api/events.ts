import { SSEEvent } from "../types/backend";

export class SSEParser {
  private buffer = "";

  public feed(chunk: string): SSEEvent[] {
    this.buffer += chunk;
    const events: SSEEvent[] = [];

    // Split on double newlines that delimit SSE messages
    const parts = this.buffer.split("\n\n");
    // The last part might be incomplete, keep it in the buffer
    this.buffer = parts.pop() || "";

    for (const raw of parts) {
      if (!raw.trim()) continue;
      const parsed = this.parseBlock(raw);
      if (parsed) {
        events.push(parsed);
      }
    }

    return events;
  }

  public flush(): SSEEvent[] {
    if (!this.buffer.trim()) return [];
    const parsed = this.parseBlock(this.buffer);
    this.buffer = "";
    return parsed ? [parsed] : [];
  }

  private parseBlock(raw: string): SSEEvent | null {
    const lines = raw.split("\n");
    let eventType = "";
    let dataStr = "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("event:")) {
        eventType = trimmed.slice(6).trim();
      } else if (trimmed.startsWith("data:")) {
        dataStr = trimmed.slice(5).trim();
      }
    }

    if (!eventType || !dataStr) return null;

    try {
      const data = JSON.parse(dataStr);
      return {
        type: eventType,
        data,
      } as SSEEvent;
    } catch (err) {
      console.warn("[SSEParser] Failed to parse SSE data as JSON:", dataStr, err);
      return null;
    }
  }
}
