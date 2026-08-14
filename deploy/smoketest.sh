#!/bin/bash
# Post-deploy smoke test — verifies the running container actually serves
# traffic correctly before we consider a deploy successful.
#
# Usage: ./smoketest.sh [base_url]
#   Defaults to http://localhost:3000

set -uo pipefail

BASE="${1:-http://localhost:3000}"
FAIL=0

check() {
  local desc="$1" url="$2" expect="$3"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$url")
  if [ "$code" = "$expect" ]; then
    echo "  ✓ $desc -> HTTP $code"
  else
    echo "  ✗ $desc -> HTTP $code (expected $expect)"
    FAIL=1
  fi
}

echo "Smoke testing $BASE ..."

check "Homepage"                       "$BASE/"              200
check "Pricing page removed (404)"     "$BASE/pricing"       404
check "Account API requires auth"      "$BASE/api/account"   401

# Python service health (only meaningful when run inside/near the container network)
if [ -n "${PYTHON_HEALTH_URL:-}" ]; then
  check "Python mastering service" "$PYTHON_HEALTH_URL" 200
fi

if [ "$FAIL" -eq 0 ]; then
  echo "Smoke test PASSED."
  exit 0
else
  echo "Smoke test FAILED — do not consider this deploy healthy."
  exit 1
fi
