#!/usr/bin/env bash
# Start the PETSCII preview MCP server with this repo's virtualenv.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
PY="$ROOT/.venv/bin/python"
if [[ ! -x "$PY" ]]; then
  echo "Create the preview environment first:" >&2
  echo "  python3 -m venv $ROOT/.venv && $ROOT/.venv/bin/pip install -r $ROOT/requirements.txt" >&2
  exit 1
fi
exec "$PY" "$ROOT/src/server.py"
