from enum import Enum
from typing import Any
from pydantic import BaseModel, Field


class Domain(str, Enum):
    general = "general"
    code = "code"
    math = "math"
    medical = "medical"


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    history: list[ChatMessage] = Field(default_factory=list)
    document_ids: list[str] = Field(default_factory=list)
    top_k: int | None = None


class RouteDecision(BaseModel):
    domain: Domain
    confidence: float = Field(ge=0, le=1)
    rationale: str = ""
    needs_retrieval: bool = False


class ModelConfig(BaseModel):
    domain: Domain
    model: str
    temperature: float = 0.2
    system_prompt: str


class RetrievedChunk(BaseModel):
    text: str
    score: float
    metadata: dict[str, Any]


class UploadedDocument(BaseModel):
    document_id: str
    filename: str
    chunks_indexed: int


class OCREngineType(str, Enum):
    paddleocr_vl = "paddleocr-vl"
    none = "none"


class VisionEngineType(str, Enum):
    ollama = "ollama"
    none = "none"


class VisionToolConfig(BaseModel):
    ocr_engine: OCREngineType = OCREngineType.paddleocr_vl
    ocr_model_path: str = ""
    vision_engine: VisionEngineType = VisionEngineType.ollama
    vision_model_name: str = ""


class AgentRunRequest(BaseModel):
    workspace_path: str = Field(min_length=1)
    goal: str = Field(min_length=1)
    session_id: str | None = None



