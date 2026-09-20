import os
from pathlib import Path
from typing import Any

from core.tools.workspace import WorkspaceManager

DEFAULT_IGNORED_DIRS = {
    ".git",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    ".pytest_cache",
    ".mypy_cache",
    "dist",
    "build",
    ".idea",
    ".vscode",
}

DEFAULT_MAX_FILE_SIZE = 100 * 1024  # 100 KB default limit for LLM context reading


def list_directory(
    workspace_mgr: WorkspaceManager,
    relative_path: str = ".",
    recursive: bool = False,
    max_depth: int = 3,
    max_entries: int = 200,
) -> dict[str, Any]:
    """
    Lists directory contents safely within the workspace directory bounds.
    """
    target_dir = workspace_mgr.resolve_path(relative_path)
    if not target_dir.exists():
        return {"success": False, "error": f"Directory not found: {relative_path}"}
    if not target_dir.is_dir():
        return {"success": False, "error": f"Path is not a directory: {relative_path}"}

    entries = []
    truncated = False

    def scan(current_dir: Path, current_depth: int):
        nonlocal truncated
        if len(entries) >= max_entries:
            truncated = True
            return

        try:
            items = sorted(current_dir.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower()))
        except Exception as exc:
            return

        for item in items:
            if item.name in DEFAULT_IGNORED_DIRS:
                continue

            rel_p = workspace_mgr.relative_path(item)
            is_dir = item.is_dir()
            entry_info = {
                "path": rel_p,
                "name": item.name,
                "type": "directory" if is_dir else "file",
            }
            if not is_dir:
                try:
                    entry_info["size_bytes"] = item.stat().st_size
                except OSError:
                    entry_info["size_bytes"] = 0

            entries.append(entry_info)
            if len(entries) >= max_entries:
                truncated = True
                return

            if recursive and is_dir and current_depth < max_depth:
                scan(item, current_depth + 1)

    scan(target_dir, 1)

    return {
        "success": True,
        "workspace_root": str(workspace_mgr.root),
        "target_path": workspace_mgr.relative_path(target_dir),
        "entries_count": len(entries),
        "truncated": truncated,
        "entries": entries,
    }


def read_file(
    workspace_mgr: WorkspaceManager,
    relative_path: str,
    max_bytes: int = DEFAULT_MAX_FILE_SIZE,
) -> dict[str, Any]:
    """
    Reads text content from a file inside the workspace safely.
    """
    try:
        file_path = workspace_mgr.resolve_path(relative_path)
    except PermissionError as err:
        return {"success": False, "error": str(err)}

    if not file_path.exists():
        return {"success": False, "error": f"File does not exist: {relative_path}"}
    if not file_path.is_file():
        return {"success": False, "error": f"Path is not a file: {relative_path}"}

    try:
        file_size = file_path.stat().st_size
        if file_size > max_bytes:
            # Partial read notice
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read(max_bytes)
            return {
                "success": True,
                "path": workspace_mgr.relative_path(file_path),
                "content": content,
                "truncated": True,
                "file_size": file_size,
                "notice": f"File truncated at {max_bytes} bytes out of {file_size} total bytes.",
            }

        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        return {
            "success": True,
            "path": workspace_mgr.relative_path(file_path),
            "content": content,
            "truncated": False,
            "file_size": file_size,
        }
    except Exception as exc:
        return {"success": False, "error": f"Failed to read file '{relative_path}': {exc}"}


def write_file(
    workspace_mgr: WorkspaceManager,
    relative_path: str,
    content: str,
    overwrite: bool = True,
) -> dict[str, Any]:
    """
    Creates or overwrites a file inside the workspace.
    """
    try:
        file_path = workspace_mgr.resolve_path(relative_path)
    except PermissionError as err:
        return {"success": False, "error": str(err)}

    if file_path.exists() and not overwrite:
        return {"success": False, "error": f"File already exists and overwrite=False: {relative_path}"}

    try:
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)

        return {
            "success": True,
            "path": workspace_mgr.relative_path(file_path),
            "bytes_written": len(content.encode("utf-8")),
        }
    except Exception as exc:
        return {"success": False, "error": f"Failed to write file '{relative_path}': {exc}"}


def apply_patch(
    workspace_mgr: WorkspaceManager,
    relative_path: str,
    target_content: str,
    replacement_content: str,
) -> dict[str, Any]:
    """
    Applies targeted search-and-replace edit to an existing file in workspace.
    """
    read_res = read_file(workspace_mgr, relative_path, max_bytes=10 * 1024 * 1024)
    if not read_res.get("success"):
        return read_res

    full_content = read_res["content"]
    if target_content not in full_content:
        return {
            "success": False,
            "error": f"Target content block not found in file '{relative_path}'. Ensure target string matches exact file content.",
        }

    occurrences = full_content.count(target_content)
    if occurrences > 1:
        return {
            "success": False,
            "error": f"Target content block found {occurrences} times in file '{relative_path}'. Specify a more unique target block.",
        }

    new_content = full_content.replace(target_content, replacement_content, 1)
    write_res = write_file(workspace_mgr, relative_path, new_content, overwrite=True)
    if write_res.get("success"):
        write_res["patched"] = True
    return write_res
