#!/usr/bin/env bash
# Mid-project review demo: runs every Week 2 scenario against a running API.
#
# Prereqs: replica-set MongoDB, backend running (npm run dev) with
#   LEDGER_DEMO_FAIL_ACCOUNT=fail_account   in backend/.env  (for scenario 7)
# Usage:   bash scripts/demo-ledger.sh            (API_URL defaults to http://localhost:8000)
set -u
API="${API_URL:-http://localhost:8000}/api/v1"
PASS="${SEED_USER_PASSWORD:-password123}"
RUN="$(date +%s)"               # makes event ids unique per run
JAR_A="$(mktemp)"; JAR_B="$(mktemp)"; HDR="$(mktemp)"
trap 'rm -f "$JAR_A" "$JAR_B" "$HDR"' EXIT

hr()   { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }
show() { printf '   HTTP %s | replayed=%s\n   %s\n' "$1" "${2:--}" "$3"; }

# req <jar> <METHOD> <path> [json] [idempotency-key]
req() {
  local jar="$1" method="$2" path="$3" body="${4:-}" key="${5:-}"
  local args=(-s -b "$jar" -c "$jar" -D "$HDR" -o /tmp/demo_body -w '%{http_code}' -X "$method" "$API$path" -H 'Content-Type: application/json')
  [ -n "$key" ] && args+=(-H "Idempotency-Key: $key")
  [ -n "$body" ] && args+=(-d "$body")
  STATUS="$(curl "${args[@]}")"
  BODY="$(cat /tmp/demo_body)"
  REPLAYED="$(grep -i '^idempotent-replayed' "$HDR" | awk '{print $2}' | tr -d '\r')"
}
txn() { # eventId amount creditAccount
  printf '{"eventId":"%s","description":"Monthly subscription payment","amount":%s,"currency":"INR","debitAccount":"customer_001","creditAccount":"%s"}' "$1" "$2" "${3:-merchant_001}"
}

hr "0. Login Company A and Company B"
req "$JAR_A" POST /auth/login '{"email":"admin@companyA.com","password":"'"$PASS"'"}'; show "$STATUS" "" "$BODY"
req "$JAR_B" POST /auth/login '{"email":"admin@companyB.com","password":"'"$PASS"'"}'; show "$STATUS" "" "$BODY"

EVT="evt_demo_${RUN}_001"
hr "1. Company A creates a transaction  (expect 201 COMPLETED)"
req "$JAR_A" POST /ledger/transactions "$(txn "$EVT" 1000)" "$EVT"; show "$STATUS" "$REPLAYED" "$BODY"
TXN_ID="$(echo "$BODY" | sed -n 's/.*"transactionId":"\([^"]*\)".*/\1/p')"

hr "2. Same event submitted again  (expect 200, replayed=true, SAME transactionId, no duplicate)"
req "$JAR_A" POST /ledger/transactions "$(txn "$EVT" 1000)" "$EVT"; show "$STATUS" "$REPLAYED" "$BODY"

hr "3. Same key, DIFFERENT payload  (expect 409 IDEMPOTENCY_KEY_REUSED)"
req "$JAR_A" POST /ledger/transactions "$(txn "$EVT" 2500)" "$EVT"; show "$STATUS" "$REPLAYED" "$BODY"

hr "4. 10 concurrent duplicate requests  (expect exactly one 201, the rest 200)"
EVT2="evt_demo_${RUN}_race"
for i in $(seq 1 10); do
  ( curl -s -o /dev/null -w '%{http_code}\n' -b "$JAR_A" -X POST "$API/ledger/transactions" \
      -H 'Content-Type: application/json' -H "Idempotency-Key: $EVT2" -d "$(txn "$EVT2" 300)" ) &
done | sort | uniq -c | sed 's/^/   /'
wait
req "$JAR_A" GET "/ledger/transactions?search=$EVT2"; echo "   ledger rows for $EVT2:"; echo "   $BODY" | sed -n 's/.*"total":\([0-9]*\).*/   total = \1/p'

hr "5. Company B uses the SAME eventId  (expect 201: tenants are isolated)"
req "$JAR_B" POST /ledger/transactions "$(txn "$EVT" 77)" "$EVT"; show "$STATUS" "$REPLAYED" "$BODY"

hr "6. Isolation: B cannot read A's transaction  (expect 404)  and lists only its own"
req "$JAR_B" GET "/ledger/transactions/$TXN_ID"; show "$STATUS" "" "$BODY"
req "$JAR_B" GET "/ledger/transactions?limit=50"; echo "   B total: $(echo "$BODY" | sed -n 's/.*"total":\([0-9]*\).*/\1/p')"
req "$JAR_A" GET "/ledger/transactions?limit=50"; echo "   A total: $(echo "$BODY" | sed -n 's/.*"total":\([0-9]*\).*/\1/p')"

hr "7. Simulated MongoDB failure  (expect 422, rolledBack=true, FAILED row, ZERO ledger entries)"
EVT3="evt_demo_${RUN}_fail"
req "$JAR_A" POST /ledger/transactions "$(txn "$EVT3" 500 fail_account)" "$EVT3"; show "$STATUS" "$REPLAYED" "$BODY"
FAIL_ID="$(echo "$BODY" | sed -n 's/.*"transactionId":"\([^"]*\)".*/\1/p')"
req "$JAR_A" GET "/ledger/transactions/$FAIL_ID"; echo "   detail (entries must be empty): $BODY"
echo "   (If you see 201 instead of 422, set LEDGER_DEMO_FAIL_ACCOUNT=fail_account in .env and restart.)"

hr "8. Summary for A and B"
req "$JAR_A" GET /ledger/summary; echo "   A: $BODY"
req "$JAR_B" GET /ledger/summary; echo "   B: $BODY"

hr "9. Validation + auth guards"
req "$JAR_A" POST /ledger/transactions '{"eventId":"evt_bad_1","description":"x","amount":-5,"currency":"INR","debitAccount":"a","creditAccount":"b"}' "evt_bad_1"; show "$STATUS" "" "$BODY"
STATUS="$(curl -s -o /tmp/demo_body -w '%{http_code}' "$API/ledger/transactions")"; show "$STATUS" "" "no cookie -> $(cat /tmp/demo_body)"
echo; echo "Done. Cross-check in mongosh: db.ledger_transactions.countDocuments({eventId:\"$EVT\"})"
