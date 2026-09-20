import json
import logging
from typing import Any

from backend.app.llm.ollama import OllamaClient
from backend.app.llm.registry import get_model_for_domain
from backend.app.models import ChatMessage, Domain
from core.agent.context import RepositoryContext
from core.agent.todo import TodoItem, TodoList, TodoStatus

logger = logging.getLogger(__name__)


class Planner:
    """
    Constructs and updates structured implementation plans (TODO lists) for user coding goals.
    """

    def __init__(self) -> None:
        self.client = OllamaClient()
        self.model_config = get_model_for_domain(Domain.code)

    async def create_plan(self, goal: str, context: RepositoryContext) -> TodoList:
        """
        Generates a structured plan (TodoList) for achieving the user goal.
        """
        system_prompt = (
            "You are an expert AI software architect creating an implementation plan.\n"
            "Given a user goal and repository context, generate a step-by-step TODO list.\n"
            "Respond in strict JSON format as an array of items:\n"
            "[\n"
            '  {"id": "task-1", "step_number": 1, "title": "...", "description": "..."}\n'
            "]\n"
            "Keep steps clear, actionable, and logical (inspect -> modify -> test -> verify)."
        )

        user_content = (
            f"User Goal: {goal}\n\n"
            f"Repository Context:\n{context.summary_text()}\n"
            f"Important Directories: {', '.join(context.important_directories[:10])}\n"
        )

        try:
            raw_response = await self.client.chat(
                model=self.model_config.model,
                messages=[
                    ChatMessage(role="system", content=system_prompt),
                    ChatMessage(role="user", content=user_content),
                ],
                temperature=0.2,
                json_mode=True,
            )

            plan_items = self._parse_json_plan(raw_response)
            if plan_items:
                return TodoList(items=plan_items)
        except Exception as exc:
            logger.warning("[PLANNER] LLM call failed or unavailable: %s. Using default plan structure.", exc)

        return self._heuristic_fallback_plan(goal, context)

    def _parse_json_plan(self, raw_json: str) -> list[TodoItem]:
        try:
            data = json.loads(raw_json)
            if isinstance(data, dict) and "plan" in data:
                data = data["plan"]
            if isinstance(data, list):
                items = []
                for idx, entry in enumerate(data, 1):
                    t_id = str(entry.get("id") or f"task-{idx}")
                    title = str(entry.get("title") or entry.get("step") or f"Step {idx}")
                    desc = str(entry.get("description") or "")
                    items.append(
                        TodoItem(
                            id=t_id,
                            step_number=idx,
                            title=title,
                            description=desc,
                            status=TodoStatus.PENDING,
                        )
                    )
                return items
        except Exception as exc:
            logger.warning("[PLANNER] Could not parse plan JSON: %s", exc)
        return []

    def _heuristic_fallback_plan(self, goal: str, context: RepositoryContext) -> TodoList:
        items = [
            TodoItem(
                id="task-1",
                step_number=1,
                title="Inspect Repository and Relevant Files",
                description=f"Examine structure and relevant files related to goal: '{goal}'",
                status=TodoStatus.PENDING,
            ),
            TodoItem(
                id="task-2",
                step_number=2,
                title="Implement Required Code Changes",
                description=f"Modify source files to accomplish: '{goal}'",
                status=TodoStatus.PENDING,
            ),
            TodoItem(
                id="task-3",
                step_number=3,
                title="Run Commands and Tests",
                description=f"Execute build/test commands to verify code correctness.",
                status=TodoStatus.PENDING,
            ),
            TodoItem(
                id="task-4",
                step_number=4,
                title="Verify Implementation and Finalize",
                description=f"Verify goal compliance and finalize response.",
                status=TodoStatus.PENDING,
            ),
        ]
        return TodoList(items=items)
