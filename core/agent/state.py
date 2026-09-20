import hashlib
import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

from backend.app.config import get_settings
from core.agent.context import RepositoryContext
from core.agent.todo import TodoItem, TodoList


class AgentState(BaseModel):
    """
    Serializable persistent state for an active agent task.
    """

    session_id: str = ""
    workspace_path: str = ""
    workspace_id: str = ""
    goal: str = ""
    status: str = "idle"  # idle, running, completed, failed, limit_reached
    iteration: int = 0
    max_iterations: int = 15
    repository_context: RepositoryContext = Field(default_factory=RepositoryContext)
    plan: TodoList = Field(default_factory=TodoList)
    current_task: TodoItem | None = None
    completed_tasks: list[TodoItem] = Field(default_factory=list)
    observations: list[str] = Field(default_factory=list)
    files_inspected: list[str] = Field(default_factory=list)
    files_changed: list[str] = Field(default_factory=list)
    commands_run: list[dict[str, Any]] = Field(default_factory=list)
    tests_run: list[dict[str, Any]] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)

    @classmethod
    def create(cls, session_id: str, workspace_path: str, goal: str) -> "AgentState":
        w_hash = hashlib.sha256(workspace_path.lower().encode("utf-8")).hexdigest()[:12]
        w_name = Path(workspace_path).name
        w_id = f"{w_name}-{w_hash}"
        return cls(
            session_id=session_id,
            workspace_path=workspace_path,
            workspace_id=w_id,
            goal=goal,
        )

    def get_storage_dir(self) -> Path:
        settings = get_settings()
        storage_dir = settings.data_dir / "agent_workspaces" / self.workspace_id / self.session_id
        storage_dir.mkdir(parents=True, exist_ok=True)
        (storage_dir / "logs").mkdir(exist_ok=True)
        return storage_dir

    def save(self) -> None:
        """Saves agent state, context, and plan to JSON outside the user repository."""
        s_dir = self.get_storage_dir()
        with open(s_dir / "state.json", "w", encoding="utf-8") as f:
            f.write(self.model_dump_json(indent=2))

        with open(s_dir / "context.json", "w", encoding="utf-8") as f:
            f.write(self.repository_context.model_dump_json(indent=2))

        with open(s_dir / "plan.json", "w", encoding="utf-8") as f:
            f.write(self.plan.model_dump_json(indent=2))

    @classmethod
    def load(cls, workspace_id: str, session_id: str) -> "AgentState":
        settings = get_settings()
        s_dir = settings.data_dir / "agent_workspaces" / workspace_id / session_id
        state_file = s_dir / "state.json"
        if not state_file.exists():
            raise FileNotFoundError(f"AgentState file not found at: {state_file}")

        with open(state_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls.model_validate(data)
