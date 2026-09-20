import json
import logging
from collections.abc import AsyncIterator

import httpx

from backend.app.config import get_settings
from backend.app.models import ChatMessage

logger = logging.getLogger(__name__)

# Only limit how long we wait to *connect* to Ollama.
# Once connected, we never cut off the model mid-generation —
# local models can take minutes to warm up and stream their first token.
_CONNECT_TIMEOUT = httpx.Timeout(connect=5.0, read=None, write=None, pool=None)


class OllamaClient:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def chat(
        self,
        model: str,
        messages: list[ChatMessage],
        temperature: float = 0.2,
        stream: bool = False,
        json_mode: bool = False,
    ) -> str:
        """Single-shot (non-streaming) chat call.

        Waits indefinitely for the model to finish — no read timeout.
        Only raises if Ollama is not reachable (connect error) or
        returns an HTTP error status.
        """
        payload: dict = {
            "model": model,
            "messages": [message.model_dump() for message in messages],
            "stream": False,
            "options": {"temperature": temperature},
        }
        if json_mode:
            payload["format"] = "json"

        url = f"{self.settings.ollama_base_url}/api/chat"
        try:
            async with httpx.AsyncClient(timeout=_CONNECT_TIMEOUT) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()
                return data.get("message", {}).get("content", "")
        except httpx.ConnectError as exc:
            logger.error(
                "[OLLAMA] Cannot reach Ollama at %s — is it running? (`ollama serve`). Error: %s",
                self.settings.ollama_base_url,
                exc,
            )
            raise
        except httpx.HTTPStatusError as exc:
            logger.error(
                "[OLLAMA] HTTP %s from Ollama for model '%s': %s",
                exc.response.status_code,
                model,
                exc,
            )
            raise

    async def stream_chat(
        self,
        model: str,
        messages: list[ChatMessage],
        temperature: float = 0.2,
    ) -> AsyncIterator[str]:
        """Streaming chat — yields tokens as they arrive from Ollama.

        No read timeout: tokens are yielded as soon as Ollama produces them.
        The model may take a while to load or start; we simply wait.
        """
        payload = {
            "model": model,
            "messages": [message.model_dump() for message in messages],
            "stream": True,
            "options": {"temperature": temperature},
        }

        url = f"{self.settings.ollama_base_url}/api/chat"
        try:
            async with httpx.AsyncClient(timeout=_CONNECT_TIMEOUT) as client:
                async with client.stream("POST", url, json=payload) as response:
                    response.raise_for_status()
                    async for raw_line in response.aiter_lines():
                        if not raw_line.strip():
                            continue
                        try:
                            data = json.loads(raw_line)
                        except json.JSONDecodeError:
                            continue
                        content = data.get("message", {}).get("content")
                        if content:
                            yield content
        except httpx.ConnectError as exc:
            logger.error(
                "[OLLAMA] Cannot reach Ollama at %s — is it running? (`ollama serve`). Error: %s",
                self.settings.ollama_base_url,
                exc,
            )
            raise
        except httpx.HTTPStatusError as exc:
            logger.error(
                "[OLLAMA] HTTP %s from Ollama for model '%s': %s",
                exc.response.status_code,
                model,
                exc,
            )
            raise
