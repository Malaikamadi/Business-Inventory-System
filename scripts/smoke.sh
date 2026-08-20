#!/usr/bin/env bash
# Signs in as a seeded user and requests each route, reporting the status code.
# Used to catch server-render failures and authorization regressions quickly.
set -uo pipefail

BASE="${BASE:-http://localhost:3000}"
EMAIL="${1:-admin@invsys.com}"
PASSWORD="${2:-password123}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

CSRF=$(curl -s -c "$JAR" "$BASE/api/auth/csrf" | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')

curl -s -o /dev/null -b "$JAR" -c "$JAR" \
  -X POST "$BASE/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "email=$EMAIL" \
  --data-urlencode "password=$PASSWORD" \
  --data-urlencode "callbackUrl=$BASE/dashboard"

if ! grep -q "authjs.session-token" "$JAR"; then
  echo "FAILED to sign in as $EMAIL"
  exit 1
fi

echo "Signed in as $EMAIL"
printf '%-34s %s\n' "ROUTE" "STATUS"

for route in "$@"; do :; done
shift 2 2>/dev/null || true

ROUTES=("$@")
if [ ${#ROUTES[@]} -eq 0 ]; then
  ROUTES=(
    /dashboard
    /shops
    /products
    /products/categories
    /inventory
    /inventory/low-stock
    /inventory/out-of-stock
    /inventory/arrivals
    /inventory/adjustments
    /inventory/movements
    /sales
    /sales/new
    /reports
    /users
    /audit-log
    /settings/profile
  )
fi

for route in "${ROUTES[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE$route")
  printf '%-34s %s\n' "$route" "$code"
done
