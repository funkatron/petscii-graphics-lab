"""Shared project file I/O for the petscii-preview MCP.

One place for: loading project JSON, validating with the editor's own
`project-validation.js`, atomic saves, and the guard that keeps tools from
overwriting the tracked example projects.
"""

from __future__ import annotations

import hashlib
import json
import os
import tempfile
from pathlib import Path
from typing import Any

from node_bridge import AGENT_ROOT, PGL_CLI, ensure_workspace, parse_json_stdout, run_node

EXAMPLES_DIR = AGENT_ROOT / "examples"
SESSIONS_DIRNAME = "sessions"


class ProjectError(ValueError):
    """An anticipated failure the caller can fix (bad input, missing file, invalid project)."""


def load(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise ProjectError(f"project not found: {path}")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise ProjectError(f"project is not valid JSON: {path} ({error.msg})") from error
    if not isinstance(data, dict):
        raise ProjectError(f"project must be a JSON object: {path}")
    return data


def parse_json_arg(text: str, name: str) -> Any:
    """Parse a JSON string tool argument with a readable error."""
    try:
        return json.loads(text)
    except json.JSONDecodeError as error:
        raise ProjectError(f"{name} is not valid JSON: {error.msg} at character {error.pos}") from error


def validate_file(path: Path) -> dict[str, Any]:
    """Validate a project file with the editor's project-validation.js."""
    result = run_node(PGL_CLI, ["validate", f"--project={path}"], check=False)
    return parse_json_stdout(result)


def is_example_path(path: Path) -> bool:
    try:
        path.resolve().relative_to(EXAMPLES_DIR.resolve())
    except ValueError:
        return False
    return True


def write_target(save_path: str | Path | None, default_name: str) -> Path:
    """Resolve where a tool may write. Defaults to the workspace; never inside examples/."""
    if save_path:
        path = Path(save_path).expanduser().resolve()
    else:
        path = ensure_workspace() / default_name
    if is_example_path(path):
        raise ProjectError(
            f"refusing to overwrite a tracked example: {path}. "
            "Call copy_project_to_workspace first, or pass a save_path outside examples/."
        )
    return path


def atomic_save(data: dict[str, Any], dest: Path) -> dict[str, Any]:
    """Validate `data` and replace `dest` only if it is a valid v3 project.

    The JSON is written to a temporary file in the destination folder, validated,
    then renamed over `dest`. A rejected project leaves `dest` untouched.
    """
    if is_example_path(dest):
        raise ProjectError(
            f"refusing to overwrite a tracked example: {dest}. Call copy_project_to_workspace first."
        )
    dest.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f".{dest.stem}-", suffix=".json", dir=dest.parent)
    temp = Path(temp_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(f"{json.dumps(data, indent=2)}\n")
        check = validate_file(temp)
        if not check.get("ok"):
            return {"ok": False, "error": check.get("error", "validation failed"), "project": str(dest)}
        os.replace(temp, dest)
    finally:
        if temp.exists():
            temp.unlink()
    return {"ok": True, "project": str(dest)}


def session_dir(project: Path) -> Path:
    """Per-project folder for brush state and undo history, keyed by absolute path."""
    resolved = str(project.resolve())
    digest = hashlib.sha256(resolved.encode("utf-8")).hexdigest()[:12]
    return ensure_workspace() / SESSIONS_DIRNAME / f"{project.stem}-{digest}"
