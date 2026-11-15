#!/usr/bin/env bash
# Create the PETSCII preview virtualenv and install its Python packages.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
if [[ ! -x "$ROOT/.venv/bin/python" ]]; then
  python3 -m venv "$ROOT/.venv"
fi
"$ROOT/.venv/bin/pip" install -r "$ROOT/requirements.txt"
