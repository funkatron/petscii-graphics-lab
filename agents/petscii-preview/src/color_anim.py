"""Render PGL color-animation frame JSON into GIF sequences (compat wrapper)."""

from __future__ import annotations

from pathlib import Path

from pgl_export import render_animation_gif


def render_color_animation_gif(
    effect: str,
    out_path: Path,
    *,
    scale: int = 2,
    json_path: Path | None = None,
    project_path: Path | None = None,
    motion: str = "rotating-cube",
) -> Path:
    settings = {
        "colorEffect": effect,
        "motionEffect": motion,
    }
    result = render_animation_gif(
        str(project_path) if project_path else None,
        settings=settings,
        scale=scale,
        save_path=str(out_path),
    )
    if not result.get("ok"):
        raise RuntimeError(result.get("error", "color animation render failed"))
    return Path(result["saved_to"])
