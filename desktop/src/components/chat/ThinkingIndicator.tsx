import { useState, useEffect } from "react";

type Phase = "thinking" | "routing" | "retrieving" | "generating" | "agent";

interface ThinkingIndicatorProps {
  phase: Phase;
  model?: string | null;
}

const PHRASES: Record<Phase, (model?: string | null) => string[]> = {
  thinking: () => [
    "Thinking…",
    "Reading the request…",
    "Analysing your query…",
    "Processing…",
  ],
  routing: (model) => [
    "Checking the route…",
    model ? `Consulting ${model}…` : "Selecting a model…",
    "Classifying intent…",
  ],
  retrieving: () => [
    "Retrieving context…",
    "Searching document store…",
    "Fetching relevant chunks…",
  ],
  generating: (model) => [
    "Drafting a response…",
    model ? `${model} is composing…` : "Composing…",
    "Writing…",
  ],
  agent: () => [
    "Executing agentic workflow…",
    "Inspecting repository workspace…",
    "Planning & modifying files…",
    "Running verification tests…",
  ],
};

export function ThinkingIndicator({ phase, model }: ThinkingIndicatorProps) {
  const phrases = PHRASES[phase](model);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0); // reset when phase changes
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % phrases.length);
    }, 1700);
    return () => clearInterval(id);
  }, [phase, phrases.length]);

  return (
    <span
      key={`${phase}-${idx}`}
      style={{
        display: "inline-block",
        color: "var(--text-3)",
        fontSize: 13,
        fontStyle: "italic",
        animation: "thinking-pulse 1.8s ease infinite",
        userSelect: "none",
      }}
    >
      {phrases[idx]}
    </span>
  );
}
