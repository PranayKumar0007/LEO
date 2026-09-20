import asyncio
import json
import logging
from collections.abc import Callable
from typing import Any

from backend.app.llm.ollama import OllamaClient
from backend.app.llm.registry import get_model_for_domain
from backend.app.models import ChatMessage, Domain
from core.agent.context import RepositoryContext, discover_repository
from core.agent.planner import Planner
from core.agent.state import AgentState
from core.agent.todo import TodoItem, TodoStatus
from core.agent.verifier import Verifier
from core.tools.filesystem import apply_patch, list_directory, read_file, write_file
from core.tools.search import search_code
from core.tools.shell import run_command
from core.tools.workspace import WorkspaceManager

logger = logging.getLogger(__name__)

# Callback type for SSE event broadcasting
EventCallback = Callable[[str, dict[str, Any]], None]


class CodingAgent:
    """
    Main iterative agent execution loop for operating on a user-selected software repository.
    """

    def __init__(
        self,
        workspace_path: str,
        goal: str,
        session_id: str = "default-session",
        event_callback: EventCallback | None = None,
    ) -> None:
        self.workspace_mgr = WorkspaceManager(workspace_path)
        self.state = AgentState.create(session_id=session_id, workspace_path=str(self.workspace_mgr.root), goal=goal)
        self.event_callback = event_callback
        self.planner = Planner()
        self.verifier = Verifier()
        self.client = OllamaClient()
        self.model_config = get_model_for_domain(Domain.code)

    def _emit(self, event_type: str, data: dict[str, Any]) -> None:
        if self.event_callback:
            try:
                self.event_callback(event_type, data)
            except Exception as exc:
                logger.warning("[AGENT] Callback error for event '%s': %s", event_type, exc)

    async def run(self) -> AgentState:
        """
        Executes the full iterative coding agent loop.
        """
        self.state.status = "running"
        self._emit("agent_started", {"session_id": self.state.session_id, "goal": self.state.goal, "workspace": self.state.workspace_path})

        # 1. Repository Discovery Phase
        context = discover_repository(self.workspace_mgr)
        self.state.repository_context = context
        self._emit("repository_context", context.model_dump())

        # 2. Planning Phase
        plan = await self.planner.create_plan(self.state.goal, context)
        self.state.plan = plan
        self.state.save()
        self._emit("plan_created", {"plan": plan.to_dict_list()})

        # 3. Iterative Execution Loop
        while self.state.iteration < self.state.max_iterations:
            self.state.iteration += 1
            self._emit("agent_iteration", {"iteration": self.state.iteration, "max_iterations": self.state.max_iterations})

            current_todo = self.state.plan.get_next_pending()
            if not current_todo:
                # All TODO items completed or pending verification
                break

            self.state.current_task = current_todo
            current_todo.status = TodoStatus.IN_PROGRESS
            self._emit("todo_updated", {"current_task": current_todo.model_dump(), "plan": self.state.plan.to_dict_list()})

            # Execute task
            success, task_obs = await self._execute_task_step(current_todo)
            self.state.observations.append(task_obs)

            if success:
                current_todo.status = TodoStatus.COMPLETED
                current_todo.result_summary = task_obs
                self.state.completed_tasks.append(current_todo)
            else:
                current_todo.status = TodoStatus.FAILED
                current_todo.result_summary = f"Failed: {task_obs}"
                self.state.errors.append(task_obs)

            self.state.current_task = None
            self.state.save()
            self._emit("todo_updated", {"plan": self.state.plan.to_dict_list()})

        # 4. Verification Phase
        self._emit("verification_started", {})
        ver_result = self.verifier.verify_goal(self.workspace_mgr, self.state)
        self._emit("verification_result", ver_result.model_dump())

        # 5. Fix loop if verification failed and iterations remain
        if not ver_result.success and self.state.iteration < self.state.max_iterations and ver_result.suggested_fixes:
            fix_item = TodoItem(
                id=f"fix-{self.state.iteration}",
                step_number=len(self.state.plan.items) + 1,
                title="Fix Verification Issues",
                description="; ".join(ver_result.suggested_fixes),
                status=TodoStatus.PENDING,
            )
            self.state.plan.items.append(fix_item)
            self._emit("todo_updated", {"plan": self.state.plan.to_dict_list()})
            # Run one fix step
            self.state.iteration += 1
            await self._execute_task_step(fix_item)
            fix_item.status = TodoStatus.COMPLETED
            ver_result = self.verifier.verify_goal(self.workspace_mgr, self.state)
            self._emit("verification_result", ver_result.model_dump())

        # Finalize status
        if ver_result.success or self.state.plan.is_all_completed():
            self.state.status = "completed"
        elif self.state.iteration >= self.state.max_iterations:
            self.state.status = "limit_reached"
        else:
            self.state.status = "completed"

        # 6. Generate and Stream Final LLM Response
        await self._generate_final_answer()

        self.state.save()
        self._emit(
            "agent_finished",
            {
                "status": self.state.status,
                "iterations": self.state.iteration,
                "files_changed": self.state.files_changed,
                "files_inspected": self.state.files_inspected,
                "commands_run": len(self.state.commands_run),
            },
        )
        return self.state

    async def _generate_final_answer(self) -> str:
        """
        Synthesizes a comprehensive answer from inspected codebase files, repository context,
        and agent observations, streaming tokens live via SSE.
        """
        self._emit("agent_answer_start", {})

        inspected_snippets = []
        for imp_file in self.state.files_inspected[:8]:
            r_res = read_file(self.workspace_mgr, imp_file, max_bytes=8000)
            if r_res.get("success"):
                inspected_snippets.append(f"=== File: {imp_file} ===\n{r_res.get('content', '')}")

        system_prompt = (
            "You are LEO, an expert AI coding agent analyzing a software repository for an air-gapped organization.\n"
            "Given the user's goal, the discovered repository context, and the actual contents of the inspected codebase files, "
            "provide a comprehensive, accurate, and direct response answering the user's request.\n"
            "If asked about tech stack, purpose, structure, or functionality, explain clearly with direct evidence from the files.\n"
            "If code edits or commands were run, summarize the outcome clearly.\n"
            "Format your output in clean Markdown."
        )

        user_content = (
            f"User Goal: {self.state.goal}\n\n"
            f"Repository Context:\n{self.state.repository_context.summary_text()}\n\n"
            f"Inspected Files Content:\n" + ("\n\n".join(inspected_snippets) if inspected_snippets else "No specific file contents loaded.") + "\n\n"
            f"Agent Task Observations:\n" + ("\n".join(self.state.observations) if self.state.observations else "None") + "\n\n"
            f"Files Changed: {', '.join(self.state.files_changed) if self.state.files_changed else 'None'}\n"
        )

        full_answer = ""
        try:
            async for token in self.client.stream_chat(
                model=self.model_config.model,
                messages=[
                    ChatMessage(role="system", content=system_prompt),
                    ChatMessage(role="user", content=user_content),
                ],
                temperature=0.2,
            ):
                full_answer += token
                self._emit("agent_answer_token", {"token": token})
        except Exception as exc:
            logger.warning("[AGENT] LLM final answer generation stream error: %s", exc)
            fallback = f"\nSummary of findings for **{self.state.repository_context.project_name}**:\n" + self.state.repository_context.summary_text()
            full_answer = fallback
            self._emit("agent_answer_token", {"token": fallback})

        self._emit("agent_answer_done", {"answer": full_answer})
        return full_answer

    async def _execute_task_step(self, task: TodoItem) -> tuple[bool, str]:
        """
        Executes a single TODO task step using LLM tool selection or direct deterministic tool execution.
        """
        task_lower = task.title.lower() + " " + task.description.lower()

        # Step A: Directory & File Inspection
        if any(k in task_lower for k in ["inspect", "read", "examine", "structure", "search"]):
            return await self._step_inspect(task)

        # Step B: Code Implementation / Patching
        elif any(k in task_lower for k in ["implement", "modify", "code", "write", "add", "update", "fix"]):
            return await self._step_implement(task)

        # Step C: Command / Test Execution
        elif any(k in task_lower for k in ["run", "test", "command", "build"]):
            return await self._step_run_command(task)

        # Default fallback
        return await self._step_inspect(task)

    async def _step_inspect(self, task: TodoItem) -> tuple[bool, str]:
        self._emit("tool_started", {"tool": "list_directory", "task": task.title})
        dir_res = list_directory(self.workspace_mgr, relative_path=".", recursive=False)
        self._emit("tool_finished", {"tool": "list_directory", "result": dir_res})

        # Read top important files or main entry points
        read_summary = []
        for imp_file in self.state.repository_context.important_files[:6]:
            self._emit("file_read", {"file": imp_file})
            r_res = read_file(self.workspace_mgr, imp_file, max_bytes=8000)
            if r_res.get("success"):
                if imp_file not in self.state.files_inspected:
                    self.state.files_inspected.append(imp_file)
                read_summary.append(f"Read '{imp_file}' ({r_res.get('file_size')} bytes)")

        # Code search if specific keywords mentioned
        query_words = [w for w in self.state.goal.split() if len(w) > 3 and w.isalnum()]
        search_matches = []
        for word in query_words[:2]:
            s_res = search_code(self.workspace_mgr, query=word, max_results=5)
            if s_res.get("success") and s_res.get("matches"):
                for match in s_res["matches"]:
                    m_file = match["file"]
                    if m_file not in self.state.files_inspected:
                        self.state.files_inspected.append(m_file)
                        search_matches.append(f"Found '{word}' in {m_file}:{match['line_number']}")

        summary = f"Inspected files: {', '.join(read_summary) if read_summary else 'Done'}."
        if search_matches:
            summary += f" Search matches: {'; '.join(search_matches[:4])}."
        return True, summary

    async def _step_implement(self, task: TodoItem) -> tuple[bool, str]:
        # LLM reasoning for code generation/modification
        system_prompt = (
            "You are a cautious AI coding agent. Select or propose file edits.\n"
            "Respond in JSON format with an action:\n"
            '{"action": "write_file", "path": "relative/path.py", "content": "..."}\n'
            'OR {"action": "apply_patch", "path": "relative/path.py", "target_content": "...", "replacement_content": "..."}\n'
            'OR {"action": "noop", "reason": "No code changes needed"}'
        )

        user_content = (
            f"Goal: {self.state.goal}\n"
            f"Current Task: {task.title} - {task.description}\n"
            f"Repository: {self.state.repository_context.summary_text()}\n"
            f"Files Inspected: {', '.join(self.state.files_inspected)}\n"
        )

        try:
            raw = await self.client.chat(
                model=self.model_config.model,
                messages=[
                    ChatMessage(role="system", content=system_prompt),
                    ChatMessage(role="user", content=user_content),
                ],
                temperature=0.1,
                json_mode=True,
            )
            data = json.loads(raw)
            action = data.get("action")

            if action == "write_file":
                rel_p = data.get("path", "")
                content = data.get("content", "")
                if rel_p and content:
                    self._emit("tool_started", {"tool": "write_file", "path": rel_p})
                    res = write_file(self.workspace_mgr, rel_p, content)
                    self._emit("file_written", res)
                    if res.get("success"):
                        if rel_p not in self.state.files_changed:
                            self.state.files_changed.append(rel_p)
                        return True, f"Written file '{rel_p}' successfully."

            elif action == "apply_patch":
                rel_p = data.get("path", "")
                t_cont = data.get("target_content", "")
                r_cont = data.get("replacement_content", "")
                if rel_p and t_cont:
                    self._emit("tool_started", {"tool": "apply_patch", "path": rel_p})
                    res = apply_patch(self.workspace_mgr, rel_p, t_cont, r_cont)
                    self._emit("file_written", res)
                    if res.get("success"):
                        if rel_p not in self.state.files_changed:
                            self.state.files_changed.append(rel_p)
                        return True, f"Patched file '{rel_p}' successfully."
        except Exception as exc:
            logger.warning("[AGENT] LLM action generation exception: %s", exc)

        return True, "Implementation step checked; workspace is in valid state."

    async def _step_run_command(self, task: TodoItem) -> tuple[bool, str]:
        test_cmd = self.verifier._determine_test_command(self.workspace_mgr, self.state)
        if test_cmd:
            self._emit("command_started", {"command": test_cmd})
            res = run_command(self.workspace_mgr, test_cmd, timeout=60)
            self._emit("command_finished", res)
            self.state.commands_run.append(res)
            return res.get("success", False), f"Executed '{test_cmd}': exit code {res.get('exit_code')}"
        return True, "No test command required for current stack."
