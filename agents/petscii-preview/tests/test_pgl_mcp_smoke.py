"""Smoke tests for PGL MCP project/export/drawing bridges."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "src"
sys.path.insert(0, str(SRC))

import drawing  # noqa: E402
import pgl_export  # noqa: E402
import project_io  # noqa: E402

EXAMPLES = Path(__file__).resolve().parents[1] / "examples"
RAVEN = EXAMPLES / "golden-fuzzy-raven.json"


class PglMcpSmokeTests(unittest.TestCase):
    def test_list_effects_includes_motion_and_color(self):
        effects = project_io.list_effects()
        self.assertIn("scroll-x", effects["motionEffects"])
        self.assertIn("color-wave", effects["colorEffects"])
        self.assertIn("plus4-cycle", effects["colorEffects"])

    def test_validate_raven(self):
        result = project_io.validate_project(str(RAVEN))
        self.assertTrue(result["ok"])

    def test_plan_scroll_color_wave(self):
        plan = pgl_export.plan_animation(
            str(RAVEN),
            {"effect": "scroll-x", "colorEffect": "color-wave", "seconds": 2},
        )
        self.assertGreaterEqual(plan["frameCount"], 8)
        self.assertEqual(plan.get("warning", ""), "")

    def test_create_update_draw_and_still(self):
        with tempfile.TemporaryDirectory() as tmp:
            project = Path(tmp) / "piece.json"
            created = project_io.create_project(10, 8, name="Smoke", save_path=str(project))
            self.assertTrue(created["ok"])
            updated = project_io.update_project(
                str(project),
                {"animation": {"effect": "wave", "colorEffect": "plasma", "seconds": 2}},
            )
            self.assertTrue(updated["ok"])
            drawing.set_tool_state(str(project), {"glyph": 160, "ink": 7})
            painted = drawing.paint_cells(str(project), [{"x": 1, "y": 1}, {"x": 2, "y": 1}])
            self.assertGreater(painted["changed"], 0)
            still = pgl_export.render_still(
                str(project),
                scale=2,
                save_path=str(Path(tmp) / "still.png"),
            )
            self.assertTrue(still["ok"])
            self.assertTrue(Path(still["saved_to"]).is_file())
            gif = pgl_export.render_animation_gif(
                str(project),
                {"effect": "wave", "colorEffect": "plasma", "seconds": 2},
                scale=1,
                save_path=str(Path(tmp) / "anim.gif"),
            )
            self.assertTrue(gif["ok"])
            self.assertTrue(Path(gif["saved_to"]).is_file())

    def test_c64_still_small_canvas(self):
        with tempfile.TemporaryDirectory() as tmp:
            project = Path(tmp) / "c64.json"
            project_io.create_project(16, 10, save_path=str(project))
            drawing.set_tool_state(str(project), {"glyph": 1, "ink": 1})
            drawing.place_text(str(project), "OK", 1, 1)
            result = pgl_export.export_c64(
                str(project),
                mode="still",
                format="prg",
                save_path=str(Path(tmp) / "out.prg"),
            )
            self.assertTrue(result.get("ok"), result)
            self.assertTrue(Path(result["saved_to"]).is_file())


if __name__ == "__main__":
    unittest.main()
