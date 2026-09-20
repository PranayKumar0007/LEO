import json
import re
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

from core.tools.filesystem import list_directory, read_file
from core.tools.shell import run_command
from core.tools.workspace import WorkspaceManager


class RepositoryContext(BaseModel):
    """
    Maintains active understanding and knowledge about the user repository.
    """

    workspace_path: str = ""
    project_name: str = ""
    project_description: str = ""
    tech_stack: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    frameworks: list[str] = Field(default_factory=list)
    package_managers: list[str] = Field(default_factory=list)
    build_system: str = ""
    test_framework: str = ""
    important_directories: list[str] = Field(default_factory=list)
    important_files: list[str] = Field(default_factory=list)
    entry_points: list[str] = Field(default_factory=list)
    readme_summary: str = ""
    architecture_summary: str = ""
    git_info: dict[str, Any] = Field(default_factory=dict)
    files_inspected: list[str] = Field(default_factory=list)
    files_changed: list[str] = Field(default_factory=list)
    tests_executed: list[dict[str, Any]] = Field(default_factory=list)
    command_results: list[dict[str, Any]] = Field(default_factory=list)
    observations: list[str] = Field(default_factory=list)

    def summary_text(self) -> str:
        """Formatted summary text for LLM prompts."""
        return (
            f"Project: {self.project_name}\n"
            f"Description: {self.project_description or 'N/A'}\n"
            f"Tech Stack: {', '.join(self.tech_stack) if self.tech_stack else 'Unknown'}\n"
            f"Languages: {', '.join(self.languages) if self.languages else 'Unknown'}\n"
            f"Frameworks: {', '.join(self.frameworks) if self.frameworks else 'None detected'}\n"
            f"Package Managers: {', '.join(self.package_managers) if self.package_managers else 'None'}\n"
            f"Build System: {self.build_system or 'N/A'}\n"
            f"Test Framework: {self.test_framework or 'N/A'}\n"
            f"Important Files: {', '.join(self.important_files[:10])}\n"
            f"Git Branch: {self.git_info.get('branch', 'N/A')}\n"
        )


def discover_repository(workspace_mgr: WorkspaceManager) -> RepositoryContext:
    """
    Performs lightweight discovery of the repository tech stack, config, and structure.
    """
    ctx = RepositoryContext(
        workspace_path=str(workspace_mgr.root),
        project_name=workspace_mgr.root.name,
    )

    # 1. Directory overview
    dir_res = list_directory(workspace_mgr, relative_path=".", recursive=False)
    if dir_res.get("success"):
        for entry in dir_res.get("entries", []):
            if entry["type"] == "directory":
                ctx.important_directories.append(entry["name"])

    # 2. Check config files & manifest files
    manifests = {
        "pyproject.toml": ("Python", "pip/poetry/uv"),
        "requirements.txt": ("Python", "pip"),
        "package.json": ("JavaScript/TypeScript", "npm/yarn/pnpm"),
        "Cargo.toml": ("Rust", "cargo"),
        "pom.xml": ("Java", "maven"),
        "build.gradle": ("Java/Kotlin", "gradle"),
        "go.mod": ("Go", "go modules"),
        "Dockerfile": ("Docker", "docker"),
        "docker-compose.yml": ("Docker", "docker-compose"),
    }

    for manifest, (lang, pkg_mgr) in manifests.items():
        m_path = workspace_mgr.root / manifest
        if m_path.exists():
            ctx.important_files.append(manifest)
            if lang not in ctx.languages:
                ctx.languages.append(lang)
            if pkg_mgr not in ctx.package_managers:
                ctx.package_managers.append(pkg_mgr)

    # Entry point candidates
    entry_candidates = [
        "main.py", "app.py", "index.js", "index.ts", "server.js", "server.ts",
        "src/index.js", "src/index.ts", "src/App.tsx", "src/main.rs", "main.go"
    ]
    for candidate in entry_candidates:
        if (workspace_mgr.root / candidate).exists() and candidate not in ctx.important_files:
            ctx.important_files.append(candidate)
            ctx.entry_points.append(candidate)

    # Inspect package.json details if present
    pkg_json_p = workspace_mgr.root / "package.json"
    if pkg_json_p.exists():
        read_res = read_file(workspace_mgr, "package.json")
        if read_res.get("success"):
            try:
                pkg_data = json.loads(read_res["content"])
                if "name" in pkg_data:
                    ctx.project_name = pkg_data["name"]
                if "description" in pkg_data:
                    ctx.project_description = pkg_data["description"]
                deps = {**pkg_data.get("dependencies", {}), **pkg_data.get("devDependencies", {})}
                if "react" in deps:
                    ctx.frameworks.append("React")
                if "vue" in deps:
                    ctx.frameworks.append("Vue")
                if "express" in deps:
                    ctx.frameworks.append("Express")
                if "next" in deps:
                    ctx.frameworks.append("Next.js")
                if "jest" in deps or "vitest" in deps:
                    ctx.test_framework = "jest/vitest"
            except json.JSONDecodeError:
                pass

    # Inspect pyproject.toml / requirements.txt details if present
    req_txt_p = workspace_mgr.root / "requirements.txt"
    if req_txt_p.exists():
        read_res = read_file(workspace_mgr, "requirements.txt")
        if read_res.get("success"):
            content = read_res["content"].lower()
            if "fastapi" in content:
                ctx.frameworks.append("FastAPI")
            if "django" in content:
                ctx.frameworks.append("Django")
            if "flask" in content:
                ctx.frameworks.append("Flask")
            if "pytest" in content:
                ctx.test_framework = "pytest"

    pyproject_p = workspace_mgr.root / "pyproject.toml"
    if pyproject_p.exists():
        read_res = read_file(workspace_mgr, "pyproject.toml")
        if read_res.get("success"):
            content = read_res["content"].lower()
            if "pytest" in content:
                ctx.test_framework = "pytest"
            if "poetry" in content:
                ctx.build_system = "poetry"
            elif "flit" in content:
                ctx.build_system = "flit"
            elif "hatch" in content:
                ctx.build_system = "hatch"

    # 3. Inspect README summary if present
    for r_name in ["README.md", "README.txt", "readme.md"]:
        r_p = workspace_mgr.root / r_name
        if r_p.exists():
            ctx.important_files.append(r_name)
            read_res = read_file(workspace_mgr, r_name, max_bytes=2000)
            if read_res.get("success"):
                lines = [line.strip() for line in read_res["content"].splitlines() if line.strip()]
                ctx.readme_summary = " ".join(lines[:5])
            break

    # Build tech stack aggregate
    ctx.tech_stack = list(dict.fromkeys(ctx.languages + ctx.frameworks + ctx.package_managers))

    # 4. Check git status
    if (workspace_mgr.root / ".git").exists():
        git_res = run_command(workspace_mgr, "git status --porcelain -b", timeout=5)
        if git_res.get("success"):
            stdout = git_res.get("stdout", "")
            lines = stdout.splitlines()
            branch = "unknown"
            if lines and lines[0].startswith("##"):
                branch = lines[0].replace("##", "").strip()
            ctx.git_info = {
                "is_git_repo": True,
                "branch": branch,
                "uncommitted_changes": [l for l in lines[1:] if l.strip()],
            }
        else:
            ctx.git_info = {"is_git_repo": True, "branch": "unknown"}
    else:
        ctx.git_info = {"is_git_repo": False}


    return ctx
