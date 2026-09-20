import { create } from "zustand";
import type { Conversation, Message } from "../types/chat";
import type { ModelConfig, RetrievedChunk, RouteDecision } from "../types/backend";
import { streamChat as defaultStreamChat } from "../api/chat";
import { streamAgent } from "../api/agent";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export type { Message };

type StreamFn = typeof defaultStreamChat;
type OnCtrlFn = (ctrl: AbortController) => void;

interface ChatState {
  // Persistence
  conversations: Conversation[];
  activeConversationId: string | null;

  // Streaming / active-request state
  isStreaming: boolean;
  streamPhase: "thinking" | "routing" | "retrieving" | "generating" | "agent" | null;
  abortController: AbortController | null;
  currentRoute: string | null;           // domain string for InspectorDrawer
  activeModel: string | null;            // model name string
  retrievedChunks: RetrievedChunk[];
  error: string | null;

  // ── Reactive flat list of messages in the active conversation ──
  messages: Message[];

  // ── Actions ───────────────────────────────────────────────
  sendMessage: (
    content: string,
    streamFn?: StreamFn,
    onCtrl?: OnCtrlFn,
    documentIds?: string[]
  ) => Promise<void>;

  sendAgentMessage: (
    content: string,
    workspacePath: string,
    projectInfo?: { id: string; name: string },
    onCtrl?: OnCtrlFn
  ) => Promise<void>;

  stopStreaming: () => void;
  clearConversation: () => void;

  // multi-conversation management
  createNewConversation: (projectId?: string | null, projectName?: string | null) => string;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  clearConversations: () => void;
  getActiveConversation: () => Conversation | undefined;
}

// ─────────────────────────────────────────────
// Persistence helpers
// ─────────────────────────────────────────────
const STORAGE_KEY = "leo_chat_conversations";

