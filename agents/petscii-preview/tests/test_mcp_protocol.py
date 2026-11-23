"""Drive the server through a real MCP client (in-process) to catch registration and error-path bugs."""

from __future__ import annotations

import asyncio
import importlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "src"
sys.path.insert(0, str(SRC))

from mcp import Client  # noqa: E402


def load_server():
    """Import server.py fresh and fail on any registration warning (e.g. duplicate tools)."""
    sys.modules.pop("server", None)
    case = unittest.TestCase()
    with case.assertNoLogs(level="WARNING"):
        return importlib.import_module("server")


def text_of(result) -> str:
    return "".join(getattr(block, "text", "") for block in result.content)


def json_of(result) -> dict:
    return json.loads(text_of(result))


class McpProtocolTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = load_server()

    def run_client(self, body):
        async def main():
            async with Client(self.server.mcp) as client:
                return await body(client)

        return asyncio.run(main())

    def call(self, name: str, args: dict):
        return self.run_client(lambda client: client.call_tool(name, args))

    def test_tools_register_once_with_schemas(self):
        tools = self.run_client(lambda client: client.list_tools()).tools
        names = [tool.name for tool in tools]
        self.assertEqual(len(names), len(set(names)))
        for name in ("create_canvas", "paint_cells", "render_still", "export_native", "undo"):
            self.assertIn(name, names)
        canvas = next(tool for tool in tools if tool.name == "create_canvas")
        self.assertIn("machine", canvas.input_schema["properties"])

    def test_draw_and_export_round_trip(self):
        with tempfile.TemporaryDirectory() as tmp:
            project = str(Path(tmp) / "proto.json")
            created = self.call("create_canvas", {"project_path": project, "columns": 8, "rows": 4})
            self.assertFalse(created.is_error, text_of(created))
            painted = self.call(
                "paint_cells", {"project_path": project, "cells": [{"x": 1, "y": 1, "glyph": 160, "ink": 7}]}
            )
            self.assertFalse(painted.is_error, text_of(painted))
            self.assertEqual(json_of(painted)["changed"], 1)
            png = str(Path(tmp) / "proto.png")
            still = self.call("render_still", {"project_path": project, "scale": 1, "save_path": png})
            self.assertFalse(still.is_error, text_of(still))
            self.assertTrue(Path(png).is_file())

    def test_bad_input_is_an_error_result_with_a_reason(self):
        with tempfile.TemporaryDirectory() as tmp:
            project = str(Path(tmp) / "proto.json")
            self.call("create_canvas", {"project_path": project, "columns": 8, "rows": 4})
            bad = self.call("paint_cells", {"project_path": project, "cells": [{"x": 1, "y": 1, "glyph": 999}]})
            self.assertTrue(bad.is_error)
            self.assertIn("0–511", text_of(bad))
            missing = self.call("move_selection", {"project_path": project, "dx": 1, "dy": 0})
            self.assertTrue(missing.is_error)
            self.assertIn("no selection", text_of(missing))
            bad_patch = self.call("update_project", {"project_path": project, "patch": {"columns": "wide"}})
            self.assertTrue(bad_patch.is_error)
            self.assertIn("columns", text_of(bad_patch))
            bad_effect = self.call("render_animation", {"project_path": project, "animation": {"colorEffect": "sparkle"}})
            self.assertTrue(bad_effect.is_error)
            self.assertIn("colorEffect", text_of(bad_effect))
            typo = self.call("plan_animation", {"project_path": project, "animation": {"colourEffect": "plasma"}})
            self.assertTrue(typo.is_error, "unknown animation keys are rejected, not ignored")
            nothing = self.call("undo", {"project_path": project})
            self.assertTrue(nothing.is_error)
            self.assertIn("nothing to undo", text_of(nothing))

    def test_validate_project_reports_invalid_files_without_erroring(self):
        with tempfile.TemporaryDirectory() as tmp:
            broken = Path(tmp) / "broken.json"
            broken.write_text(json.dumps({"format": "petscii-stencil-lab", "version": 2}), encoding="utf-8")
            result = self.call("validate_project", {"project_path": str(broken)})
            self.assertFalse(result.is_error, text_of(result))
            self.assertFalse(json_of(result)["ok"])


    def test_surface_is_compact_and_annotated(self):
        tools = {tool.name: tool for tool in self.run_client(lambda client: client.list_tools()).tools}
        # 41 after the Phase 2 consolidation, plus gradient_fill, shade_shape and paint_tone_map (owner requests).
        self.assertLessEqual(len(tools), 44)
        self.assertFalse(tools["paint_tone_map"].annotations.read_only_hint)
        for name in ("gradient_fill", "shade_shape"):
            self.assertFalse(tools[name].annotations.read_only_hint)
        self.assertIn('"radial"', json.dumps(tools["gradient_fill"].input_schema))
        self.assertIn('"cylinder"', json.dumps(tools["shade_shape"].input_schema))
        for removed in ("export_png", "export_svg", "export_gif", "create_project", "list_effects",
                        "render_color_animation", "render_themed_examples", "export_c64"):
            self.assertNotIn(removed, tools)
        self.assertTrue(tools["read_grid"].annotations.read_only_hint)
        self.assertTrue(tools["clear_drawing"].annotations.destructive_hint)
        self.assertFalse(tools["paint_cells"].annotations.read_only_hint)
        schema = tools["render_animation"].input_schema
        animation = json.dumps(schema)
        for value in ("plasma", "plus4-cycle", "scroll-x", "field"):
            self.assertIn(f'"{value}"', animation)
        self.assertIn('"square"', json.dumps(tools["render_still"].input_schema))

    def test_shading_tools_and_ramp_catalog_over_the_protocol(self):
        with tempfile.TemporaryDirectory() as tmp:
            project = str(Path(tmp) / "shade.json")
            self.call("create_canvas", {"project_path": project, "columns": 16, "rows": 10, "machine": "c64"})
            ramps = json_of(self.call("read_catalog", {"uri": "petscii://colors/ramps/c64"}))
            self.assertIn("grey", ramps["ramps"])
            filled = json_of(self.call("gradient_fill", {"project_path": project, "x0": 0, "y0": 0, "x1": 15, "y1": 9,
                                                          "ramp": ramps["ramps"]["sky"]}))
            self.assertTrue(filled["ok"])
            self.assertGreater(filled["changed"], 100)
            lit = json_of(self.call("shade_shape", {"project_path": project, "cx": 8, "cy": 5, "rx": 4, "ry": 4,
                                                     "ramp": ramps["ramps"]["grey"]}))
            self.assertTrue(lit["ok"])
            bad = self.call("gradient_fill", {"project_path": project, "x0": 0, "y0": 0, "x1": 3, "y1": 3, "ramp": [0, 99]})
            self.assertTrue(bad.is_error)
            self.assertIn("outside the c64 range", text_of(bad))

    def test_previews_come_back_as_images(self):
        with tempfile.TemporaryDirectory() as tmp:
            project = str(Path(tmp) / "look.json")
            self.call("create_canvas", {"project_path": project, "columns": 8, "rows": 4, "machine": "plus4"})
            self.call("paint_cells", {"project_path": project, "runs": [{"x": 0, "y": 1, "glyphs": [160, 81, None, 102]}]})
            still = self.call("render_still", {"project_path": project, "save_path": str(Path(tmp) / "a.png")})
            kinds = [block.type for block in still.content]
            self.assertEqual(kinds, ["text", "image"])
            self.assertEqual(still.content[1].mime_type, "image/png")
            self.assertEqual(json_of_first(still)["glyphSheet"], "ted")
            quiet = self.call("render_still", {"project_path": project, "fmt": "svg", "preview": False, "save_path": str(Path(tmp) / "a.svg")})
            self.assertEqual([block.type for block in quiet.content], ["text"])
            anim = self.call("render_animation", {
                "project_path": project, "animation": {"colorEffect": "plus4-cycle", "seconds": 1},
                "save_path": str(Path(tmp) / "a.gif"),
            })
            self.assertFalse(anim.is_error, text_of(anim))
            self.assertEqual([block.type for block in anim.content], ["text", "image"])
            screen = self.call("render_petscii_screen", {"machine": "c64", "lines": ["HELLO"]})
            self.assertEqual([block.type for block in screen.content], ["text", "image"])
            self.assertNotIn("png_base64", text_of(screen))

    def test_runs_round_trip_through_read_grid(self):
        with tempfile.TemporaryDirectory() as tmp:
            project = str(Path(tmp) / "runs.json")
            self.call("create_canvas", {"project_path": project, "columns": 8, "rows": 3})
            runs = [{"x": 1, "y": 0, "ink": 7, "glyphs": [160, 102, 81]}, {"x": 0, "y": 2, "ink": 2, "glyphs": [77, 78]}]
            self.call("paint_cells", {"project_path": project, "runs": runs})
            grid = json_of(self.call("read_grid", {"project_path": project}))
            self.assertEqual(grid["runs"], runs)
            text = json_of(self.call("read_grid", {"project_path": project, "format": "text"}))
            self.assertTrue(text["text"].startswith("# PETSCII-GLYPHS"))

    def test_catalog_resources_and_fallback_tool_agree(self):
        async def body(client):
            listed = [str(item.uri) for item in (await client.list_resources()).resources]
            templates = [item.uri_template for item in (await client.list_resource_templates()).resource_templates]
            effects = await client.read_resource("petscii://effects")
            recipe = await client.read_resource("petscii://op-art/recipes/line-moire")
            ladder = await client.read_resource("petscii://glyphs/shading-ladder/0")
            fallback = await client.call_tool("read_catalog", {"uri": "petscii://op-art/recipes/line-moire"})
            unknown = await client.call_tool("read_catalog", {"uri": "petscii://nope"})
            return listed, templates, effects, recipe, ladder, fallback, unknown

        listed, templates, effects, recipe, ladder, fallback, unknown = self.run_client(body)
        self.assertIn("petscii://effects", listed)
        self.assertIn("petscii://machines", listed)
        self.assertIn("petscii://op-art/recipes/{recipe_id}", templates)
        self.assertIn("plasma", json.loads(effects.contents[0].text)["colorEffects"])
        self.assertEqual(json.loads(recipe.contents[0].text), json_of(fallback))
        self.assertEqual(json.loads(ladder.contents[0].text)["ladder"][0]["glyph"], 160)
        self.assertTrue(unknown.is_error)

    def test_prompts_describe_the_workflow(self):
        async def body(client):
            names = [prompt.name for prompt in (await client.list_prompts()).prompts]
            drawn = await client.get_prompt("draw_picture", {"subject": "tiger in profile", "machine": "plus4"})
            return names, drawn

        names, drawn = self.run_client(body)
        self.assertEqual(sorted(names), ["draw_picture", "op_art_piece"])
        text = drawn.messages[0].content.text
        for step in ("create_canvas", "paint_cells", "render_still", "critique_drawing", "plus4"):
            self.assertIn(step, text)


def json_of_first(result) -> dict:
    return json.loads(result.content[0].text)


if __name__ == "__main__":
    unittest.main()
