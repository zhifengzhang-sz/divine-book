#!/usr/bin/env bash
set -euo pipefail

# Convert HTML to PDF using weasyprint.
# Usage: html-to-pdf.sh INPUT.html [OUTPUT.pdf]
#
# Uses A4 page size. Requires: pip install weasyprint

if [[ $# -lt 1 ]]; then
  echo "Usage: html-to-pdf.sh INPUT.html [OUTPUT.pdf]" >&2
  exit 1
fi

INPUT="$1"
OUTPUT="${2:-${INPUT%.html}.pdf}"

weasyprint "$INPUT" "$OUTPUT"

echo "Created $OUTPUT"
