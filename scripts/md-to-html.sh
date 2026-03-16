#!/usr/bin/env bash
set -euo pipefail

# Convert Markdown to standalone HTML using pandoc.
# Usage: md-to-html.sh INPUT.md [OUTPUT.html]
#
# The CSS defaults to $WORKSPACE/style/atom-one-dark.css.
# Override the style directory by setting FFF_STYLE_DIR.

if [[ $# -lt 1 ]]; then
  echo "Usage: md-to-html.sh INPUT.md [OUTPUT.html]" >&2
  exit 1
fi

INPUT="$1"
OUTPUT="${2:-${INPUT%.md}.html}"

WORKSPACE="$(git rev-parse --show-toplevel)"
STYLE_DIR="${FFF_STYLE_DIR:-$WORKSPACE/style}"
CSS="$STYLE_DIR/atom-one-dark.css"

pandoc -s -f markdown -t html5 \
  --columns=1000 \
  --css="$CSS" \
  -o "$OUTPUT" \
  "$INPUT"

echo "Created $OUTPUT"
