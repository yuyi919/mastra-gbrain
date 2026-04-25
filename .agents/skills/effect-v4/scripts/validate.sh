#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"

SRC_DIR="${1:-src}"
TARGET_DIR="${ROOT_DIR}/${SRC_DIR}"

if [[ ! -d "${TARGET_DIR}" ]]; then
  TARGET_DIR="${ROOT_DIR}"
fi

if [[ -x "${ROOT_DIR}/scripts/check-effect-v4.sh" && -d "${ROOT_DIR}/${SRC_DIR}" ]]; then
  "${ROOT_DIR}/scripts/check-effect-v4.sh" "${SRC_DIR}"
  exit 0
fi

echo "Running Effect v4 Beta syntax check on ${TARGET_DIR}..."

BANNED_PATTERN="Context\\.Tag\\(|Context\\.GenericTag\\(|Effect\\.Tag\\(|Effect\\.Service\\(|Runtime\\.runFork|Effect\\.runtime<|Effect\\.catchAll|Effect\\.catchSome|Effect\\.fork\\(|Effect\\.forkDaemon\\(|\\basync\\b|\\bawait\\b|Date\\.now\\(|new Date\\("

if grep -rnE \
  --exclude-dir=.git \
  --exclude-dir=.claude \
  --exclude-dir=.trae \
  --exclude-dir=node_modules \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.mts" \
  --include="*.cts" \
  "${BANNED_PATTERN}" \
  "${TARGET_DIR}"; then
  echo ""
  echo "ERROR: Found banned patterns. Fix them before continuing."
  exit 1
fi

echo "Effect v4 syntax check passed."
