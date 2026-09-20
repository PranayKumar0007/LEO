"""
core/tools/vision.py

Main shared entry point for LEO's local OCR, handwritten text, and diagram understanding workflow.
Shared across Website, Desktop, and CLI interfaces.
"""

from abc import ABC, abstractmethod
import base64
import io
import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional, Union
import httpx
from PIL import Image

logger = logging.getLogger(__name__)


def _get_default_ocr_model() -> str:
    try:
        from backend.app.llm.registry import DEFAULT_OCR_MODEL

        return os.getenv("LEO_OCR_MODEL_PATH") or DEFAULT_OCR_MODEL
    except Exception:
        return os.getenv("LEO_OCR_MODEL_PATH", "PaddlePaddle/PaddleOCR-VL-1.6")


def _get_default_vision_model() -> str:
    try:
        from backend.app.llm.registry import DEFAULT_VISION_MODEL

        return os.getenv("LEO_VISION_MODEL_NAME") or DEFAULT_VISION_MODEL
    except Exception:
        return os.getenv("LEO_VISION_MODEL_NAME", "moondream")



# ----------------------------------------------------------------------
# Base Model Abstractions
# ----------------------------------------------------------------------

class BaseOCREngine(ABC):
    """Abstract base class for local OCR engines."""

    @abstractmethod
    def extract(self, image: Union[Image.Image, Path, str], task: str = "OCR:") -> str:
        """Extract text, tables, or formulas from an image."""
        pass


class BaseVisionEngine(ABC):
    """Abstract base class for local Vision-Language engines."""

    @abstractmethod
    def analyze(self, image: Union[Image.Image, Path, str], prompt: Optional[str] = None) -> str:
        """Analyze diagrams, engineering notes, or visual structures."""
        pass


# ----------------------------------------------------------------------
# 1. PaddleOCR-VL Engine (PyTorch + Hugging Face Transformers API)
# ----------------------------------------------------------------------

class PaddleOCRVLEngine(BaseOCREngine):
    """
    PaddleOCR-VL Engine utilizing Hugging Face Transformers API for local document & handwriting extraction.
    Supports CPU & GPU, air-gapped local execution.
    """

    def __init__(
        self,
        model_name_or_path: Optional[str] = None,
        use_gpu: bool = False,
        local_files_only: bool = True,
    ):
        self.model_name_or_path = model_name_or_path or _get_default_ocr_model()
        self.use_gpu = use_gpu
        self.local_files_only = local_files_only

        self._processor = None
        self._model = None
        self._load_failed = False
        self._load_error_msg = ""

    def _ensure_loaded(self) -> None:
        if self._model is not None or self._load_failed:
            return

        try:
            import torch
            from transformers import AutoModelForCausalLM, AutoModelForImageTextToText, AutoProcessor

            # Transformers 5.x compatibility patch for PaddleOCR-VL custom RoPE scaling
            try:
                from transformers.modeling_rope_utils import ROPE_INIT_FUNCTIONS
                try:
                    from transformers.modeling_rope_utils import _init_default_rope
                except ImportError:
                    _init_default_rope = None

                if "default" not in ROPE_INIT_FUNCTIONS:
                    ROPE_INIT_FUNCTIONS["default"] = _init_default_rope or (lambda config, device, **kwargs: (None, None))
            except Exception:
                pass

            device = "cuda" if (self.use_gpu and torch.cuda.is_available()) else "cpu"
            torch_dtype = (
                torch.bfloat16 if (device == "cuda" and torch.cuda.is_bf16_supported()) else torch.float32
            )

            self._processor = AutoProcessor.from_pretrained(
                self.model_name_or_path,
                trust_remote_code=True,
                local_files_only=self.local_files_only,
            )

            try:
                self._model = (
                    AutoModelForCausalLM.from_pretrained(
                        self.model_name_or_path,
                        trust_remote_code=True,
                        torch_dtype=torch_dtype,
                        local_files_only=self.local_files_only,
                    )
                    .to(device)
                    .eval()
                )
            except Exception:
                self._model = (
                    AutoModelForImageTextToText.from_pretrained(
                        self.model_name_or_path,
                        trust_remote_code=True,
                        torch_dtype=torch_dtype,
                        local_files_only=self.local_files_only,
                    )
                    .to(device)
                    .eval()
                )


        except Exception as exc:
            self._load_failed = True
            self._load_error_msg = f"PaddleOCR-VL unavailable ({self.model_name_or_path}): {exc}"
            logger.warning(self._load_error_msg)

    def extract(self, image: Union[Image.Image, Path, str], task: str = "OCR:") -> str:
        self._ensure_loaded()
        if self._load_failed or self._model is None:
            return f"[PaddleOCR-VL Status: {self._load_error_msg}]"

        try:
            import torch

            pil_img = _to_pil(image)
            messages = [{"role": "user", "content": [{"type": "image"}, {"type": "text", "text": task}]}]
            text = self._processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
            inputs = self._processor(text=[text], images=[pil_img], return_tensors="pt").to(self._model.device)
            with torch.no_grad():
                generated_ids = self._model.generate(**inputs, max_new_tokens=1024)
            output = self._processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
            return output.strip()
        except Exception as exc:
            logger.error(f"PaddleOCR-VL extraction error: {exc}")
            return f"[PaddleOCR-VL Extraction Exception: {exc}]"


