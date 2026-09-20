import asyncio
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from core.agent import AgentState, CodingAgent, RepositoryContext, discover_repository
from core.agent.todo import TodoItem, TodoList, TodoStatus
from core.tools import WorkspaceManager, apply_patch, list_directory, read_file, run_command, search_code, write_file


class TestLEOAgentSystem(unittest.TestCase):

    def test_workspace_path_validation(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ws = WorkspaceManager(tmpdir)
            subfile = Path(tmpdir) / "test.txt"
            subfile.write_text("hello world", encoding="utf-8")

            resolved = ws.resolve_path("test.txt")
            self.assertEqual(resolved, subfile.resolve())

            # Path traversal prevention test
            with self.assertRaises(PermissionError):
                ws.resolve_path("../secret.txt")

    def test_filesystem_tools(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ws = WorkspaceManager(tmpdir)

            # write_file
            w_res = write_file(ws, "src/main.py", "print('hello leo')")
            self.assertTrue(w_res["success"])

            # read_file
            r_res = read_file(ws, "src/main.py")
            self.assertTrue(r_res["success"])
            self.assertEqual(r_res["content"], "print('hello leo')")

            # list_directory
            l_res = list_directory(ws, ".")
            self.assertTrue(l_res["success"])
            self.assertGreaterEqual(len(l_res["entries"]), 1)

            # apply_patch
            p_res = apply_patch(ws, "src/main.py", "hello leo", "hello world")
            self.assertTrue(p_res["success"])

            r_res2 = read_file(ws, "src/main.py")
            self.assertEqual(r_res2["content"], "print('hello world')")

    def test_search_and_shell_tools(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ws = WorkspaceManager(tmpdir)
            write_file(ws, "app.py", "print('42')\n")

            # search_code
            s_res = search_code(ws, "print")
            self.assertTrue(s_res["success"])
            self.assertEqual(len(s_res["matches"]), 1)

            # run_command using sys.executable
            cmd_res = run_command(ws, f'"{sys.executable}" app.py')
            self.assertTrue(cmd_res["success"])
            self.assertIn("42", cmd_res.get("stdout", ""))

    def test_repository_discovery(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ws = WorkspaceManager(tmpdir)
            write_file(ws, "README.md", "# Test Project\nA test repository.")
            write_file(ws, "requirements.txt", "fastapi\npytest\n")

            ctx = discover_repository(ws)
            self.assertEqual(ctx.project_name, Path(tmpdir).name)
            self.assertIn("Python", ctx.languages)
            self.assertIn("FastAPI", ctx.frameworks)
            self.assertIn("pytest", ctx.test_framework)

    def test_agent_loop_execution(self):
        async def _async_test():
            with tempfile.TemporaryDirectory() as tmpdir:
                ws = WorkspaceManager(tmpdir)
                write_file(ws, "main.py", "# initial code\n")

                with patch("backend.app.llm.ollama.OllamaClient.chat", new_callable=AsyncMock) as mock_chat:
                    mock_chat.return_value = '[{"id": "task-1", "step_number": 1, "title": "Inspect Repository", "description": "Examine main.py"}]'

                    agent = CodingAgent(workspace_path=tmpdir, goal="Check main.py and inspect workspace", session_id="test-session")
                    state = await agent.run()

                    self.assertIn(state.status, ["completed", "running", "limit_reached"])
                    self.assertGreater(state.iteration, 0)
                    self.assertGreater(len(state.plan.items), 0)

        asyncio.run(_async_test())


if __name__ == "__main__":
    unittest.main()