function load(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

function save(convs: Conversation[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(convs)); }
  catch (e) { console.error("Failed to persist conversations", e); }
}

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────
export const useChatStore = create<ChatState>((set, get) => {
  const initialConvs = load();
  const defaultId = initialConvs[0]?.id ?? null;
  const initialMessages = initialConvs[0]?.messages ?? [];

  const getActiveConversation = () => {
    const { conversations, activeConversationId } = get();
    return conversations.find((c) => c.id === activeConversationId);
  };

  return {
    conversations: initialConvs,
    activeConversationId: defaultId,
    messages: initialMessages,
    isStreaming: false,
    streamPhase: null,
    abortController: null,
    currentRoute: null,
    activeModel: null,
    retrievedChunks: [],
    error: null,

    getActiveConversation,

    createNewConversation: (projectId, projectName) => {
      const newId = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newConv: Conversation = {
        id: newId,
        title: "New Chat",
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        projectId: projectId ?? null,
        projectName: projectName ?? null,
      };
      set((s) => {
        const next = [newConv, ...s.conversations];
        save(next);
        return {
          conversations: next,
          activeConversationId: newId,
          messages: [],
          currentRoute: null,
          activeModel: null,
          retrievedChunks: [],
          error: null,
        };
      });
      return newId;
    },

    selectConversation: (id) => {
      const conv = get().conversations.find((c) => c.id === id);
      const last = [...(conv?.messages ?? [])].reverse().find((m) => m.role === "assistant");
      set({
        activeConversationId: id,
        messages: conv?.messages ?? [],
        currentRoute: last?.route?.domain ?? null,
        activeModel: last?.model?.model ?? null,
        retrievedChunks: last?.retrievedChunks ?? [],
        error: null,
      });
    },

    deleteConversation: (id) => {
      set((s) => {
        const next = s.conversations.filter((c) => c.id !== id);
        save(next);
        const nextActive = s.activeConversationId === id ? (next[0]?.id ?? null) : s.activeConversationId;
        const nextConv = next.find((c) => c.id === nextActive);
        return {
          conversations: next,
          activeConversationId: nextActive,
          messages: nextConv?.messages ?? [],
        };
      });
    },

    clearConversations: () => {
      save([]);
      set({
        conversations: [],
        activeConversationId: null,
        messages: [],
        currentRoute: null,
        activeModel: null,
        retrievedChunks: [],
        error: null,
      });
    },

    clearConversation: () => {
      set((s) => {
        const next = s.conversations.map((c) =>
          c.id === s.activeConversationId ? { ...c, messages: [], updatedAt: Date.now() } : c
        );
        save(next);
        return {
          conversations: next,
          messages: [],
          currentRoute: null,
          activeModel: null,
          retrievedChunks: [],
          error: null,
        };
      });
    },

    stopStreaming: () => {
      get().abortController?.abort();
      set((s) => {
        const next = s.conversations.map((c) => {
          if (c.id !== s.activeConversationId) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.isStreaming ? { ...m, isStreaming: false } : m
            ),
          };
        });
        save(next);
        const active = next.find((c) => c.id === s.activeConversationId);
        return {
          conversations: next,
          messages: active?.messages ?? [],
          isStreaming: false,
          abortController: null,
        };
      });
    },

    sendMessage: async (content, streamFn, onCtrl, documentIds = []) => {
      const chatFn = streamFn ?? defaultStreamChat;

      let convId = get().activeConversationId;
      if (!convId) convId = get().createNewConversation();

      const userMsgId = `msg-u-${Date.now()}`;
      const asstMsgId = `msg-a-${Date.now() + 1}`;

      const userMsg: Message = { id: userMsgId, role: "user", content, timestamp: Date.now() };
      const asstMsg: Message = { id: asstMsgId, role: "assistant", content: "", timestamp: Date.now(), isStreaming: true };

      set((s) => {
        const next = s.conversations.map((c) => {
          if (c.id !== convId) return c;
          const isFirst = c.messages.length === 0;
          return {
            ...c,
            title: isFirst ? content.slice(0, 40) : c.title,
            messages: [...c.messages, userMsg, asstMsg],
            updatedAt: Date.now(),
          };
        });
        save(next);
        const active = next.find((c) => c.id === convId);
        return {
          conversations: next,
          messages: active?.messages ?? [],
          isStreaming: true,
          streamPhase: "thinking",
          currentRoute: null,
          activeModel: null,
          retrievedChunks: [],
          error: null,
        };
      });

      const currentConv = get().conversations.find((c) => c.id === convId);
      const history = (currentConv?.messages ?? [])
        .filter((m) => m.id !== userMsgId && m.id !== asstMsgId)
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }));

      const controller = new AbortController();
      set({ abortController: controller });
      onCtrl?.(controller);

      let text = "";
      let route: RouteDecision | undefined;
      let model: ModelConfig | undefined;
      const chunks: RetrievedChunk[] = [];

      const updateAsst = (extra: Partial<Message> = {}) => {
        set((s) => {
          const next = s.conversations.map((c) => {
            if (c.id !== convId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id !== asstMsgId
                  ? m
                  : {
                      ...m,
                      content: text,
                      route,
                      model,
                      retrievedChunks: chunks.length ? [...chunks] : undefined,
                      ...extra,
                    }
              ),
            };
          });
          const active = next.find((c) => c.id === convId);
          return {
            conversations: next,
            messages: active?.messages ?? [],
          };
        });
      };

      await chatFn({
        request: { message: content, history, document_ids: documentIds },
        signal: controller.signal,

        onEvent: (event) => {
          if (event.type === "route") {
            route = event.data;
            set({ currentRoute: event.data.domain, streamPhase: "routing" });
            updateAsst();
          } else if (event.type === "retrieval") {
            chunks.push(...event.data.chunks);
            set({ retrievedChunks: [...chunks], streamPhase: "retrieving" });
            updateAsst();
          } else if (event.type === "model") {
            model = event.data;
            set({ activeModel: event.data.model, streamPhase: "generating" });
            updateAsst();
          } else if (event.type === "token") {
            if (text === "") set({ streamPhase: "generating" });
            text += event.data.text;
            updateAsst();
          } else if (event.type === "error") {
            set({ error: event.data.message });
          }
        },

        onError: (err) => {
          set((s) => {
            const next = s.conversations.map((c) => {
              if (c.id !== convId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id !== asstMsgId ? m : { ...m, isStreaming: false, error: err.message }
                ),
              };
            });
            save(next);
            const active = next.find((c) => c.id === convId);
            return {
              conversations: next,
              messages: active?.messages ?? [],
              isStreaming: false,
              streamPhase: null,
              abortController: null,
              error: err.message,
            };
          });
        },

        onDone: () => {
          set((s) => {
            const next = s.conversations.map((c) => {
              if (c.id !== convId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id !== asstMsgId
                    ? m
                    : {
                        ...m,
                        content: text,
                        route,
                        model,
                        retrievedChunks: chunks.length ? [...chunks] : undefined,
                        isStreaming: false,
                      }
                ),
              };
            });
            save(next);
            const active = next.find((c) => c.id === convId);
            return {
              conversations: next,
              messages: active?.messages ?? [],
              isStreaming: false,
              streamPhase: null,
              abortController: null,
            };
          });
        },
      });
    },

    sendAgentMessage: async (content, workspacePath, projectInfo, onCtrl) => {
      let convId = get().activeConversationId;
      if (!convId) convId = get().createNewConversation(projectInfo?.id, projectInfo?.name);

      const userMsgId = `msg-u-${Date.now()}`;
      const asstMsgId = `msg-a-${Date.now() + 1}`;

      const userMsg: Message = { id: userMsgId, role: "user", content, timestamp: Date.now() };
      const asstMsg: Message = { id: asstMsgId, role: "assistant", content: "", timestamp: Date.now(), isStreaming: true };

      set((s) => {
        const next = s.conversations.map((c) => {
          if (c.id !== convId) return c;
          const isFirst = c.messages.length === 0;
          return {
            ...c,
            title: isFirst ? content.slice(0, 40) : c.title,
            messages: [...c.messages, userMsg, asstMsg],
            updatedAt: Date.now(),
          };
        });
        save(next);
        const active = next.find((c) => c.id === convId);
        return {
          conversations: next,
          messages: active?.messages ?? [],
          isStreaming: true,
          streamPhase: "agent",
          currentRoute: "code",
          activeModel: "qwen2.5-coder:3b",
          retrievedChunks: [],
          error: null,
        };
      });

      const controller = new AbortController();
      set({ abortController: controller });
      onCtrl?.(controller);

      let text = `📂 **Workspace**: \`${workspacePath}\`\n🎯 **Goal**: ${content}\n\n`;

      const updateAsst = () => {
        set((s) => {
          const next = s.conversations.map((c) => {
            if (c.id !== convId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id !== asstMsgId ? m : { ...m, content: text }
              ),
            };
          });
          const active = next.find((c) => c.id === convId);
          return {
            conversations: next,
            messages: active?.messages ?? [],
          };
        });
      };

      updateAsst();

      await streamAgent({
        workspacePath,
        goal: content,
        signal: controller.signal,
        onEvent: (event) => {
          const type = event.type;
          const data = event.data;

          if (type === "repository_context") {
            text += `🔍 **Discovered Repository**:\n`;
            if (data.project_name) text += `- Project: \`${data.project_name}\`\n`;
            if (data.tech_stack?.length) text += `- Tech Stack: ${data.tech_stack.join(", ")}\n`;
            if (data.languages?.length) text += `- Languages: ${data.languages.join(", ")}\n`;
            text += `\n`;
            updateAsst();
          } else if (type === "plan_created") {
            text += `📋 **Implementation Plan**:\n`;
            if (Array.isArray(data.plan)) {
              data.plan.forEach((item: any) => {
                text += `- [ ] **Task ${item.step_number}**: ${item.title} - *${item.description}*\n`;
              });
            }
            text += `\n`;
            updateAsst();
          } else if (type === "todo_updated") {
            if (data.current_task) {
              text += `⚡ **Working on**: ${data.current_task.title}\n`;
              updateAsst();
            }
          } else if (type === "file_written") {
            if (data.path) {
              text += `✏️ Modified file: \`${data.path}\` (${data.bytes_written || 0} bytes)\n`;
              updateAsst();
            }
          } else if (type === "command_finished") {
            if (data.command) {
              text += `💻 Command: \`${data.command}\` (exit code: ${data.exit_code})\n`;
              updateAsst();
            }
          } else if (type === "verification_result") {
            text += `\n🧪 **Verification**: ${data.details}\n\n`;
            updateAsst();
          } else if (type === "agent_answer_start") {
            text += `---\n\n💡 **LEO Agent Response**:\n\n`;
            updateAsst();
          } else if (type === "agent_answer_token") {
            text += data.token || "";
            updateAsst();
          } else if (type === "agent_finished") {
            text += `\n\n✅ **Agentic Task Completed** (${data.iterations} iterations completed).\n`;
            updateAsst();
          } else if (type === "agent_error") {
            text += `\n⚠️ **Error**: ${data.error}\n`;
            updateAsst();
          }
        },
        onError: (err) => {
          set((s) => {
            const next = s.conversations.map((c) => {
              if (c.id !== convId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id !== asstMsgId ? m : { ...m, isStreaming: false, error: err.message }
                ),
              };
            });
            save(next);
            const active = next.find((c) => c.id === convId);
            return {
              conversations: next,
              messages: active?.messages ?? [],
              isStreaming: false,
              streamPhase: null,
              abortController: null,
              error: err.message,
            };
          });
        },
        onDone: () => {
          set((s) => {
            const next = s.conversations.map((c) => {
              if (c.id !== convId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id !== asstMsgId ? m : { ...m, isStreaming: false }
                ),
              };
            });
            save(next);
            const active = next.find((c) => c.id === convId);
            return {
              conversations: next,
              messages: active?.messages ?? [],
              isStreaming: false,
              streamPhase: null,
              abortController: null,
            };
          });
        },
      });
    },
  };
});