# ----------------------------------------------------------------------
# 2. Moondream Engine (Ollama Local HTTP API)
# ----------------------------------------------------------------------

class OllamaMoondreamEngine(BaseVisionEngine):
    """
    Moondream Engine communicating via local Ollama HTTP API for diagram & visual understanding.
    Air-gapped and lightweight.
    """

    def __init__(
        self,
        ollama_url: Optional[str] = None,
        model_name: Optional[str] = None,
        timeout: Optional[float] = None,
    ):
        self.ollama_url = (ollama_url or os.getenv("LEO_OLLAMA_BASE_URL", "http://127.0.0.1:11434")).rstrip("/")
        self.model_name = model_name or _get_default_vision_model()
        self.timeout = timeout if timeout is not None else float(os.getenv("LEO_VISION_TIMEOUT", "300.0"))



    def analyze(self, image: Union[Image.Image, Path, str], prompt: Optional[str] = None) -> str:
        default_prompt = (
            "Analyze this image or diagram in detail. "
            "Describe key visual features, structures, diagram connections, labels, tables, or annotations present."
        )
        final_prompt = prompt or default_prompt

        try:
            pil_img = _to_pil(image)
            buf = io.BytesIO()
            pil_img.save(buf, format="PNG")
            img_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

            url = f"{self.ollama_url}/api/generate"
            payload = {
                "model": self.model_name,
                "prompt": final_prompt,
                "images": [img_b64],
                "stream": False,
            }

            with httpx.Client(timeout=self.timeout) as client:
                resp = client.post(url, json=payload)
                if resp.status_code != 200:
                    return f"[Moondream Vision Error: Ollama HTTP {resp.status_code} - {resp.text}]"
                data = resp.json()
                return data.get("response", "").strip()
        except Exception as exc:
            logger.error(f"Moondream vision analysis error: {exc}")
            return f"[Moondream Vision Exception: {exc}]"


# Helper function to ensure input image is a PIL Image
def _to_pil(img_input: Union[Image.Image, Path, str]) -> Image.Image:
    if isinstance(img_input, Image.Image):
        return img_input.convert("RGB")
    path = Path(img_input)
    if not path.exists():
        raise FileNotFoundError(f"Image file not found: {path}")
    return Image.open(path).convert("RGB")


# ----------------------------------------------------------------------
# 3. VisionToolManager & Unified Workflow Entry Point
# ----------------------------------------------------------------------

