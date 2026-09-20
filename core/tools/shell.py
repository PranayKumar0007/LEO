import os
import subprocess
from typing import Any

from core.tools.workspace import WorkspaceManager

# Forbidden command prefixes to prevent host destruction or unauthorized remote push
FORBIDDEN_COMMAND_PREFIXES = [
    "git push",
    "rm -rf /",
    "rmdir /s /q c:\\",
    "format ",
    "mkfs",
]


def run_command(
    workspace_mgr: WorkspaceManager,
    command: str,
    timeout: int = 60,
    max_output_length: int = 10000,
) -> dict[str, Any]:
    """
    Executes a local command inside the workspace directory safely.
    """
    cmd_strip = command.strip()
    if not cmd_strip:
        return {"success": False, "error": "Command string cannot be empty"}

    lowered_cmd = cmd_strip.lower()
    for forbidden in FORBIDDEN_COMMAND_PREFIXES:
        if forbidden in lowered_cmd:
            return {
                "success": False,
                "error": f"Command execution blocked for safety reasons: '{forbidden}' is prohibited.",
            }

    try:
        process = subprocess.run(
            cmd_strip,
            cwd=str(workspace_mgr.root),
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout,
            encoding="utf-8",
            errors="replace",
        )

        stdout = process.stdout or ""
        stderr = process.stderr or ""
        exit_code = process.returncode

        # Truncate long outputs if necessary
        truncated_stdout = stdout[:max_output_length]
        if len(stdout) > max_output_length:
            truncated_stdout += f"\n... [stdout truncated after {max_output_length} chars]"

        truncated_stderr = stderr[:max_output_length]
        if len(stderr) > max_output_length:
            truncated_stderr += f"\n... [stderr truncated after {max_output_length} chars]"

        return {
            "success": exit_code == 0,
            "command": cmd_strip,
            "exit_code": exit_code,
            "stdout": truncated_stdout,
            "stderr": truncated_stderr,
            "workspace": str(workspace_mgr.root),
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "command": cmd_strip,
            "exit_code": -1,
            "error": f"Command timed out after {timeout} seconds.",
        }
    except Exception as exc:
        return {
            "success": False,
            "command": cmd_strip,
            "exit_code": -1,
            "error": f"Failed to execute command: {exc}",
        }
