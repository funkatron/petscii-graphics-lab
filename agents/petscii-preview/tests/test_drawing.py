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
