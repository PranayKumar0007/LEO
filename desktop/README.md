# LEO Desktop UI (Tauri 2 + React + TypeScript + Vite)

Local-first desktop application for **LEO: Local On-Premise AI Workbench**, integrated with the FastAPI backend over HTTP and Server-Sent Events (SSE).

## Prerequisites

- **Node.js**: `v22.x` or later (tested on v22.19.0)
- **npm**: `10.x` or later (tested on 10.9.3)
- **Rust & Cargo**: `1.98.x` or later (tested on 1.98.1)
- **Windows Build Tools**: Visual Studio C++ Build Tools & Microsoft Edge WebView2

## Technology Stack

- **Desktop Framework**: Tauri 2
- **UI Framework**: React 19 + TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand (with local persistent storage)
- **Syntax Highlighting**: Shiki (offline JS regex engine, zero external WASM/network calls)
- **Markdown**: react-markdown + remark-gfm
- **Icons**: Lucide React

## Architecture

```text
Tauri 2 (Desktop Shell)
    │
    ▼
React 19 + TypeScript UI (Vite on http://localhost:1420)
    │
    ▼ (HTTP / Server-Sent Events)
FastAPI Backend (http://127.0.0.1:8000)
    │
    ├── Prompt Router (Qwen 2.5 1.5B)
    ├── Route Validator
    ├── Model Registry (Code, Math, Medical, General)
    ├── Ollama Local Inference (http://127.0.0.1:11434)
    └── Qdrant Vector Store (http://127.0.0.1:6333)
```

## Running the Application Locally

### 1. Start the FastAPI Backend

From the repository root (`D:\hackathons\sih2\LEO`):

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Verify backend health at: `http://127.0.0.1:8000/api/health`

### 2. Start the Desktop App

From the `desktop` directory (`D:\hackathons\sih2\LEO\desktop`):

**Development Mode (Browser / Webview Preview):**
```powershell
npm run dev
```
Open: `http://localhost:1420`

**Native Tauri Desktop Mode:**
```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
npm run tauri dev
```

### 3. Production Build

To build the web bundle:
```powershell
npm run build
```

To package the standalone desktop executable:
```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
npm run tauri build
```

## Keyboard Shortcuts

- `Ctrl/Cmd + N`: New Chat
- `Ctrl/Cmd + K`: Focus Message Composer
- `Ctrl/Cmd + Enter`: Send Message
- `Esc`: Stop / Cancel Streaming
- `Ctrl/Cmd + B`: Toggle Sidebar
- `Ctrl/Cmd + I`: Toggle Inspector Panel
