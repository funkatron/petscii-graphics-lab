#!/usr/bin/env bash
# Start the PETSCII preview MCP server with this repo's virtualenv.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
PY="$ROOT/.venv/bin/python"
if [[ ! -x "$PY" ]]; then
  echo "Create the preview environment first:" >&2
  echo "  $ROOT/setup-venv.sh" >&2
  exit 1
fi
# Prefer the Node 24 built from source under ~/build/node24 over older nodes on PATH.
MANUAL=""
if [[ -d "$HOME/build/node24" ]]; then
  MANUAL="$(find "$HOME/build/node24" -path '*/out/Release/node' -type f -executable | sort | tail -n 1 || true)"
fi
if [[ -n "${MANUAL}" ]]; then
  export PGL_NODE="$MANUAL"
  export PATH="$(dirname "$MANUAL"):$PATH"
fi
exec "$PY" "$ROOT/src/server.py"
