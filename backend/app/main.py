import asyncio
import json
from functools import lru_cache
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

# Helper for Server‑Sent Events (SSE) responses
def _sse(event_type: str, data: dict) -> str:
    """Serialize an event for SSE streaming.

    Returns a string formatted as required by the `text/event-stream` media type.
    """
    payload = json.dumps(data)
    return f"event: {event_type}\n" + f"data: {payload}\n\n"

from backend.app.config import get_settings
from backend.app.llm.registry import get_model_for_domain
from backend.app.models import ChatMessage, ChatRequest, RetrievedChunk


settings = get_settings()
app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:1420",
        "http://localhost:1420",
        "tauri://localhost",
        "http://tauri.localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@lru_cache
def get_document_store():
    from backend.app.rag.store import DocumentStore

    return DocumentStore()


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(Path(__file__).resolve().parents[2] / "index.html")


@app.get("/api/health")
async def health() -> dict:
    return {
        "status": "ok",
        "router_model": settings.router_model,
        "qdrant_collection": settings.qdrant_collection,
    }


@app.post("/api/documents")
async def upload_document(file: UploadFile = File(...)) -> dict:
    suffix = Path(file.filename or "").suffix.lower()
    allowed_types = {".pdf", ".docx", ".txt", ".md", ".csv", ".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp"}
    if suffix not in allowed_types:
        raise HTTPException(status_code=400, detail="Supported file types: PDF, DOCX, TXT, MD, CSV, PNG, JPG, JPEG, BMP, TIFF, WEBP")

    uploads_dir = settings.data_dir / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    safe_name = Path(file.filename or f"upload{suffix}").name
    target = uploads_dir / f"{uuid4()}-{safe_name}"

    bytes_written = 0
    with target.open("wb") as output:
        while chunk := await file.read(1024 * 1024):
            bytes_written += len(chunk)
            if bytes_written > settings.max_upload_mb * 1024 * 1024:
                target.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail=f"Upload limit is {settings.max_upload_mb} MB")
            output.write(chunk)

    try:
        document = get_document_store().ingest(target, safe_name)
    except Exception as exc:
        err_msg = str(exc)
        if "10061" in err_msg or "Connection refused" in err_msg or "actively refused" in err_msg:
            detail = (
                "Document ingestion failed: Could not connect to local vector store (Qdrant on port 6333) "
                "or embedding service (Ollama on port 11434). Please ensure Qdrant ('docker compose up -d') "
                "and Ollama are running."
            )
        else:
            detail = f"Document ingestion failed: {exc}"
        raise HTTPException(status_code=500, detail=detail) from exc


    return document.model_dump()


@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest) -> StreamingResponse:
    async def events():
        from backend.app.llm.ollama import OllamaClient
        from backend.app.router import PromptRouter

        from backend.app.route_validator import RouteValidator

        router = PromptRouter()
        validator = RouteValidator()
        llm = OllamaClient()

        decision = await router.route(request.message, has_documents=bool(request.document_ids))
        decision = validator.validate(decision, request.message)
        yield _sse("route", decision.model_dump())

        chunks: list[RetrievedChunk] = []
        if decision.needs_retrieval or request.document_ids:
            try:
                chunks = get_document_store().search(
                    request.message,
                    document_ids=request.document_ids,
                    top_k=request.top_k,
                )
                yield _sse("retrieval", {"chunks": [chunk.model_dump() for chunk in chunks]})
            except Exception as exc:
                yield _sse("warning", {"message": f"Retrieval skipped: {exc}"})

        model_config = get_model_for_domain(decision.domain)
        yield _sse("model", model_config.model_dump())

        messages = _build_messages(request, model_config.system_prompt, chunks)
        try:
            async for token in llm.stream_chat(
                model=model_config.model,
                messages=messages,
                temperature=model_config.temperature,
            ):
                yield _sse("token", {"text": token})
        except Exception as exc:
            yield _sse("error", {"message": f"Generation failed: {exc}"})
        yield _sse("done", {})

    return StreamingResponse(events(), media_type="text/event-stream")


def _build_messages(request: ChatRequest, system_prompt: str, chunks: list[RetrievedChunk]) -> list[ChatMessage]:
    context = _format_context(chunks)
    messages = [
        ChatMessage(
            role="system",
            content=(
                f"{system_prompt}\n\n"
                "This system is self-hosted and air-gapped. Do not claim to use external services. "
                "If the answer uses retrieved context, include citations next to the relevant claims."
            ),
        )
    ]
    messages.extend(request.history[-12:])
    user_content = request.message
    if context:
        user_content = f"Retrieved local context:\n{context}\n\nUser request:\n{request.message}"
    messages.append(ChatMessage(role="user", content=user_content))
    return messages


def _format_context(chunks: list[RetrievedChunk]) -> str:
    lines = []
    for chunk in chunks:
        meta = chunk.metadata
        citation = f"{meta.get('filename')} p.{meta.get('page') or 'n/a'} chunk {meta.get('chunk')}"
        if meta.get("section"):
            citation += f" section {meta['section']}"
        lines.append(f"[{citation}]\n{chunk.text}")
    return "\n\n".join(lines)


from backend.app.models import AgentRunRequest, ChatMessage, ChatRequest, RetrievedChunk


@app.post("/api/agent/start")
async def start_agent(request: AgentRunRequest) -> dict:
    from uuid import uuid4
    from core.agent import CodingAgent

    session_id = request.session_id or str(uuid4())
    try:
        agent = CodingAgent(workspace_path=request.workspace_path, goal=request.goal, session_id=session_id)
        state = await agent.run()
        return {
            "session_id": session_id,
            "workspace_id": state.workspace_id,
            "status": state.status,
            "iterations": state.iteration,
            "files_changed": state.files_changed,
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Agent execution error: {exc}") from exc


@app.post("/api/agent/run/stream")
async def run_agent_stream(request: AgentRunRequest) -> StreamingResponse:
    from uuid import uuid4
    from core.agent import CodingAgent

    session_id = request.session_id or str(uuid4())

    async def events():
        events_queue: list[tuple[str, dict]] = []

        def event_cb(event_type: str, data: dict):
            events_queue.append((event_type, data))

        try:
            agent = CodingAgent(
                workspace_path=request.workspace_path,
                goal=request.goal,
                session_id=session_id,
                event_callback=event_cb,
            )

            agent_task = asyncio.create_task(agent.run())

            while not agent_task.done() or events_queue:
                while events_queue:
                    ev_type, ev_data = events_queue.pop(0)
                    yield _sse(ev_type, ev_data)
                await asyncio.sleep(0.05)

            await agent_task
            yield _sse("done", {"session_id": session_id})
        except Exception as exc:
            yield _sse("agent_error", {"error": str(exc)})

    return StreamingResponse(events(), media_type="text/event-stream")


@app.get("/api/agent/state/{workspace_id}/{session_id}")
async def get_agent_state(workspace_id: str, session_id: str) -> dict:
    from core.agent import AgentState

    try:
        state = AgentState.load(workspace_id, session_id)
        return state.model_dump()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


frontend_assets = Path(__file__).resolve().parents[2] / "assets"
if frontend_assets.exists():
    app.mount("/assets", StaticFiles(directory=frontend_assets), name="assets")

