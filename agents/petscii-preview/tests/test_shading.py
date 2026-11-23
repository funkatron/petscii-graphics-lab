"""gradient_fill, shade_shape and colour ramps."""

import json
import sys
import tempfile
import unittest
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / 'src'
sys.path.insert(0, str(SRC))

import drawing  # noqa: E402
import shading  # noqa: E402
from project_store import ProjectError  # noqa: E402


class ShadingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = str(Path(self.temp.name) / 'shade.json')
        drawing.create_canvas(self.path, 40, 25, background=0, ink=1, machine='c64')
        self.lum = {i['ink']: i['luminance'] for i in shading.color_ramps('c64')['by_luminance']}

    def tearDown(self):
        self.temp.cleanup()

    def data(self):
        return json.loads(Path(self.path).read_text(encoding='utf-8'))

    def row_brightness(self, data, y, x0=0, x1=39):
        cols = data['columns']
        total = 0.0
        for x in range(x0, x1 + 1):
            i = y * cols + x
            g = data['grid'][i]
            cover = 0 if g == '' else (0.5 if g in (102, 230) else 1)
            total += self.lum[data['cellColors'][i]] * cover
        return total / (x1 - x0 + 1)

    def test_measured_ramps_run_dark_to_light_on_every_machine(self):
        for machine in ('c64', 'c128', 'c128-80', 'plus4'):
            ramps = shading.color_ramps(machine)
            lum = {i['ink']: i['luminance'] for i in ramps['by_luminance']}
            self.assertEqual([i['luminance'] for i in ramps['by_luminance']],
                             sorted(i['luminance'] for i in ramps['by_luminance']))
            for name, ramp in ramps['ramps'].items():
                values = [lum[ink] for ink in ramp]
                self.assertTrue(all(a < b for a, b in zip(values, values[1:])),
                                f'{machine} {name} {ramp} {values}: every step must be brighter')
                self.assertGreaterEqual(len(ramp), 3, f'{machine} {name} has too few steps')
        self.assertLess(self.lum[2], self.lum[4], 'C64 red is darker than purple')

    def test_vertical_gradient_brightens_downwards_with_ordered_steps(self):
        result = drawing.set_tool_state(self.path, {})  # untouched brush
        result = shading.gradient_fill(self.path, 0, 0, 39, 15, [6, 4, 8, 10, 7], 'down')
        self.assertTrue(result['ok'], result)
        data = self.data()
        rows = [round(self.row_brightness(data, y), 3) for y in range(16)]
        self.assertEqual(rows, sorted(rows), 'each row at least as bright as the one above')
        self.assertEqual(set(data['cellColors'][i] for i in range(40)), {6})
        per_row = [{data['cellColors'][y * 40 + x] for x in range(40)} for y in range(16)]
        self.assertTrue(all(len(inks) <= 2 for inks in per_row), 'a row mixes at most two neighbouring inks')
        self.assertTrue(any(len(inks) == 2 for inks in per_row), 'steps between inks alternate cells')
        self.assertTrue(all(g in ('', 160) for g in data['grid'][:16 * 40]))
        self.assertEqual(data['grid'][16 * 40:], [''] * (9 * 40), 'outside the region is untouched')

    def test_gradient_is_one_undo_step_and_validates_input(self):
        shading.gradient_fill(self.path, 0, 0, 39, 24, [0, 11, 12, 15, 1], 'radial', 'checker')
        data = self.data()
        self.assertIn(102, data['grid'] + [230])
        self.assertTrue(any(g in (102, 230) for g in data['grid']), 'checker meets the black background')
        centre, corner = data['cellColors'][12 * 40 + 20], data['cellColors'][0]
        self.assertLess(self.lum[centre], self.lum[corner], 'radial starts at the centre')
        drawing.undo(self.path)
        self.assertEqual(set(self.data()['grid']), {''})
        with self.assertRaisesRegex(ProjectError, 'ramp'):
            shading.gradient_fill(self.path, 0, 0, 5, 5, [], 'down')
        with self.assertRaisesRegex(ProjectError, 'outside the c64 range'):
            shading.gradient_fill(self.path, 0, 0, 5, 5, [0, 16], 'down')
        with self.assertRaisesRegex(ProjectError, 'direction'):
            shading.gradient_fill(self.path, 0, 0, 5, 5, [0, 1], 'diagonal')
        with self.assertRaisesRegex(ProjectError, 'outside'):
            shading.gradient_fill(self.path, 50, 30, 60, 40, [0, 1], 'down')

    def test_sphere_is_lit_from_the_light_side_with_smooth_edges_and_specular(self):
        result = shading.shade_shape(self.path, 20, 12, 8, 8, [11, 12, 15, 1], light='top-left')
        self.assertTrue(result['ok'], result)
        data = self.data()
        cols = data['columns']
        def lum_at(x, y):
            return self.lum[data['cellColors'][y * cols + x]] if data['grid'][y * cols + x] != '' else 0
        upper_left = sum(lum_at(x, y) for x in range(14, 19) for y in range(6, 11))
        lower_right = sum(lum_at(x, y) for x in range(21, 26) for y in range(13, 18))
        self.assertGreater(upper_left, lower_right)
        self.assertEqual(sum(1 for i, g in enumerate(data['grid']) if g != '' and data['cellColors'][i] == 1), 1,
                         'exactly one specular cell in the lightest ink')
        edge = {g for g in data['grid'] if g not in ('', 160)}
        self.assertTrue(edge & {233, 223, 95, 105}, 'outline uses triangles')
        self.assertFalse(edge & {108, 123, 124, 126}, 'no single-corner quadrant spikes')
        self.assertEqual(data['grid'][0], '', 'nothing outside the outline')

    def test_cylinder_and_lights_and_validation(self):
        shading.shade_shape(self.path, 10, 12, 4, 6, [9, 2, 8, 10, 7], shape='cylinder', light='left', specular=False)
        data = self.data()
        left = data['cellColors'][12 * 40 + 7]
        right = data['cellColors'][12 * 40 + 13]
        self.assertGreater(self.lum[left], self.lum[right])
        self.assertEqual({data['grid'][12 * 40 + x] for x in range(6, 14)}, {160}, 'cylinder cells are whole, no seams')
        self.assertEqual(data['grid'][12 * 40 + 5], '')
        column = {data['cellColors'][y * 40 + 7] for y in range(7, 17)}
        self.assertLessEqual(len(column), 2, 'a cylinder shades across, not down')
        with self.assertRaisesRegex(ProjectError, 'light'):
            shading.shade_shape(self.path, 5, 5, 2, 2, [1], light='below')
        with self.assertRaisesRegex(ProjectError, 'shape'):
            shading.shade_shape(self.path, 5, 5, 2, 2, [1], shape='cube')

    def test_shapes_are_opaque_over_a_gradient(self):
        shading.gradient_fill(self.path, 0, 0, 39, 24, [6, 4, 8], 'down')
        shading.shade_shape(self.path, 20, 12, 6, 6, [0, 11, 12, 15, 1], light='top-left')
        data = self.data()
        inside = [data['grid'][y * 40 + x] for y in range(9, 16) for x in range(17, 24)]
        self.assertNotIn('', inside, 'black shadow steps are painted, not holes onto the sky')

    def test_plus4_ramps_use_ted_inks(self):
        path = str(Path(self.temp.name) / 'ted.json')
        drawing.create_canvas(path, 40, 25, background=0, ink=8, machine='plus4')
        ramps = shading.color_ramps('plus4')['ramps']
        self.assertNotIn(10, ramps['red'], 'red L1 repeats L0 (#ff0000) in the editor table')
        result = shading.shade_shape(path, 20, 12, 6, 6, ramps['blue'])
        self.assertTrue(result['ok'], result)
        self.assertTrue(max(json.loads(Path(path).read_text())['cellColors']) > 15, 'TED inks above 15 survive')


if __name__ == '__main__':
    unittest.main()