class VisionToolManager:
    """
    Central manager coordinating OCR and Vision pipelines.
    Supports modular replacement of underlying OCR / Vision engines.
    """

    def __init__(
        self,
        ocr_engine: Optional[BaseOCREngine] = None,
        vision_engine: Optional[BaseVisionEngine] = None,
    ):
        self.ocr_engine = ocr_engine or PaddleOCRVLEngine()
        self.vision_engine = vision_engine or OllamaMoondreamEngine()

    def ocr_extract(self, image: Union[Image.Image, Path, str], task: str = "OCR:") -> str:
        return self.ocr_engine.extract(image, task=task)

    def vision_analyze(self, image: Union[Image.Image, Path, str], prompt: Optional[str] = None) -> str:
        return self.vision_engine.analyze(image, prompt=prompt)

    def process_image(
        self,
        image: Union[Image.Image, Path, str],
        prompt: Optional[str] = None,
        mode: str = "auto",
    ) -> Dict[str, Any]:
        """
        Process an uploaded document photo, diagram, or handwritten note.
        Modes:
          - 'ocr': OCR pipeline only
          - 'vision': Vision pipeline only
          - 'both' / 'auto': Runs BOTH OCR (PaddleOCR-VL) & Vision (Moondream) and combines results.
        """
        mode_clean = mode.lower()
        ocr_text = ""
        vision_desc = ""

        # Run OCR Pipeline if requested
        if mode_clean in {"ocr", "both", "auto"}:
            try:
                ocr_text = self.ocr_extract(image)
            except Exception as exc:
                ocr_text = f"[OCR Failure: {exc}]"

        # Run Vision Pipeline if requested
        if mode_clean in {"vision", "both", "auto"}:
            try:
                vision_desc = self.vision_analyze(image, prompt=prompt)
            except Exception as exc:
                vision_desc = f"[Vision Failure: {exc}]"

        # Combine results into structured document context
        sections = []

        is_ocr_valid = ocr_text and not ocr_text.startswith("[PaddleOCR-VL Status") and not ocr_text.startswith("[OCR Failure")
        is_vision_valid = vision_desc and not vision_desc.startswith("[Moondream Vision Error") and not vision_desc.startswith("[Vision Failure")

        if is_ocr_valid:
            sections.append(f"--- OCR & Handwritten Text Extraction (PaddleOCR-VL) ---\n{ocr_text}")
        elif ocr_text:
            sections.append(f"--- OCR Status ---\n{ocr_text}")

        if is_vision_valid:
            sections.append(f"--- Visual & Diagram Analysis (Moondream) ---\n{vision_desc}")
        elif vision_desc:
            sections.append(f"--- Vision Status ---\n{vision_desc}")

        if not sections:
            combined = "[Document / Image processing completed: No text or visual description could be extracted.]"
        else:
            combined = "\n\n".join(sections)

        return {
            "text": combined,
            "ocr_text": ocr_text,
            "vision_description": vision_desc,
            "mode_used": mode_clean,
        }


# Global singleton instance
default_vision_tool = VisionToolManager()


# Clean Namespaces for direct ocr.extract and vision.analyze access

class _OCRNamespace:
    def extract(self, image: Union[Image.Image, Path, str], task: str = "OCR:") -> str:
        return default_vision_tool.ocr_extract(image, task=task)


class _VisionNamespace:
    def analyze(self, image: Union[Image.Image, Path, str], prompt: Optional[str] = None) -> str:
        return default_vision_tool.vision_analyze(image, prompt=prompt)


ocr = _OCRNamespace()
vision = _VisionNamespace()


def process_image(
    image: Union[Image.Image, Path, str],
    prompt: Optional[str] = None,
    mode: str = "auto",
) -> Dict[str, Any]:
    """
    Main shared entry point function.
    """
    return default_vision_tool.process_image(image, prompt=prompt, mode=mode)
