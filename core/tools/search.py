import os
import re
from pathlib import Path
from typing import Any

from core.tools.filesystem import DEFAULT_IGNORED_DIRS
from core.tools.workspace import WorkspaceManager


def search_code(
    workspace_mgr: WorkspaceManager,
    query: str,
    file_pattern: str | None = None,
    max_results: int = 50,
    case_sensitive: bool = False,
) -> dict[str, Any]:
    """
    Searches the workspace for code symbols, text, imports, or regex patterns.
    """
    if not query.strip():
        return {"success": False, "error": "Search query cannot be empty"}

    try:
        flags = 0 if case_sensitive else re.IGNORECASE
        pattern = re.compile(re.escape(query) if not _is_regex(query) else query, flags)
    except re.error as err:
        # Fallback to literal search if regex compilation fails
        pattern = re.compile(re.escape(query), 0 if case_sensitive else re.IGNORECASE)

    matches = []
    truncated = False

    for root_dir, dirs, files in os.walk(workspace_mgr.root):
        # Filter out ignored directories in-place
        dirs[:] = [d for d in dirs if d not in DEFAULT_IGNORED_DIRS]

        for file_name in files:
            if len(matches) >= max_results:
                truncated = True
                break

            if file_pattern and not _match_glob(file_name, file_pattern):
                continue

            full_p = Path(root_dir) / file_name
            rel_p = workspace_mgr.relative_path(full_p)

            # Skip large or binary files
            try:
                if full_p.stat().st_size > 500 * 1024:  # >500KB skip search
                    continue

                with open(full_p, "r", encoding="utf-8", errors="ignore") as f:
                    for line_num, line in enumerate(f, 1):
                        if pattern.search(line):
                            matches.append(
                                {
                                    "file": rel_p,
                                    "line_number": line_num,
                                    "line_content": line.strip()[:200],
                                }
                            )
                            if len(matches) >= max_results:
                                truncated = True
                                break
            except Exception:
                continue

        if truncated:
            break

    return {
        "success": True,
        "query": query,
        "matches_count": len(matches),
        "truncated": truncated,
        "matches": matches,
    }


def _is_regex(s: str) -> bool:
    return any(c in s for c in [".", "*", "+", "?", "^", "$", "{", "}", "(", ")", "|", "[", "]", "\\"])


def _match_glob(filename: str, pattern: str) -> bool:
    import fnmatch

    return fnmatch.fnmatch(filename, pattern)
