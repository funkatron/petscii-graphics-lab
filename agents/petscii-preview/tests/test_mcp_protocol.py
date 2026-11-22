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
        for name in ("create_canvas", "paint_cells", "render_still", "export_c64", "undo"):
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
            bad_json = self.call("update_project", {"project_path": project, "patch_json": "{nope"})
            self.assertTrue(bad_json.is_error)
            self.assertIn("patch_json is not valid JSON", text_of(bad_json))
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


if __name__ == "__main__":
    unittest.main()
