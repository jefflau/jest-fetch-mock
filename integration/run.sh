#!/usr/bin/env bash
# Packs the library and runs every fixture in integration/fixtures against
# the packed tarball - exactly what a consumer installing from npm gets.
set -euo pipefail
cd "$(dirname "$0")/.."

TARBALL_NAME=$(npm pack --silent)
TARBALL="$PWD/$TARBALL_NAME"
trap 'rm -f "$TARBALL"' EXIT

for fixture in integration/fixtures/*/; do
  name=$(basename "$fixture")
  echo ""
  echo "=== integration: $name ==="
  (
    cd "$fixture"
    rm -rf node_modules
    npm install --no-audit --no-fund --loglevel=error
    npm install --no-save --no-audit --no-fund --loglevel=error "$TARBALL"
    npm test
  )
done

echo ""
echo "All integration fixtures passed."
