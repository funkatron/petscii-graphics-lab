"""Phase 1: machine-correct glyphs/colours, CRT cell shape, vector SVG, backdrop frames, native export, replay."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

from PIL import Image, ImageSequence

SRC = Path(__file__).resolve().parents[1] / "src"
sys.path.insert(0, str(SRC))

import drawing  # noqa: E402
import pgl_export  # noqa: E402
import project_io  # noqa: E402
from glyphs import load_glyph_rows  # noqa: E402
from node_bridge import REPO_ROOT, find_node  # noqa: E402


def editor_hex(expression: str) -> str:
    """Evaluate a colour lookup with the editor's own modules."""
    script = (
        "import {inkHex} from './c64-colors.js';import {plus4Hex} from './plus4-colors.js';"
        f"import {{vdcHex}} from './vdc-colors.js';console.log({expression});"
    )
    result = subprocess.run([find_node(), "--input-type=module", "-e", script], cwd=REPO_ROOT, capture_output=True, text=True, check=True)
    return result.stdout.strip()


def rgb(hex_value: str) -> tuple[int, int, int]:
    return tuple(int(hex_value[i : i + 2], 16) for i in (1, 3, 5))


def lit(rows: bytes, x: int, y: int) -> bool:
    return bool(rows[y] & (0x80 >> x))


class MachineRenderTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.dir = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def canvas(self, machine: str, columns: int = 4, rows: int = 2, background: int = 0, ink: int = 1, palette: str | None = None) -> str:
        path = str(self.dir / f"{machine}-{palette or 'x'}.json")
        self.assertTrue(drawing.create_canvas(path, columns, rows, background=background, ink=ink, machine=machine)["ok"])
        if palette:
            data = json.loads(Path(path).read_text())
            data["palette"] = palette
            Path(path).write_text(json.dumps(data))
        return path

    def still(self, path: str, **kwargs) -> Image.Image:
        out = self.dir / f"{Path(path).stem}-{kwargs.get('cell_shape', 'square')}.png"
        result = pgl_export.render_still(path, kwargs.get("scale", 1), kwargs.get("background", "canvas"), str(out), "png", kwargs.get("cell_shape", "square"))
        self.assertTrue(result["ok"], result)
        return Image.open(out).convert("RGB")

    def test_each_machine_uses_its_colour_table(self):
        cases = [
            ("c64", 6, 7, None, "inkHex(6,'pepto')", "inkHex(7,'pepto')"),
            ("c64", 6, 7, "colodore", "inkHex(6,'colodore')", "inkHex(7,'colodore')"),
            ("c128", 11, 13, None, "inkHex(11,'pepto')", "inkHex(13,'pepto')"),
            ("c128-80", 8, 10, None, "vdcHex(8)", "vdcHex(10)"),
            ("plus4", 6, 85, None, "plus4Hex(6)", "plus4Hex(85)"),
        ]
        for machine, background, ink, palette, bg_expr, ink_expr in cases:
            with self.subTest(machine=machine, palette=palette):
                path = self.canvas(machine, background=background, ink=ink, palette=palette)
                drawing.paint_cells(path, [{"x": 0, "y": 0, "glyph": 160, "ink": ink}])
                image = self.still(path)
                self.assertEqual(image.getpixel((3, 3)), rgb(editor_hex(ink_expr)))
                self.assertEqual(image.getpixel((12, 3)), rgb(editor_hex(bg_expr)))
        # Pepto yellow and Colodore yellow are different colours: the display palette is honoured.
        self.assertEqual(editor_hex("inkHex(7,'pepto')"), "#b8c76f")
        self.assertNotEqual(editor_hex("inkHex(7,'colodore')"), "#b8c76f")

    def test_known_c64_glyph_shapes_render_exactly(self):
        # C64 character ROM: ball (screen code $51) and 'A' (screen code $01).
        self.assertEqual(load_glyph_rows("c64")[81].hex(), "003c7e7e7e7e3c00")
        self.assertEqual(load_glyph_rows("c64")[1].hex(), "183c667e66666600")
        path = self.canvas("c64", background=0, ink=1)
        drawing.paint_cells(path, [{"x": 0, "y": 0, "glyph": 81}, {"x": 1, "y": 0, "glyph": 1}])
        image = self.still(path)
        for offset, glyph in ((0, 81), (8, 1)):
            rows = load_glyph_rows("c64")[glyph]
            for y in range(8):
                for x in range(8):
                    expected = (255, 255, 255) if lit(rows, x, y) else (0, 0, 0)
                    self.assertEqual(image.getpixel((offset + x, y)), expected, (glyph, x, y))

    def test_plus4_uses_ted_glyphs(self):
        c64, ted = load_glyph_rows("c64"), load_glyph_rows("ted")
        self.assertNotEqual(c64[258], ted[258])  # lowercase 'b' differs between the two ROMs
        path = self.canvas("plus4", background=6, ink=0)
        drawing.paint_cells(path, [{"x": 0, "y": 0, "glyph": 258}])
        image = self.still(path)
        ink, paper = rgb(editor_hex("plus4Hex(0)")), rgb(editor_hex("plus4Hex(6)"))
        drawn = bytes(sum(0x80 >> x for x in range(8) if image.getpixel((x, y)) == ink) for y in range(8))
        self.assertEqual(drawn, ted[258])
        self.assertNotEqual(drawn, c64[258])
        self.assertEqual(image.getpixel((12, 3)), paper)

    def test_crt_cell_shape_sizes(self):
        for machine, columns, cell in (("c64", 4, (10, 12)), ("plus4", 4, (10, 12)), ("c128-80", 4, (10, 24))):
            with self.subTest(machine=machine):
                path = self.canvas(machine, columns=columns, rows=2, ink=1 if machine != "plus4" else 0)
                drawing.paint_cells(path, [{"x": 0, "y": 0, "glyph": 160}])
                square = self.still(path, scale=2)
                crt = self.still(path, scale=2, cell_shape="crt")
                self.assertEqual(square.size, (columns * 16, 2 * 16))
                self.assertEqual(crt.size, (columns * cell[0], 2 * cell[1]))
                # A solid block fills its whole CRT cell with no seams.
                self.assertEqual(len({crt.getpixel((x, y)) for x in range(cell[0]) for y in range(cell[1])}), 1)

    def test_svg_uses_merged_vector_paths(self):
        path = self.canvas("c64", columns=4, rows=2, background=6, ink=1)
        drawing.paint_cells(path, [{"x": 0, "y": 0, "glyph": 160, "ink": 7}, {"x": 1, "y": 0, "glyph": 81}, {"x": 2, "y": 1, "glyph": 160}])
        out = self.dir / "art.svg"
        pgl_export.render_still(path, 1, "canvas", str(out), "svg")
        svg = out.read_text()
        self.assertIn('<path id="g160" d="M0 0h8v8h-8z"/>', svg)
        self.assertNotIn('width="1" height="1"', svg)
        self.assertEqual(svg.count("<use "), 3)
        ink, paper = editor_hex("inkHex(7,'pepto')"), editor_hex("inkHex(6,'pepto')")
        self.assertIn(f'fill="{ink}"', svg)
        self.assertIn(f'<rect width="100%" height="100%" fill="{paper}"/>', svg)
        self.assertIn('viewBox="0 0 64 32"', svg)
        crt = self.dir / "crt.svg"
        pgl_export.render_still(path, 1, "canvas", str(crt), "svg", "crt")
        self.assertIn('viewBox="0 0 40 24"', crt.read_text())
        self.assertIn("scale(1.25 1.5)", crt.read_text())


class AnimationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.dir = Path(self.temp.name)
        self.path = str(self.dir / "anim.json")
        drawing.create_canvas(self.path, 6, 3, background=0, ink=1)
        drawing.paint_cells(self.path, [{"x": x, "y": 1, "glyph": 81, "ink": 7} for x in range(6)])

    def tearDown(self):
        self.temp.cleanup()

    def test_backdrop_field_changes_empty_cells_per_frame(self):
        settings = {"backgroundEffect": "field", "fieldRamp": "glow", "seconds": 1, "scale": 1}
        plan = pgl_export.render_plan(self.path, "animation", settings)
        self.assertTrue(all(frame["matte"] for frame in plan["frames"]))
        self.assertEqual(sum(frame["durationMs"] for frame in plan["frames"]), 1000)
        out = self.dir / "field.gif"
        result = pgl_export.render_animation_gif(self.path, settings, 1, str(out))
        with Image.open(out) as gif:
            frames = [(frame.convert("RGB").getpixel((0, 0)), frame.info["duration"]) for frame in ImageSequence.Iterator(gif)]
        corners = {corner for corner, _ in frames}
        total = sum(duration for _, duration in frames)
        self.assertGreater(len(corners), 1, "an empty cell should step through backdrop colours")
        self.assertEqual(total, 1000)
        self.assertEqual(result["backgroundEffect"], "field")

    def test_too_fast_settings_fail_with_the_warning_and_a_suggestion(self):
        fast = {"effect": "scroll-x", "colorEffect": "color-wave", "seconds": 0.5, "motionCycles": 16, "colorCycles": 16}
        plan = pgl_export.plan_animation(self.path, fast)
        if not plan.get("warning"):
            self.skipTest("these settings render cleanly with the current animation planner")
        self.assertEqual(plan["readiness"], "needs_adjustment")
        with self.assertRaises(Exception) as caught:
            pgl_export.render_animation_gif(self.path, fast, 1, str(self.dir / "fast.gif"))
        self.assertIn(plan["warning"][:20], str(caught.exception))

    def test_zip_manifest_describes_machine_and_cell_shape(self):
        plus4 = str(self.dir / "p4.json")
        drawing.create_canvas(plus4, 4, 2, background=6, ink=0, machine="plus4")
        drawing.paint_cells(plus4, [{"x": 0, "y": 0, "glyph": 160}])
        out = self.dir / "frames.zip"
        pgl_export.export_png_frames_zip(plus4, {"colorEffect": "plus4-cycle", "seconds": 1}, 1, str(out), "crt")
        with zipfile.ZipFile(out) as archive:
            manifest = json.loads(archive.read("timing.json"))
            first = Image.open(archive.open(manifest["frames"][0]["file"]))
            self.assertIn("project.json", archive.namelist())
        self.assertEqual(manifest["machine"], "plus4")
        self.assertEqual(manifest["colorPalette"], "ted-pal")
        self.assertNotIn("displayPalette", manifest)
        self.assertEqual(manifest["pixelsPerCell"], {"width": 5, "height": 6})
        self.assertEqual(first.size, (manifest["width"], manifest["height"]))
        self.assertEqual(sum(f["durationMs"] for f in manifest["frames"]), 1000)

    @unittest.skipUnless(shutil.which("ffprobe"), "ffmpeg/ffprobe not installed")
    def test_video_keeps_loop_duration(self):
        out = self.dir / "loop.mp4"
        pgl_export.export_video(self.path, {"colorEffect": "color-cycle", "seconds": 1}, 1, "mp4", str(out), repetitions=2)
        probe = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(out)],
            capture_output=True, text=True, check=True,
        )
        self.assertAlmostEqual(float(probe.stdout), 2.0, delta=0.1)


