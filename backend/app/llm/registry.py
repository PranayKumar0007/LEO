"""
LEO Model Registry

Central registry for domain LLMs, OCR models, and Vision-Language models.
To change any model used in the application, edit the registry variables below.
"""

from backend.app.models import Domain, ModelConfig, OCREngineType, VisionEngineType, VisionToolConfig

# ----------------------------------------------------------------------
# 1. OCR & Vision Model Registry (Single Source of Truth)
# Edit these variables to change the active OCR or Vision models!
# ----------------------------------------------------------------------
DEFAULT_OCR_ENGINE = OCREngineType.paddleocr_vl
DEFAULT_OCR_MODEL = "./models_storage/PaddleOCR-VL-1.6"

DEFAULT_VISION_ENGINE = VisionEngineType.ollama
DEFAULT_VISION_MODEL = "moondream"


# ----------------------------------------------------------------------
# 2. Domain LLM Registry
# ----------------------------------------------------------------------
MODEL_REGISTRY: dict[Domain, ModelConfig] = {
    Domain.general: ModelConfig(
        domain=Domain.general,
        model="qwen2.5:3b",
        temperature=0.3,
        system_prompt=(
            "You are a careful local general-purpose assistant running inside an air-gapped "
            "organization. Answer using only the provided context and user conversation. "
            "When retrieved context is present, cite sources with [filename p.page chunk id]."
        ),
    ),
    Domain.code: ModelConfig(
        domain=Domain.code,
        model="qwen2.5-coder:3b",
        temperature=0.15,
        system_prompt=(
            "You are a local coding expert. Provide practical, secure code and explain important "
            "tradeoffs. If documents are cited, include source citations."
        ),
    ),
    Domain.math: ModelConfig(
        domain=Domain.math,
        model="qwen2.5-coder:1.5b",
        temperature=0.1,
        system_prompt=(
            "You are a local math expert. Show calculation steps clearly and flag assumptions."
        ),
    ),
    Domain.medical: ModelConfig(
        domain=Domain.medical,
        model="qwen2.5:3b",
        temperature=0.1,
        system_prompt=(
            "You are a cautious medical information assistant. Provide educational information, "
            "cite local documents when used, and recommend professional clinical judgment for care decisions."
        ),
    ),
}


def get_model_for_domain(domain: Domain) -> ModelConfig:
    return MODEL_REGISTRY.get(domain, MODEL_REGISTRY[Domain.general])


def get_vision_tool_config() -> VisionToolConfig:
    from backend.app.config import get_settings

    settings = get_settings()
    return VisionToolConfig(
        ocr_engine=settings.ocr_engine,
        ocr_model_path=settings.ocr_model_path,
        vision_engine=settings.vision_engine,
        vision_model_name=settings.vision_model_name,
    )
