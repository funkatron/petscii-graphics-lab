"""Helpers to invoke Node bridges from the MCP server."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
AGENT_ROOT = Path(__file__).resolve().parents[1]
PGL_CLI = AGENT_ROOT / "pgl_cli.mjs"
WORKSPACE = AGENT_ROOT / "out" / "workspace"
DEFAULT_PROJECT = AGENT_ROOT / "examples" / "pgl-wordmark.json"


def find_node() -> str:
    """Node from PGL_NODE (set by run-mcp.sh), else the first `node` on PATH."""
    override = os.environ.get("PGL_NODE", "").strip()
    if override and Path(override).is_file() and os.access(override, os.X_OK):
        return override
    return shutil.which("node") or "node"


def run_node(script: Path, args: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    command = [find_node(), str(script), *args]
    return subprocess.run(
        command,
        check=check,
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
    )


def parse_json_stdout(result: subprocess.CompletedProcess[str]) -> dict:
    stdout = (result.stdout or "").strip()
    if stdout:
        line = stdout.splitlines()[-1]
        try:
            return json.loads(line)
        except json.JSONDecodeError:
            pass
    stderr = (result.stderr or "").strip()
    message = stderr.splitlines()[-1] if stderr else f"command failed with code {result.returncode}"
    return {"ok": False, "error": message, "stderr": stderr[-1000:] if stderr else ""}


def ensure_workspace() -> Path:
    WORKSPACE.mkdir(parents=True, exist_ok=True)
    return WORKSPACE


def resolve_project(project_path: str | None) -> Path:
    if project_path:
        return Path(project_path).expanduser().resolve()
    return DEFAULT_PROJECT.resolve()
