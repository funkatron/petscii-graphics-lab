"""Paint, line, fill, text, and undo against a project file."""

import json
import sys
import tempfile
import unittest
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / 'src'
sys.path.insert(0, str(SRC))

import drawing


class DrawingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = str(Path(self.temp.name) / 'portrait.json')
        created = drawing.create_canvas(self.path, 40, 25, background=0, ink=1)
        self.assertTrue(created['ok'], created)

    def tearDown(self):
        self.temp.cleanup()

    def cell(self, x, y):
        data = json.loads(Path(self.path).read_text(encoding='utf-8'))
        index = y * data['columns'] + x
        return data['grid'][index], data['cellColors'][index]

    def test_mirror_glyphs_reflects_symmetric_copies(self):
        drawing.set_tool_state(self.path, {'glyph': 233, 'ink': 1, 'symmetry': 'both', 'mirrorGlyphs': True})
        painted = drawing.paint_cells(self.path, [{'x': 1, 'y': 1}])
        self.assertTrue(painted['ok'], painted)
        # Same partners as the editor's glyph-mirror.js: lower-right → lower-left / upper-right / upper-left.
        self.assertEqual([self.cell(x, y)[0] for x, y in [(1, 1), (38, 1), (1, 23), (38, 23)]], [233, 223, 95, 105])
        drawing.set_tool_state(self.path, {'glyph': 1, 'symmetry': 'horizontal'})
        drawing.draw_line(self.path, 3, 5, 4, 5)
        self.assertEqual(self.cell(36, 5)[0], 1, 'A has no mirrored partner and keeps its glyph')
        drawing.set_tool_state(self.path, {'mirrorGlyphs': False, 'glyph': 233})
        drawing.paint_cells(self.path, [{'x': 2, 'y': 8}])
        self.assertEqual(self.cell(37, 8)[0], 233)

    def test_mirror_glyphs_uses_plus4_shapes(self):
        self.assertEqual(drawing.mirror_glyph(233, True, False, 'plus4'), 223)
        self.assertEqual(drawing._mirror_tables('plus4'), drawing._mirror_tables('plus4'))
        self.assertNotEqual(drawing._mirror_tables('plus4'), drawing._mirror_tables('c64'))

    def test_mirror_glyphs_must_be_boolean(self):
        with self.assertRaisesRegex(drawing.ProjectError, 'mirrorGlyphs'):
            drawing.set_tool_state(self.path, {'mirrorGlyphs': 'yes'})

    def test_paint_line_fill_text_and_undo(self):
        drawing.set_tool_state(self.path, {'glyph': 160, 'ink': 14})
        painted = drawing.paint_cells(self.path, [{'x': 4, 'y': 4}])
        self.assertTrue(painted['ok'], painted)
        self.assertEqual(self.cell(4, 4), (160, 14))

        lined = drawing.draw_line(self.path, 0, 0, 3, 0)
        self.assertTrue(lined['ok'], lined)
        self.assertEqual(self.cell(2, 0)[0], 160)

        drawing.set_tool_state(self.path, {'glyph': 160, 'ink': 7})
        filled = drawing.fill(self.path, 1, 0)
        self.assertTrue(filled['ok'], filled)
        self.assertGreater(filled['changed'], 1)
        self.assertEqual(self.cell(1, 0), (160, 7))

        placed = drawing.place_text(self.path, 'HI', 10, 2, ink=1)
        self.assertTrue(placed['ok'], placed)
        self.assertEqual(self.cell(10, 2)[0], 8)
        self.assertEqual(self.cell(11, 2)[0], 9)

        undone = drawing.undo(self.path)
        self.assertTrue(undone['ok'], undone)
        self.assertEqual(self.cell(10, 2)[0], '')

        redone = drawing.redo(self.path)
        self.assertTrue(redone['ok'], redone)
        self.assertEqual(self.cell(10, 2)[0], 8)

        families = drawing.glyph_families()
        self.assertIn(160, families['families']['blocks'])


if __name__ == '__main__':
    unittest.main()
