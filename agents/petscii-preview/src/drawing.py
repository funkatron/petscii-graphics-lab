"""Drawing-tool mutations for workspace PGL projects."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from node_bridge import PGL_CLI, ensure_workspace, parse_json_stdout, resolve_project, run_node
from project_io import DEFAULT_ANIMATION, save_project

TOOL_STATE_NAME = "tool-state.json"
HISTORY_NAME = "history.json"


def _session_paths(project_path: str) -> tuple[Path, Path, Path]:
    path = resolve_project(project_path)
    workspace = ensure_workspace()
    # Keep tool state / history beside the project when it lives in workspace;
    # otherwise use workspace sidecars keyed by stem.
    if path.parent == workspace:
        state_path = workspace / TOOL_STATE_NAME
        history_path = workspace / HISTORY_NAME
    else:
        state_path = workspace / f"{path.stem}-{TOOL_STATE_NAME}"
        history_path = workspace / f"{path.stem}-{HISTORY_NAME}"
    return path, state_path, history_path


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _write(path: Path, data: dict) -> None:
    path.write_text(f"{json.dumps(data, indent=2)}\n", encoding="utf-8")


def default_tool_state() -> dict:
    return {
        "glyph": 160,
        "ink": 14,
        "backgroundTarget": "ink",
        "symmetry": "none",
        "selection": None,
    }


def get_tool_state(project_path: str) -> dict:
    _, state_path, _ = _session_paths(project_path)
    if not state_path.exists():
        state = default_tool_state()
        _write(state_path, state)
        return {"ok": True, "state": state, "statePath": str(state_path)}
    return {"ok": True, "state": _load(state_path), "statePath": str(state_path)}


def set_tool_state(project_path: str, patch: dict[str, Any] | None = None) -> dict:
    _, state_path, _ = _session_paths(project_path)
    state = default_tool_state()
    if state_path.exists():
        state.update(_load(state_path))
    if patch:
        state.update(patch)
    _write(state_path, state)
    return {"ok": True, "state": state, "statePath": str(state_path)}


def _history(history_path: Path) -> dict:
    if not history_path.exists():
        return {"undo": [], "redo": []}
    return _load(history_path)


def _push_history(history_path: Path, snapshot: dict) -> None:
    hist = _history(history_path)
    hist["undo"].append(snapshot)
    if len(hist["undo"]) > 60:
        hist["undo"] = hist["undo"][-60:]
    hist["redo"] = []
    _write(history_path, hist)


def _snapshot(data: dict) -> dict:
    return {
        "columns": data["columns"],
        "rows": data["rows"],
        "grid": data["grid"][:],
        "cellColors": (data.get("cellColors") or [])[:],
        "colors": dict(data.get("colors") or {}),
        "animation": dict(data.get("animation") or DEFAULT_ANIMATION),
        "name": data.get("name"),
    }


def _apply_snapshot(data: dict, snap: dict) -> dict:
    data["columns"] = snap["columns"]
    data["rows"] = snap["rows"]
    data["grid"] = snap["grid"][:]
    data["cellColors"] = snap["cellColors"][:]
    data["colors"] = dict(snap["colors"])
    data["animation"] = dict(snap.get("animation") or DEFAULT_ANIMATION)
    if "name" in snap:
        data["name"] = snap["name"]
    return data


def _symmetry_points(x: int, y: int, columns: int, rows: int, mode: str) -> list[tuple[int, int]]:
    points = [(x, y)]
    if mode in ("horizontal", "both"):
        points.append((columns - 1 - x, y))
    if mode in ("vertical", "both"):
        points.append((x, rows - 1 - y))
    if mode == "both":
        points.append((columns - 1 - x, rows - 1 - y))
    return points


def _paint_point(data: dict, x: int, y: int, glyph: Any, ink: int, symmetry: str) -> int:
    columns = data["columns"]
    rows = data["rows"]
    changed = 0
    for px, py in _symmetry_points(x, y, columns, rows, symmetry):
        if px < 0 or py < 0 or px >= columns or py >= rows:
            continue
        index = py * columns + px
        if data["grid"][index] != glyph or data["cellColors"][index] != ink:
            data["grid"][index] = glyph
            data["cellColors"][index] = ink
            changed += 1
    return changed


def _ensure_inks(data: dict) -> None:
    ink = data.get("colors", {}).get("ink", 14)
    cell_count = data["columns"] * data["rows"]
    if "cellColors" not in data or len(data["cellColors"]) != cell_count:
        data["cellColors"] = [ink] * cell_count


def _mutate(project_path: str, mutator) -> dict:
    path, state_path, history_path = _session_paths(project_path)
    data = _load(path)
    _ensure_inks(data)
    state = default_tool_state()
    if state_path.exists():
        state.update(_load(state_path))
    _push_history(history_path, _snapshot(data))
    result = mutator(data, state)
    save = save_project(data, str(path))
    if not save.get("ok"):
        return save
    out = {"ok": True, "project": str(path), **result}
    return out


def paint_cells(project_path: str, cells: list[dict[str, Any]] | None = None) -> dict:
    """cells: [{x,y,glyph?,ink?}, ...]"""

    def mutate(data, state):
        changed = 0
        for cell in cells or []:
            x = int(cell["x"])
            y = int(cell["y"])
            glyph = cell.get("glyph", state["glyph"])
            ink = int(cell.get("ink", state["ink"]))
            changed += _paint_point(data, x, y, glyph, ink, state.get("symmetry", "none"))
        return {"changed": changed}

    return _mutate(project_path, mutate)


def erase_cells(project_path: str, cells: list[dict[str, int]] | None = None) -> dict:
    def mutate(data, state):
        changed = 0
        ink = state.get("ink", data.get("colors", {}).get("ink", 14))
        for cell in cells or []:
            changed += _paint_point(
                data,
                int(cell["x"]),
                int(cell["y"]),
                "",
                ink,
                state.get("symmetry", "none"),
            )
        return {"changed": changed}

    return _mutate(project_path, mutate)


def fill(project_path: str, x: int, y: int) -> dict:
    def mutate(data, state):
        columns = data["columns"]
        rows = data["rows"]
        if x < 0 or y < 0 or x >= columns or y >= rows:
            return {"changed": 0, "error": "out of bounds"}
        start = y * columns + x
        target_glyph = data["grid"][start]
        target_ink = data["cellColors"][start]
        new_glyph = state["glyph"]
        new_ink = state["ink"]
        if target_glyph == new_glyph and target_ink == new_ink:
            return {"changed": 0}
        stack = [(x, y)]
        seen = set()
        changed = 0
        while stack:
            cx, cy = stack.pop()
            if (cx, cy) in seen:
                continue
            if cx < 0 or cy < 0 or cx >= columns or cy >= rows:
                continue
            index = cy * columns + cx
            if data["grid"][index] != target_glyph or data["cellColors"][index] != target_ink:
                continue
            seen.add((cx, cy))
            data["grid"][index] = new_glyph
            data["cellColors"][index] = new_ink
            changed += 1
            stack.extend([(cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)])
        return {"changed": changed}

    return _mutate(project_path, mutate)


def draw_line(project_path: str, x0: int, y0: int, x1: int, y1: int) -> dict:
    def mutate(data, state):
        steps = max(abs(x1 - x0), abs(y1 - y0), 1)
        changed = 0
        for step in range(steps + 1):
            x = round(x0 + (x1 - x0) * step / steps)
            y = round(y0 + (y1 - y0) * step / steps)
            changed += _paint_point(
                data, x, y, state["glyph"], state["ink"], state.get("symmetry", "none")
            )
        return {"changed": changed}

    return _mutate(project_path, mutate)


def draw_rect(project_path: str, x0: int, y0: int, x1: int, y1: int, filled: bool = False) -> dict:
    def mutate(data, state):
        left, right = sorted((x0, x1))
        top, bottom = sorted((y0, y1))
        changed = 0
        for y in range(top, bottom + 1):
            for x in range(left, right + 1):
                on_edge = x in (left, right) or y in (top, bottom)
                if filled or on_edge:
                    changed += _paint_point(
                        data, x, y, state["glyph"], state["ink"], state.get("symmetry", "none")
                    )
        return {"changed": changed}

    return _mutate(project_path, mutate)


def place_text(project_path: str, text: str, x: int = 0, y: int = 0, ink: int | None = None) -> dict:
    import base64

    path, _, history_path = _session_paths(project_path)
    data = _load(path)
    _push_history(history_path, _snapshot(data))
    state = get_tool_state(project_path)["state"]
    brush = ink if ink is not None else state.get("ink", data.get("colors", {}).get("ink", 14))
    text_b64 = base64.b64encode(text.encode("utf-8")).decode("ascii")
    result = run_node(
        PGL_CLI,
        [
            "place-text",
            f"--project={path}",
            f"--out={path}",
            f"--text-b64={text_b64}",
            f"--x={x}",
            f"--y={y}",
            f"--ink={brush}",
        ],
        check=False,
    )
    return parse_json_stdout(result)


def select_rect(project_path: str, x0: int, y0: int, x1: int, y1: int) -> dict:
    left, right = sorted((x0, x1))
    top, bottom = sorted((y0, y1))
    return set_tool_state(
        project_path,
        {"selection": {"x0": left, "y0": top, "x1": right, "y1": bottom}},
    )


def deselect(project_path: str) -> dict:
    return set_tool_state(project_path, {"selection": None})


def _selection_cells(data: dict, selection: dict) -> list[tuple[int, int, Any, int]]:
    cells = []
    for y in range(selection["y0"], selection["y1"] + 1):
        for x in range(selection["x0"], selection["x1"] + 1):
            index = y * data["columns"] + x
            cells.append((x, y, data["grid"][index], data["cellColors"][index]))
    return cells


def move_selection(project_path: str, dx: int, dy: int) -> dict:
    def mutate(data, state):
        selection = state.get("selection")
        if not selection:
            return {"changed": 0, "error": "no selection"}
        cells = _selection_cells(data, selection)
        ink = data.get("colors", {}).get("ink", 14)
        for x, y, _, _ in cells:
            index = y * data["columns"] + x
            data["grid"][index] = ""
            data["cellColors"][index] = ink
        changed = 0
        for x, y, glyph, cell_ink in cells:
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= data["columns"] or ny >= data["rows"]:
                continue
            index = ny * data["columns"] + nx
            data["grid"][index] = glyph
            data["cellColors"][index] = cell_ink
            changed += 1
        state["selection"] = {
            "x0": selection["x0"] + dx,
            "y0": selection["y0"] + dy,
            "x1": selection["x1"] + dx,
            "y1": selection["y1"] + dy,
        }
        set_tool_state(project_path, {"selection": state["selection"]})
        return {"changed": changed, "selection": state["selection"]}

    return _mutate(project_path, mutate)


def duplicate_selection(project_path: str, dx: int = 1, dy: int = 0) -> dict:
    def mutate(data, state):
        selection = state.get("selection")
        if not selection:
            return {"changed": 0, "error": "no selection"}
        cells = _selection_cells(data, selection)
        changed = 0
        for x, y, glyph, cell_ink in cells:
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= data["columns"] or ny >= data["rows"]:
                continue
            index = ny * data["columns"] + nx
            data["grid"][index] = glyph
            data["cellColors"][index] = cell_ink
            changed += 1
        return {"changed": changed}

    return _mutate(project_path, mutate)


def delete_selection(project_path: str) -> dict:
    def mutate(data, state):
        selection = state.get("selection")
        if not selection:
            return {"changed": 0, "error": "no selection"}
        ink = data.get("colors", {}).get("ink", 14)
        changed = 0
        for x, y, _, _ in _selection_cells(data, selection):
            index = y * data["columns"] + x
            if data["grid"][index] != "" or data["cellColors"][index] != ink:
                data["grid"][index] = ""
                data["cellColors"][index] = ink
                changed += 1
        state["selection"] = None
        set_tool_state(project_path, {"selection": None})
        return {"changed": changed}

    return _mutate(project_path, mutate)


def clear_drawing(project_path: str) -> dict:
    def mutate(data, state):
        ink = data.get("colors", {}).get("ink", 14)
        count = data["columns"] * data["rows"]
        data["grid"] = [""] * count
        data["cellColors"] = [ink] * count
        return {"changed": count}

    return _mutate(project_path, mutate)


def recolor_drawing(project_path: str, ink: int) -> dict:
    def mutate(data, state):
        changed = 0
        for index, glyph in enumerate(data["grid"]):
            if glyph != "" and data["cellColors"][index] != ink:
                data["cellColors"][index] = ink
                changed += 1
        data.setdefault("colors", {})["ink"] = ink
        return {"changed": changed}

    return _mutate(project_path, mutate)


def stamp_border(project_path: str) -> dict:
    def mutate(data, state):
        columns = data["columns"]
        rows = data["rows"]
        glyph = state["glyph"]
        ink = state["ink"]
        changed = 0
        for x in range(columns):
            changed += _paint_point(data, x, 0, glyph, ink, "none")
            changed += _paint_point(data, x, rows - 1, glyph, ink, "none")
        for y in range(rows):
            changed += _paint_point(data, 0, y, glyph, ink, "none")
            changed += _paint_point(data, columns - 1, y, glyph, ink, "none")
        return {"changed": changed}

    return _mutate(project_path, mutate)


def stamp_checkerboard(project_path: str) -> dict:
    def mutate(data, state):
        columns = data["columns"]
        rows = data["rows"]
        glyph = state["glyph"]
        ink = state["ink"]
        changed = 0
        for y in range(rows):
            for x in range(columns):
                if (x + y) % 2 == 0:
                    changed += _paint_point(data, x, y, glyph, ink, "none")
        return {"changed": changed}

    return _mutate(project_path, mutate)


def undo(project_path: str) -> dict:
    path, _, history_path = _session_paths(project_path)
    hist = _history(history_path)
    if not hist["undo"]:
        return {"ok": False, "error": "nothing to undo"}
    data = _load(path)
    hist["redo"].append(_snapshot(data))
    snap = hist["undo"].pop()
    _apply_snapshot(data, snap)
    _write(history_path, hist)
    return save_project(data, str(path)) | {"undone": True}


def redo(project_path: str) -> dict:
    path, _, history_path = _session_paths(project_path)
    hist = _history(history_path)
    if not hist["redo"]:
        return {"ok": False, "error": "nothing to redo"}
    data = _load(path)
    hist["undo"].append(_snapshot(data))
    snap = hist["redo"].pop()
    _apply_snapshot(data, snap)
    _write(history_path, hist)
    return save_project(data, str(path)) | {"redone": True}
