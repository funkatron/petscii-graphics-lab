"""paint_tone_map: typed tone maps through a legend."""

import json
import sys
import tempfile
import unittest
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / 'src'
sys.path.insert(0, str(SRC))

import drawing  # noqa: E402
import tone_map  # noqa: E402
from project_store import ProjectError  # noqa: E402

LEGEND = {'W': {'ink': 1}, 'G': 12, 'K': {'ink': 0}, 't': {'ink': 15, 'glyph': 227}}


class ToneMapTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = str(Path(self.temp.name) / 'face.json')
        drawing.create_canvas(self.path, 10, 6, background=0, ink=14, machine='c64')

    def tearDown(self):
        self.temp.cleanup()

    def cell(self, x, y):
        data = json.loads(Path(self.path).read_text(encoding='utf-8'))
        i = y * data['columns'] + x
        return data['grid'][i], data['cellColors'][i]

    def test_paints_legend_at_offset_and_leaves_transparent_cells(self):
        drawing.paint_cells(self.path, [{'x': 2, 'y': 1, 'glyph': 81, 'ink': 7}])
        result = tone_map.paint_tone_map(self.path, ['.WG', 'tKG'], LEGEND, x=2, y=1)
        self.assertTrue(result['ok'], result)
        self.assertEqual(self.cell(2, 1), (81, 7), 'transparent keeps what was there')
        self.assertEqual(self.cell(3, 1), (160, 1))
        self.assertEqual(self.cell(4, 1), (160, 12), 'a bare number is the ink')
        self.assertEqual(self.cell(2, 2), (227, 15), 'legend glyphs are used as given')
        self.assertEqual(self.cell(3, 2), (160, 0), 'black is paint, not empty')
        drawing.undo(self.path)
        self.assertEqual(self.cell(3, 1), ('', 14), 'one undo step')

    def test_smooth_edges_cut_open_corners_only(self):
        tone_map.paint_tone_map(self.path, ['.GG.', 'GGGG', '.GG.'], LEGEND, x=0, y=0, smooth_edges=True)
        self.assertEqual(self.cell(1, 0)[0], 233)
        self.assertEqual(self.cell(2, 0)[0], 223)
        self.assertEqual(self.cell(1, 2)[0], 95)
        self.assertEqual(self.cell(2, 2)[0], 105)
        self.assertEqual(self.cell(1, 1)[0], 160, 'interior stays solid')
        self.assertEqual(self.cell(0, 1)[0], 160, 'open on three sides stays solid')

    def test_rejects_bad_maps_without_changing_the_project(self):
        before = Path(self.path).read_text(encoding='utf-8')
        cases = [
            (['WG', 'W'], 'same width'),
            (['WX'], 'not in the legend: X'),
            (['W' * 11], 'does not fit'),
        ]
        for rows, message in cases:
            with self.assertRaisesRegex(ProjectError, message):
                tone_map.paint_tone_map(self.path, rows, LEGEND)
        with self.assertRaisesRegex(ProjectError, 'transparent'):
            tone_map.paint_tone_map(self.path, ['W.'], {'W': 1, '.': 2})
        with self.assertRaisesRegex(ProjectError, 'single characters'):
            tone_map.paint_tone_map(self.path, ['W'], {'WW': 1})
        with self.assertRaisesRegex(ProjectError, 'glyph'):
            tone_map.paint_tone_map(self.path, ['W'], {'W': {'ink': 1, 'glyph': 999}})
        self.assertEqual(Path(self.path).read_text(encoding='utf-8'), before)


if __name__ == '__main__':
    unittest.main()
