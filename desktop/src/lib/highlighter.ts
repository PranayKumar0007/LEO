import { createHighlighter, createJavaScriptRegexEngine, type Highlighter } from "shiki";

const SUPPORTED_LANGS = [
  "python",
  "javascript",
  "typescript",
  "java",
  "c",
  "cpp",
  "csharp",
  "go",
  "rust",
  "sql",
  "bash",
  "json",
  "yaml",
  "html",
  "css",
  "markdown",
];

export const DARK_THEME  = "vitesse-dark";
export const LIGHT_THEME = "github-light";

let highlighterPromise: Promise<Highlighter> | null = null;
let cachedHighlighter: Highlighter | null = null;

export function getHighlighter(): Promise<Highlighter> {
  if (cachedHighlighter) {
    return Promise.resolve(cachedHighlighter);
  }

  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [DARK_THEME, LIGHT_THEME],
      langs: SUPPORTED_LANGS,
      engine: createJavaScriptRegexEngine(),
    }).then((h) => {
      cachedHighlighter = h;
      return h;
    });
  }

  return highlighterPromise;
}

export function getShikiTheme(): string {
  return document.documentElement.dataset.theme === "light" ? LIGHT_THEME : DARK_THEME;
}

export function highlightCodeSync(code: string, lang: string): string | null {
  if (!cachedHighlighter) return null;

  const normalizedLang = lang.toLowerCase();
  const langToUse = SUPPORTED_LANGS.includes(normalizedLang) ? normalizedLang : "text";
  const theme = getShikiTheme();

  try {
    return cachedHighlighter.codeToHtml(code, { lang: langToUse, theme });
  } catch (err) {
    console.warn(`[Shiki] Error highlighting ${lang}:`, err);
    return null;
  }
}
