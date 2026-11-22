"""Phase 0 safety regressions: atomic saves, input checks, honest no-ops, sessions, guards."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

SRC = Path(__file__).resolve().parents[1] / "src"
sys.path.insert(0, str(SRC))

import drawing  # noqa: E402
import pgl_export  # noqa: E402
import project_io  # noqa: E402
from project_store import EXAMPLES_DIR, ProjectError  # noqa: E402


def read(path: str) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def history_depth(path: str) -> int:
    _, _, history = drawing._session_paths(path)
    if not history.exists():
        return 0
    return len(json.loads(history.read_text(encoding="utf-8"))["undo"])


class DrawingSafetyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.dir = Path(self.temp.name)
        self.path = str(self.dir / "piece.json")
        self.assertTrue(drawing.create_canvas(self.path, 16, 10, background=0, ink=1)["ok"])

    def tearDown(self):
        self.temp.cleanup()

    def test_invalid_glyph_is_rejected_before_writing(self):
        before = Path(self.path).read_bytes()
        with self.assertRaisesRegex(ProjectError, "0–511"):
            drawing.paint_cells(self.path, [{"x": 1, "y": 1, "glyph": 999}])
        self.assertEqual(Path(self.path).read_bytes(), before)
        self.assertTrue(project_io.validate_project(self.path)["ok"])
        self.assertEqual(history_depth(self.path), 0)

    def test_invalid_ink_for_machine_never_reaches_disk(self):
        # Ink 99 passes the type check but not the C64 palette; the atomic save rejects it.
        before = Path(self.path).read_bytes()
        result = drawing.paint_cells(self.path, [{"x": 1, "y": 1, "ink": 99}])
        self.assertFalse(result["ok"])
        self.assertEqual(Path(self.path).read_bytes(), before)
        self.assertEqual(history_depth(self.path), 0)
        leftovers = [p.name for p in self.dir.iterdir() if p.name.startswith(".")]
        self.assertEqual(leftovers, [])

    def test_bad_coordinates_are_rejected(self):
        with self.assertRaisesRegex(ProjectError, "outside"):
            drawing.paint_cells(self.path, [{"x": 16, "y": 0}])
        with self.assertRaisesRegex(ProjectError, "integer"):
            drawing.paint_cells(self.path, [{"x": "a", "y": 0}])
        with self.assertRaisesRegex(ProjectError, "x and y"):
            drawing.paint_cells(self.path, [{"x": 1}])
        with self.assertRaisesRegex(ProjectError, "outside"):
            drawing.fill(self.path, -1, 0)

    def test_no_op_edits_do_not_add_undo_steps(self):
        drawing.set_tool_state(self.path, {"glyph": 160, "ink": 14})
        self.assertEqual(drawing.paint_cells(self.path, [{"x": 2, "y": 2}])["changed"], 1)
        self.assertEqual(history_depth(self.path), 1)
        again = drawing.paint_cells(self.path, [{"x": 2, "y": 2}])
        self.assertTrue(again["ok"])
        self.assertEqual(again["changed"], 0)
        self.assertEqual(history_depth(self.path), 1)

    def test_selection_is_clamped_and_required(self):
        with self.assertRaisesRegex(ProjectError, "no selection"):
            drawing.move_selection(self.path, 1, 1)
        drawing.set_tool_state(self.path, {"glyph": 81, "ink": 7})
        drawing.paint_cells(self.path, [{"x": 15, "y": 9}])
        selected = drawing.select_rect(self.path, 12, 7, 60, 40)
        self.assertEqual(selected["selection"], {"x0": 12, "y0": 7, "x1": 15, "y1": 9})
        copied = drawing.duplicate_selection(self.path, -4, 0)
        self.assertTrue(copied["ok"])
        data = read(self.path)
        self.assertEqual(data["grid"][9 * 16 + 11], 81)
        with self.assertRaisesRegex(ProjectError, "outside"):
            drawing.select_rect(self.path, 30, 30, 40, 40)

    def test_sessions_are_keyed_by_full_path(self):
        other_dir = self.dir / "other"
        other_dir.mkdir()
        other = str(other_dir / "piece.json")  # same file name, different folder
        drawing.create_canvas(other, 16, 10)
        drawing.set_tool_state(self.path, {"glyph": 81})
        self.assertEqual(drawing.get_tool_state(other)["glyph"], 160)
        drawing.paint_cells(self.path, [{"x": 0, "y": 0}])
        self.assertFalse(drawing.undo(other)["ok"])
        self.assertTrue(drawing.undo(self.path)["ok"])

    def test_text_errors_do_not_touch_the_file(self):
        before = Path(self.path).read_bytes()
        with self.assertRaisesRegex(ProjectError, "Unsupported"):
            drawing.place_text(self.path, "HI~", 0, 0)
        with self.assertRaisesRegex(ProjectError, "does not fit"):
            drawing.place_text(self.path, "X" * 200, 0, 0)
        self.assertEqual(Path(self.path).read_bytes(), before)

    def test_bad_symmetry_is_rejected(self):
        with self.assertRaisesRegex(ProjectError, "symmetry"):
            drawing.set_tool_state(self.path, {"symmetry": "diagonal"})


class MachineCanvasTests(unittest.TestCase):
    def test_80_column_canvas_uses_c128_80(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = str(Path(tmp) / "wide.json")
            created = drawing.create_canvas(path, 80, 25)
            self.assertTrue(created["ok"], created)
            self.assertEqual(read(path)["machine"], "c128-80")

    def test_80_columns_rejected_for_c64(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "bad.json"
            with self.assertRaisesRegex(ProjectError, "1–40 columns"):
                drawing.create_canvas(str(path), 80, 25, machine="c64")
            self.assertFalse(path.exists())

    def test_create_project_accepts_machine(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = str(Path(tmp) / "wide.json")
            self.assertTrue(project_io.create_project(80, 25, ink=1, machine="c128-80", save_path=path)["ok"])
            with self.assertRaisesRegex(ProjectError, "unknown machine"):
                project_io.create_project(machine="vic20", save_path=path)


class GuardTests(unittest.TestCase):
    def test_examples_cannot_be_overwritten(self):
        example = EXAMPLES_DIR / "pgl-wordmark.json"
        before = example.read_bytes()
        with self.assertRaisesRegex(ProjectError, "tracked example"):
            project_io.update_project(str(example), {"name": "oops"})
        with self.assertRaisesRegex(ProjectError, "tracked example"):
            drawing.paint_cells(str(example), [{"x": 0, "y": 0}])
        with self.assertRaisesRegex(ProjectError, "tracked example"):
            pgl_export.render_still(str(example), save_path=str(EXAMPLES_DIR / "x.png"))
        self.assertEqual(example.read_bytes(), before)

    def test_update_project_rejects_bad_types(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = str(Path(tmp) / "p.json")
            project_io.create_project(8, 8, save_path=path)
            with self.assertRaisesRegex(ProjectError, "integer"):
                project_io.update_project(path, {"columns": "wide"})

    def test_copy_name_must_be_a_file_name(self):
        with self.assertRaisesRegex(ProjectError, "plain file name"):
            project_io.copy_project_to_workspace(None, "../escape.json")

    def test_color_ram_is_vic_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = str(Path(tmp) / "p4.json")
            self.assertTrue(project_io.create_project(8, 8, ink=0, machine="plus4", save_path=path)["ok"])
            with self.assertRaisesRegex(ProjectError, "VIC machines"):
                pgl_export.export_color_ram_bin(path, save_path=str(Path(tmp) / "x.bin"))


class TransparentGifTests(unittest.TestCase):
    def test_transparent_background_is_kept(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = str(Path(tmp) / "t.json")
            drawing.create_canvas(path, 8, 4)
            drawing.paint_cells(path, [{"x": 0, "y": 0, "glyph": 160, "ink": 1}])
            out = Path(tmp) / "t.gif"
            result = pgl_export.render_animation_gif(
                path, {"colorEffect": "color-cycle", "background": "transparent"}, scale=1, save_path=str(out)
            )
            self.assertTrue(result["ok"], result)
            with Image.open(out) as gif:
                self.assertIn("transparency", gif.info)
                rgba = gif.convert("RGBA")
                self.assertEqual(rgba.getpixel((20, 20))[3], 0)  # empty cell
                self.assertEqual(rgba.getpixel((2, 2))[3], 255)  # painted cell


if __name__ == "__main__":
    unittest.main()
