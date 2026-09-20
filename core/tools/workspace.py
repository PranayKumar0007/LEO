import os
from pathlib import Path


class WorkspaceManager:
    """
    Manages workspace root directory, path validation, and path traversal prevention.
    Ensures all tool operations remain strictly inside the user-selected workspace.
    """

    def __init__(self, workspace_root: str | Path) -> None:
        self.root = Path(workspace_root).resolve()
        if not self.root.exists():
            # Create the workspace directory if it does not exist
            self.root.mkdir(parents=True, exist_ok=True)
        if not self.root.is_dir():
            raise ValueError(f"Workspace path is not a directory: {self.root}")

    def resolve_path(self, relative_or_abs_path: str | Path) -> Path:
        """
        Resolves a path relative to workspace root and ensures it does not break outside the workspace bounds.
        """
        path_obj = Path(relative_or_abs_path)
        if path_obj.is_absolute():
            resolved = path_obj.resolve()
        else:
            resolved = (self.root / path_obj).resolve()

        # Check path traversal
        try:
            resolved.relative_to(self.root)
        except ValueError:
            raise PermissionError(
                f"Path traversal denied: '{relative_or_abs_path}' resolves outside workspace '{self.root}'"
            )

        return resolved

    def relative_path(self, absolute_path: str | Path) -> str:
        """
        Returns relative path string from workspace root.
        """
        resolved = Path(absolute_path).resolve()
        try:
            return str(resolved.relative_to(self.root)).replace("\\", "/")
        except ValueError:
            return str(resolved).replace("\\", "/")

    def get_metadata(self) -> dict:
        return {
            "root": str(self.root),
            "name": self.root.name,
            "exists": self.root.exists(),
        }