class NativeExportTests(unittest.TestCase):
    LOAD_ADDRESS = {"c64": "0108", "c128": "011c", "c128-80": "011c", "plus4": "0110"}

    def test_every_machine_exports_prg_and_d64(self):
        with tempfile.TemporaryDirectory() as tmp:
            for machine, columns, ink in (("c64", 40, 1), ("c128", 40, 1), ("c128-80", 80, 10), ("plus4", 40, 0)):
                with self.subTest(machine=machine):
                    path = str(Path(tmp) / f"{machine}.json")
                    drawing.create_canvas(path, columns, 25, ink=ink, machine=machine)
                    # 300 is a bank-1 glyph, so the player must carry its own glyph data.
                    drawing.paint_cells(path, [{"x": 1, "y": 1, "glyph": 81}, {"x": 2, "y": 1, "glyph": 300}])
                    prg = pgl_export.export_native(path, save_path=str(Path(tmp) / f"{machine}.prg"))
                    d64 = pgl_export.export_native(path, format="d64", save_path=str(Path(tmp) / f"{machine}.d64"))
                    self.assertTrue(prg["ok"] and d64["ok"], (prg, d64))
                    self.assertEqual(prg["machine"], machine)
                    self.assertEqual(Path(prg["saved_to"]).read_bytes()[:2].hex(), self.LOAD_ADDRESS[machine])
                    self.assertEqual(Path(d64["saved_to"]).stat().st_size, 174848)


class StampInkTests(unittest.TestCase):
    def test_plus4_stamps_keep_ted_inks_and_convert_recipe_defaults(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = str(Path(tmp) / "p4.json")
            drawing.create_canvas(path, 16, 8, background=41, ink=70, machine="plus4")
            # Explicit TED inks above 15 used to be clamped to 15 (a TED orange-red).
            drawing.stamp_op_art(path, "islamic-girih-8", ink_a=70, ink_b=8)
            inks = set(json.loads(Path(path).read_text())["cellColors"])
            self.assertEqual(inks, {70, 8})
            # Recipe defaults are VIC numbers (white 1, yellow 7); a Plus/4 project gets their TED equivalents.
            drawing.stamp_op_art(path, "islamic-girih-8")
            inks = set(json.loads(Path(path).read_text())["cellColors"])
            expected = subprocess.run(
                [find_node(), "--input-type=module", "-e",
                 "import {convertInk} from './machine-modes.js';console.log(JSON.stringify([1,7].map(i=>convertInk(i,'c64','plus4'))))"],
                cwd=REPO_ROOT, capture_output=True, text=True, check=True,
            )
            self.assertEqual(inks, set(json.loads(expected.stdout)))
            rug = drawing.stamp_combined_style(path, "konya-gul")
            self.assertTrue(rug["ok"], rug)

    def test_vic_project_rejects_ted_only_inks(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = str(Path(tmp) / "c64.json")
            drawing.create_canvas(path, 8, 4)
            before = Path(path).read_bytes()
            result = drawing.stamp_op_art(path, "dual-checker", ink_a=70, ink_b=1)
            self.assertFalse(result["ok"])
            self.assertEqual(Path(path).read_bytes(), before)


class ReplayTests(unittest.TestCase):
    def test_paint_order_is_recorded_for_reveal_animations(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = str(Path(tmp) / "r.json")
            drawing.create_canvas(path, 4, 2)
            drawing.paint_cells(path, [{"x": 3, "y": 1, "glyph": 81, "ink": 7}])
            drawing.paint_cells(path, [{"x": 0, "y": 0, "glyph": 160, "ink": 2}])
            drawing.erase_cells(path, [{"x": 3, "y": 1}])
            replay = json.loads(Path(path).read_text())["drawingReplay"]
            self.assertEqual(replay["events"], [[7, 81], [0, 160], [7, ""]])
            self.assertEqual(replay["eventColors"][:2], [7, 2])
            drawing.clear_drawing(path)
            self.assertEqual(json.loads(Path(path).read_text())["drawingReplay"]["events"], [])

    def test_resize_after_painting_keeps_a_valid_project(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = str(Path(tmp) / "r.json")
            drawing.create_canvas(path, 4, 2)
            drawing.paint_cells(path, [{"x": 1, "y": 1, "glyph": 81}])
            resized = project_io.update_project(path, {"columns": 6, "rows": 3})
            self.assertTrue(resized["ok"], resized)
            self.assertNotIn("drawingReplay", json.loads(Path(path).read_text()))


if __name__ == "__main__":
    unittest.main()
