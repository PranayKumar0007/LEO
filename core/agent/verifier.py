import logging
from typing import Any

from pydantic import BaseModel, Field

from core.agent.state import AgentState
from core.tools.shell import run_command
from core.tools.workspace import WorkspaceManager

logger = logging.getLogger(__name__)


class VerificationResult(BaseModel):
    success: bool
    details: str
    suggested_fixes: list[str] = Field(default_factory=list)
    tests_run: list[dict[str, Any]] = Field(default_factory=list)


class Verifier:
    """
    Verifies whether the agent has satisfied the user's goal through build/test execution and inspection.
    """

    def verify_goal(self, workspace_mgr: WorkspaceManager, state: AgentState) -> VerificationResult:
        """
        Executes test suite / build checks depending on tech stack and verifies workspace state.
        """
        fixes = []
        test_reports = []
        tests_passed = True

        # 1. Detect test command based on tech stack & files
        test_cmd = self._determine_test_command(workspace_mgr, state)
        if test_cmd:
            cmd_res = run_command(workspace_mgr, test_cmd, timeout=90)
            test_reports.append(cmd_res)
            state.tests_run.append(cmd_res)

            if not cmd_res.get("success"):
                tests_passed = False
                fixes.append(
                    f"Test/build command '{test_cmd}' failed with exit code {cmd_res.get('exit_code')}.\n"
                    f"Stderr snippet: {cmd_res.get('stderr', '')[:300]}"
                )

        # 2. Check if files were modified
        if not state.files_changed:
            # Check if any git changes exist
            git_res = run_command(workspace_mgr, "git status --porcelain", timeout=10)
            if git_res.get("success") and git_res.get("stdout", "").strip():
                # Git has changes
                pass
            elif not state.observations:
                fixes.append("No files were modified and no observations were recorded to address the goal.")

        # 3. Compile overall verdict
        if tests_passed and not fixes:
            details = f"Goal verification succeeded! Modified files: {state.files_changed}."
            if test_cmd:
                details += f" Test suite '{test_cmd}' passed successfully."
            return VerificationResult(
                success=True,
                details=details,
                tests_run=test_reports,
            )
        else:
            details = f"Goal verification incomplete/failed. Found {len(fixes)} issues."
            return VerificationResult(
                success=False,
                details=details,
                suggested_fixes=fixes,
                tests_run=test_reports,
            )

    def _determine_test_command(self, workspace_mgr: WorkspaceManager, state: AgentState) -> str | None:
        ctx = state.repository_context

        # Python
        if "pytest" in ctx.test_framework or (workspace_mgr.root / "pytest.ini").exists() or (workspace_mgr.root / "conftest.py").exists():
            return "pytest"
        if (workspace_mgr.root / "tests").exists() and "Python" in ctx.languages:
            return "pytest"

        # JavaScript / TypeScript
        if "npm/yarn/pnpm" in ctx.package_managers or (workspace_mgr.root / "package.json").exists():
            if "jest/vitest" in ctx.test_framework or (workspace_mgr.root / "package.json").exists():
                return "npm test"

        # Rust
        if (workspace_mgr.root / "Cargo.toml").exists():
            return "cargo test"

        # Go
        if (workspace_mgr.root / "go.mod").exists():
            return "go test ./..."

        return None
