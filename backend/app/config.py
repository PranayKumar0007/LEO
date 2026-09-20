from functools import lru_cache
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "LEO Local LLM Workbench"
    data_dir: Path = Field(default=Path("./data"))

    ollama_base_url: str = "http://127.0.0.1:11434"
    router_model: str = "qwen2.5:1.5b-instruct"
    embedding_provider: str = "ollama"
    default_embedding_model: str = "nomic-embed-text"

    qdrant_url: str = "http://127.0.0.1:6333"
    qdrant_collection: str = "leo_documents"

    max_upload_mb: int = 50
    chunk_size: int = 1000
    chunk_overlap: int = 180
    retrieval_top_k: int = 5

    # OCR & Vision Model Configuration (Overridable via .env or registry.py)
    ocr_engine: str = "paddleocr-vl"
    ocr_model_path: str = ""

    vision_engine: str = "ollama"
    vision_model_name: str = ""

    # Selective OCR Activation Settings for PDFs
    pdf_ocr_fallback: bool = True
    pdf_ocr_min_chars: int = 30

    class Config:
        env_file = ".env"
        env_prefix = "LEO_"


@lru_cache
def get_settings() -> Settings:
    from backend.app.llm.registry import DEFAULT_OCR_MODEL, DEFAULT_VISION_MODEL

    settings = Settings()
    if not settings.ocr_model_path:
        settings.ocr_model_path = DEFAULT_OCR_MODEL
    if not settings.vision_model_name:
        settings.vision_model_name = DEFAULT_VISION_MODEL

    settings.data_dir.mkdir(parents=True, exist_ok=True)
    return settings
