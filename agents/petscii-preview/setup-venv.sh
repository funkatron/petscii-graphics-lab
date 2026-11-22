#!/usr/bin/env bash
# Create the petscii-preview virtualenv (.venv) and install its Python packages. Safe to run again.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
PYTHON="${PYTHON:-python3}"

if ! "$PYTHON" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' 2>/dev/null; then
  echo "petscii-preview needs Python 3.10 or newer (CI uses 3.12). Set PYTHON=/path/to/python3.12 and run again." >&2
  exit 1
fi
if [[ ! -x "$ROOT/.venv/bin/python" ]]; then
  "$PYTHON" -m venv "$ROOT/.venv"
fi
"$ROOT/.venv/bin/pip" install --quiet -r "$ROOT/requirements.txt"
echo "petscii-preview is ready. Your MCP client starts it with $ROOT/run-mcp.sh"
