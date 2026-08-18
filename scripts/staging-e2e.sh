#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-https://referee-request.onrender.com/api/v1}"
RUN_ID="$(date +%s)"
CANDIDATE_EMAIL="candidate-${RUN_ID}@example.com"
REFEREE_EMAIL="referee-${RUN_ID}@example.com"
PASSWORD="Passw0rd!${RUN_ID}"
DISPATCH_TOKEN="${DISPATCH_TOKEN:-}"

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

echo "1) Signup candidate"
signup_json="$tmpdir/signup.json"
curl --fail --silent --show-error \
  -X POST "${API_BASE_URL}/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${CANDIDATE_EMAIL}\",\"fullName\":\"Stage Candidate ${RUN_ID}\",\"password\":\"${PASSWORD}\"}" \
  > "$signup_json"
candidate_token="$(jq -r '.data.token' "$signup_json")"

echo "2) Create request"
deadline_at="$(date -u -v+3d '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || python - <<'PY'
from datetime import datetime, timedelta, timezone
print((datetime.now(timezone.utc)+timedelta(days=3)).strftime("%Y-%m-%dT%H:%M:%SZ"))
PY
)"
request_json="$tmpdir/request.json"
curl --fail --silent --show-error \
  -X POST "${API_BASE_URL}/requests" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${candidate_token}" \
  -d "{\"refereeName\":\"Dr Referee ${RUN_ID}\",\"refereeEmail\":\"${REFEREE_EMAIL}\",\"refereeRelationship\":\"Supervisor\",\"institutionName\":\"University of Lagos\",\"programmeName\":\"MSc Computer Science\",\"opportunityType\":\"university\",\"deadlineAt\":\"${deadline_at}\",\"instructions\":\"Please evaluate leadership, communication, and technical depth.\"}" \
  > "$request_json"
request_id="$(jq -r '.data.request.id' "$request_json")"

echo "3) Upload supporting document"
support_file="$tmpdir/support.txt"
echo "supporting document for request ${request_id}" > "$support_file"
curl --fail --silent --show-error \
  -X POST "${API_BASE_URL}/requests/${request_id}/documents" \
  -H "Authorization: Bearer ${candidate_token}" \
  -F "file=@${support_file};type=text/plain" \
  > /dev/null

echo "4) Send request and get referee link"
send_json="$tmpdir/send.json"
curl --fail --silent --show-error \
  -X POST "${API_BASE_URL}/requests/${request_id}/send" \
  -H "Authorization: Bearer ${candidate_token}" \
  > "$send_json"
referee_link="$(jq -r '.data.refereeLink' "$send_json")"
referee_token="${referee_link##*/}"

echo "5) Referee opens link and reads request"
ref_view_json="$tmpdir/ref_view.json"
curl --fail --silent --show-error \
  "${API_BASE_URL}/referee/${referee_token}" \
  > "$ref_view_json"
download_path="$(jq -r '.data.request.documents[0].downloadPath // empty' "$ref_view_json")"
if [ -n "$download_path" ]; then
  curl --fail --silent --show-error "${API_BASE_URL}${download_path}" > /dev/null
fi

echo "6) Referee submits reference"
reference_file="$tmpdir/reference.txt"
echo "Reference submission for request ${request_id}" > "$reference_file"
curl --fail --silent --show-error \
  -X POST "${API_BASE_URL}/referee/${referee_token}/submit" \
  -F "referenceFile=@${reference_file};type=text/plain" \
  > "$tmpdir/submission.json"

echo "7) Candidate request status check"
status_json="$tmpdir/status.json"
curl --fail --silent --show-error \
  "${API_BASE_URL}/requests/${request_id}" \
  -H "Authorization: Bearer ${candidate_token}" \
  > "$status_json"
status_value="$(jq -r '.data.request.status' "$status_json")"
if [ "$status_value" != "submitted" ]; then
  echo "Expected submitted status, got: ${status_value}"
  exit 1
fi

if [ -n "$DISPATCH_TOKEN" ]; then
  echo "8) Trigger reminder queue + dispatch"
  curl --fail --silent --show-error \
    -X POST "${API_BASE_URL}/internal/notifications/reminders" \
    -H "X-Dispatch-Token: ${DISPATCH_TOKEN}" \
    > /dev/null
  curl --fail --silent --show-error \
    -X POST "${API_BASE_URL}/internal/notifications/dispatch?limit=20" \
    -H "X-Dispatch-Token: ${DISPATCH_TOKEN}" \
    > /dev/null
fi

echo "E2E success:"
echo "  candidate: ${CANDIDATE_EMAIL}"
echo "  request:   ${request_id}"
echo "  referee:   ${REFEREE_EMAIL}"
