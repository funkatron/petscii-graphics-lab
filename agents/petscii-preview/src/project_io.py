"""Project document CRUD for the petscii-preview MCP."""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

from node_bridge import (
    DEFAULT_PROJECT,
    EXPORT_ANIMATION,
    PGL_CLI,
    ensure_workspace,
    parse_json_stdout,
    resolve_project,
    run_node,
)

DEFAULT_ANIMATION = {
    "effect": "none",
    "colorEffect": "none",
    "seconds": 2,
    "scale": 2,
    "background": "dark",
    "motionCycles": 1,
    "colorCycles": 1,
    "cameraDistance": 4,
    "cameraOrbit": 0,
    "cameraElevation": 0,
    "cameraMotion": 0,
    "scrollDirection": "left",
    "waveDirection": "up",
    "waveShape": "sine",
    "waveAmplitude": 100,
    "waveLength": 50,
    "colorWaveDirection": "up-left",
    "colorWaveShape": "sawtooth",
    "colorWaveAmplitude": 100,
    "colorWaveLength": 50,
    "wipePattern": "diagonal",
    "depthTravel": "toward",
    "depthWaveShape": "sawtooth",
}


def list_effects() -> dict:
    result = run_node(EXPORT_ANIMATION, ["--list-effects"])
    return parse_json_stdout(result)


def validate_project(project_path: str | None = None) -> dict:
    path = resolve_project(project_path)
    result = run_node(PGL_CLI, ["validate", f"--project={path}"], check=False)
    return parse_json_stdout(result)


def load_project(project_path: str | None = None) -> dict:
    path = resolve_project(project_path)
    data = json.loads(path.read_text(encoding="utf-8"))
    return {"ok": True, "project": str(path), "data": data}


def save_project(data: dict, save_path: str | None = None) -> dict:
    workspace = ensure_workspace()
    path = Path(save_path).expanduser().resolve() if save_path else (workspace / "project.json")
    path.parent.mkdir(parents=True, exist_ok=True)
    # Validate via round-trip write + CLI
    path.write_text(f"{json.dumps(data, indent=2)}\n", encoding="utf-8")
    check = validate_project(str(path))
    if not check.get("ok"):
        return {"ok": False, "error": check.get("error", "validation failed"), "project": str(path)}
    return {"ok": True, "project": str(path)}


def create_project(
    columns: int = 16,
    rows: int = 16,
    ink: int = 14,
    background: int = 0,
    name: str = "Untitled",
    save_path: str | None = None,
) -> dict:
    if columns < 1 or columns > 40 or rows < 1 or rows > 40:
        return {"ok": False, "error": "Dimensions must be 1–40"}
    cell_count = columns * rows
    data = {
        "format": "petscii-stencil-lab",
        "version": 3,
        "name": name,
        "columns": columns,
        "rows": rows,
        "grid": [""] * cell_count,
        "cellColors": [ink] * cell_count,
        "colors": {"ink": ink, "background": background},
        "animation": dict(DEFAULT_ANIMATION),
    }
    return save_project(data, save_path)


def _resize_grid(
    grid: list,
    inks: list,
    old_w: int,
    old_h: int,
    new_w: int,
    new_h: int,
    fill_ink: int,
) -> tuple[list, list]:
    next_grid = [""] * (new_w * new_h)
    next_inks = [fill_ink] * (new_w * new_h)
    for y in range(min(old_h, new_h)):
        for x in range(min(old_w, new_w)):
            index_old = y * old_w + x
            index_new = y * new_w + x
            next_grid[index_new] = grid[index_old]
            next_inks[index_new] = inks[index_old]
    return next_grid, next_inks


def update_project(
    project_path: str,
    patch: dict[str, Any] | None = None,
    save_path: str | None = None,
) -> dict:
    path = resolve_project(project_path)
    data = json.loads(path.read_text(encoding="utf-8"))
    patch = patch or {}

    if "name" in patch:
        data["name"] = patch["name"]
    if "colors" in patch and isinstance(patch["colors"], dict):
        data.setdefault("colors", {})
        data["colors"].update(patch["colors"])
    if "animation" in patch and isinstance(patch["animation"], dict):
        data.setdefault("animation", dict(DEFAULT_ANIMATION))
        data["animation"].update(patch["animation"])

    old_w = data["columns"]
    old_h = data["rows"]
    new_w = int(patch["columns"]) if "columns" in patch else old_w
    new_h = int(patch["rows"]) if "rows" in patch else old_h
    ink = data.get("colors", {}).get("ink", 14)
    grid = data["grid"]
    inks = data.get("cellColors") or [ink] * (old_w * old_h)

    if "grid" in patch:
        grid = patch["grid"]
    if "cellColors" in patch:
        inks = patch["cellColors"]

    if new_w != old_w or new_h != old_h:
        grid, inks = _resize_grid(grid, inks, old_w, old_h, new_w, new_h, ink)
        data["columns"] = new_w
        data["rows"] = new_h

    data["grid"] = grid
    data["cellColors"] = inks
    dest = save_path or str(path)
    return save_project(data, dest)


def copy_project_to_workspace(project_path: str | None = None, name: str = "session.json") -> dict:
    source = resolve_project(project_path)
    dest = ensure_workspace() / name
    shutil.copy2(source, dest)
    return {"ok": True, "project": str(dest.resolve()), "source": str(source)}


def export_text_grid(project_path: str | None = None, include_colors: bool = True, out_path: str | None = None) -> dict:
    path = resolve_project(project_path)
    workspace = ensure_workspace()
    out = Path(out_path).expanduser().resolve() if out_path else (workspace / f"{path.stem}.txt")
    result = run_node(
        PGL_CLI,
        [
            "export-text-grid",
            f"--project={path}",
            f"--out={out}",
            f"--include-colors={'1' if include_colors else '0'}",
        ],
    )
    payload = parse_json_stdout(result)
    payload["out"] = str(out)
    return payload


def import_text_grid(
    text_path: str,
    project_path: str | None = None,
    out_path: str | None = None,
) -> dict:
    workspace = ensure_workspace()
    out = Path(out_path).expanduser().resolve() if out_path else (workspace / "imported.json")
    args = [
        "import-text-grid",
        f"--text={Path(text_path).expanduser().resolve()}",
        f"--out={out}",
    ]
    if project_path:
        args.append(f"--project={resolve_project(project_path)}")
    result = run_node(PGL_CLI, args)
    return parse_json_stdout(result)
