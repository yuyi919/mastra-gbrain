#!/bin/bash

# Define the source directory to check, defaults to "src"
SRC_DIR=${1:-"src"}

# If the directory doesn't exist yet, we just pass
if [ ! -d "$SRC_DIR" ]; then
  echo "Directory $SRC_DIR does not exist. Skipping Effect v4 check."
  exit 0
fi

echo "Running Effect v4 Beta syntax check on $SRC_DIR..."

# Regex pattern matching banned v3 APIs
BANNED_PATTERN="Context\.Tag\(|Context\.GenericTag\(|Effect\.Tag\(|Effect\.Service\(|Runtime\.runFork|Effect\.runtime<|Effect\.catchAll|Effect\.catchSome|Effect\.fork\(|Effect\.forkDaemon\("

# Search for banned patterns
if grep -rnE "$BANNED_PATTERN" "$SRC_DIR"; then
  echo ""
  echo "❌ ERROR: Found Effect v3 banned patterns!"
  echo "Please refer to docs/effect/v4-banned-patterns.md and docs/effect/v4-playbook.md to fix these issues."
  exit 1
else
  echo "✅ Effect v4 syntax check passed!"
  exit 0
fi
