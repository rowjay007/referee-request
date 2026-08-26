#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "This script must run inside a git repository."
  exit 1
fi

echo "Syncing submodule configuration..."
git submodule sync --recursive

echo "Updating external packs..."
git submodule update --init --recursive --remote tools/mattbook tools/pstack

echo "Submodule status:"
git submodule status tools/mattbook tools/pstack

echo "Done."
