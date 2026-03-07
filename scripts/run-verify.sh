#!/usr/bin/env bash
set -euo pipefail

echo "Running project verification workflow..."

if [ "${SKIP_INSTALL:-0}" != "1" ]; then
  echo "Installing bun (if missing) and dependencies..."
  curl -fsSL https://bun.sh/install | bash -s -- -y || true
  export PATH="$HOME/.bun/bin:$PATH"
  bun install || true
fi

echo "Generating keyword map and groups (app/generate.ts)..."
bun app/generate.ts

echo "Parsing normalized data -> tmp-verify-output (app/parse.ts)..."
rm -rf tmp-verify-output && mkdir -p tmp-verify-output
bun app/parse.ts data/normalized/normalized.data.md tmp-verify-output

echo "Running test suite..."
bun test

echo "Running pipeline verification..."
bun scripts/verify-pipeline.ts

echo "Running domain verification..."
bun scripts/verify-domain.ts

echo "Verification workflow complete. Report at tmp-verify-output/verify-report.json"
