#!/usr/bin/env bash
# Start the petscii-preview MCP server (stdio). MCP clients run this; you normally do not.
#
# Needs: the virtualenv from setup-venv.sh, and Node.js 22 or newer (the version CI tests).
# To use a specific Node, set PGL_NODE=/path/to/node in the client's server config.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
PY="$ROOT/.venv/bin/python"

# MCP uses stdout for protocol messages, so every message here goes to stderr.
if [[ ! -x "$PY" ]]; then
  echo "petscii-preview: the Python environment is missing. Run once:" >&2
  echo "  $ROOT/setup-venv.sh" >&2
  exit 1
fi

NODE="${PGL_NODE:-$(command -v node || true)}"
if [[ -z "$NODE" || ! -x "$NODE" ]]; then
  echo "petscii-preview: Node.js was not found. Install Node.js 22 or newer, or set PGL_NODE to its path." >&2
  exit 1
fi
MAJOR="$("$NODE" -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if (( MAJOR < 22 )); then
  echo "petscii-preview: Node.js $("$NODE" --version 2>/dev/null) is too old; install Node.js 22 or newer." >&2
  exit 1
fi
export PGL_NODE="$NODE"

exec "$PY" "$ROOT/src/server.py"
