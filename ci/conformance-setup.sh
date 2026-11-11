#!/usr/bin/env bash
set -euo pipefail

if [ "${FABRICA_CI:-0}" = "1" ]; then
  npx playwright install --with-deps chromium
fi
