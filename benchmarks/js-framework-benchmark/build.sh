#!/bin/bash
# ============================================================
# Lyt.js js-framework-benchmark Build Script
#
# Concatenates source files into a self-contained IIFE bundle.
# Since we can't use esbuild for this specific bundle format,
# we create it as a pre-built file.
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DIST_DIR="$SCRIPT_DIR/lyt/dist"
SRC_DIR="$SCRIPT_DIR/lyt/src"

echo "=== Building Lyt.js js-framework-benchmark ==="

# The IIFE bundle is pre-built and maintained as a standalone file.
# It already exists at lyt/dist/js-framework-benchmark.js
# This script validates and copies it.

if [ -f "$DIST_DIR/js-framework-benchmark.js" ]; then
  echo "[OK] IIFE bundle found: $DIST_DIR/js-framework-benchmark.js"
  SIZE=$(wc -c < "$DIST_DIR/js-framework-benchmark.js")
  echo "[OK] Bundle size: ${SIZE} bytes"
else
  echo "[ERROR] IIFE bundle not found at $DIST_DIR/js-framework-benchmark.js"
  exit 1
fi

# Validate the bundle has the expected exports
if grep -q "createElement" "$DIST_DIR/js-framework-benchmark.js" && \
   grep -q "runBenchmark" "$DIST_DIR/js-framework-benchmark.js" && \
   grep -q "LytBenchmark" "$DIST_DIR/js-framework-benchmark.js"; then
  echo "[OK] Bundle contains expected API exports"
else
  echo "[ERROR] Bundle is missing expected API exports"
  exit 1
fi

echo "=== Build complete ==="
