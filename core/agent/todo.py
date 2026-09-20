from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class TodoStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class TodoItem(BaseModel):
    id: str
    step_number: int
    title: str
    description: str = ""
    status: TodoStatus = TodoStatus.PENDING
    result_summary: str = ""


class TodoList(BaseModel):
    items: list[TodoItem] = Field(default_factory=list)

    def get_next_pending(self) -> TodoItem | None:
        for item in self.items:
            if item.status == TodoStatus.PENDING:
                return item
        return None

    def update_item_status(self, item_id: str, status: TodoStatus, result_summary: str = "") -> bool:
        for item in self.items:
            if item.id == item_id:
                item.status = status
                if result_summary:
                    item.result_summary = result_summary
                return True
        return False

    def is_all_completed(self) -> bool:
        return len(self.items) > 0 and all(item.status == TodoStatus.COMPLETED for item in self.items)

    def has_failures(self) -> bool:
        return any(item.status == TodoStatus.FAILED for item in self.items)

    def to_dict_list(self) -> list[dict[str, Any]]:
        return [item.model_dump() for item in self.items]
