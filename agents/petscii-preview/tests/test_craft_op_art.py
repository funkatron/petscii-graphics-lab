"""Craft + op-art helpers for the petscii-preview MCP."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "src"
sys.path.insert(0, str(SRC))

import craft  # noqa: E402
import drawing  # noqa: E402
import op_art  # noqa: E402
import project_io  # noqa: E402
import world_art  # noqa: E402
import rug_styles  # noqa: E402


class CraftTests(unittest.TestCase):
    def test_list_drawing_references_portrait(self):
        out = craft.list_drawing_references("portrait")
        self.assertTrue(out["ok"])
        self.assertGreater(out["count"], 3)
        self.assertTrue(any(r["id"] == "IMG_0354" for r in out["references"]))

    def test_illustration_brief_op_art(self):
        brief = craft.illustration_brief("Bridget Riley style vertical op-art bars")
        self.assertEqual(brief["inferred_category"], "op-art")
        self.assertEqual(brief["op_art_recipe"]["id"], "vertical-bars")

    def test_shading_ladder(self):
        ladder = craft.shading_ladder(0)
        self.assertEqual(ladder["ladder"][0]["glyph"], 160)


class WorldArtTests(unittest.TestCase):
    def test_study_islamic(self):
        study = world_art.study_world_art("islamic")
        self.assertIn("islamic-girih-8", study["stamp_recipes"])

    def test_list_world_art_refs_on_disk(self):
        refs = world_art.list_world_art_references("islamic")
        self.assertGreaterEqual(refs["count"], 2)
        self.assertTrue(any(r["on_disk"] for r in refs["references"]))

    def test_brief_mandala(self):
        brief = craft.illustration_brief("Hindu lotus mandala")
        self.assertEqual(brief["op_art_recipe"]["id"], "mandala-lotus")
        self.assertIsNotNone(brief.get("world_art_study"))


class RugCombineTests(unittest.TestCase):
    def test_combine_indo_persian_cells(self):
        gen = rug_styles.generate_combined_cells("indo-persian-fusion", 40, 25)
        self.assertTrue(gen["ok"])
        self.assertGreater(gen["cell_count"], 200)

    def test_brief_oriental_rug(self):
        brief = craft.illustration_brief("Persian Ardabil oriental rug")
        self.assertEqual(brief.get("combine_style", {}).get("id"), "ardabil-medallion")

    def test_study_rug_tradition(self):
        study = world_art.study_world_art("rug")
        self.assertIn("combine_styles", study)


class OpArtTests(unittest.TestCase):
    def test_recipes_list(self):
        catalog = op_art.list_op_art_recipes()
        self.assertGreaterEqual(len(catalog["recipes"]), 6)

    def test_generate_line_moire_cells(self):
        gen = op_art.generate_pattern_cells("line-moire", 8, 4)
        self.assertTrue(gen["ok"])
        self.assertEqual(gen["cell_count"], 32)

    def test_generate_girih_and_kolam(self):
        girih = op_art.generate_pattern_cells("islamic-girih-8", 8, 8)
        kolam = op_art.generate_pattern_cells("kolam-pulli", 20, 12, period=4)
        self.assertEqual(girih["cell_count"], 64)
        self.assertTrue(kolam["cell_count"] < 200)

    def test_stamp_and_critique(self):
        with tempfile.TemporaryDirectory() as tmp:
            project = Path(tmp) / "abstract.json"
            project_io.create_project(10, 8, save_path=str(project))
            stamped = drawing.stamp_op_art(str(project), "dual-checker")
            self.assertTrue(stamped.get("ok"))
            self.assertIn("animation_suggest", stamped)
            review = craft.critique_drawing(str(project), style="op-art")
            self.assertEqual(review["critique_style"], "op-art")
            self.assertIn("score", review)


if __name__ == "__main__":
    unittest.main()