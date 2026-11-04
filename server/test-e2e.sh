#!/bin/bash

BASE_URL="http://localhost:5001/api/v1"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASS="FinalPassword789!"
COUNSELOR_EMAIL="asha@example.com"
COUNSELOR_PASS="NewAshaPassword123!"

PASS=0
FAIL=0
fail() { echo "❌ FAIL: $1"; FAIL=$((FAIL+1)); }
pass() { echo "✅ PASS: $1"; PASS=$((PASS+1)); }

# Helpers
get() { curl -s -o /dev/null -w "%{http_code}" "$@"; }
post() { curl -s -o /dev/null -w "%{http_code}" -X POST "$@"; }
patch() { curl -s -o /dev/null -w "%{http_code}" -X PATCH "$@"; }
put() { curl -s -o /dev/null -w "%{http_code}" -X PUT "$@"; }
delete() { curl -s -o /dev/null -w "%{http_code}" -X DELETE "$@"; }

echo ""
echo "=============================="
echo "FULL E2E TEST SUITE"
echo "=============================="
echo ""

# ==================== AUTH ====================
echo "── AUTH ──"

ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}" \
  | node -pe "JSON.parse(require('fs').readFileSync(0)).token" 2>/dev/null)

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
  fail "Admin login"
else
  pass "Admin login"
fi

COUNSELOR_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$COUNSELOR_EMAIL\",\"password\":\"$COUNSELOR_PASS\"}" \
  | node -pe "JSON.parse(require('fs').readFileSync(0)).token" 2>/dev/null)

if [ -z "$COUNSELOR_TOKEN" ] || [ "$COUNSELOR_TOKEN" = "null" ]; then
  fail "Counselor login"
else
  pass "Counselor login"
fi

AUTH="Authorization: Bearer $ADMIN_TOKEN"
CAUTH="Authorization: Bearer $COUNSELOR_TOKEN"

# /auth/me
[ "$(get "$BASE_URL/auth/me" -H "$AUTH")" = "200" ] && pass "GET /auth/me" || fail "GET /auth/me"

# ==================== LEADS ====================
echo ""
echo "── LEADS ──"

LEAD_RESPONSE=$(curl -s -X POST "$BASE_URL/leads" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"fullName":"E2E Final Lead","email":"e2efinal@test.com","phone":"9800000000","destinationCountryId":1,"source":"referral"}')
LEAD_ID=$(echo "$LEAD_RESPONSE" | node -pe "JSON.parse(require('fs').readFileSync(0)).id" 2>/dev/null)

[ -n "$LEAD_ID" ] && [ "$LEAD_ID" != "null" ] && pass "Create lead (id=$LEAD_ID)" || fail "Create lead"

# List
[ "$(get "$BASE_URL/leads" -H "$AUTH")" = "200" ] && pass "GET /leads" || fail "GET /leads"
# Get
[ "$(get "$BASE_URL/leads/$LEAD_ID" -H "$AUTH")" = "200" ] && pass "GET /leads/:id" || fail "GET /leads/:id"
# Assign to Asha
[ "$(patch "$BASE_URL/leads/$LEAD_ID/assign" -H "$AUTH" -H "Content-Type: application/json" -d '{"assignedTo":2}')" = "200" ] && pass "Assign lead" || fail "Assign lead"
# Update status
[ "$(patch "$BASE_URL/leads/$LEAD_ID/status" -H "$AUTH" -H "Content-Type: application/json" -d '{"status":"contacted"}')" = "200" ] && pass "Update status" || fail "Update status"
# Counselor adds activity
[ "$(post "$BASE_URL/leads/$LEAD_ID/activities" -H "$CAUTH" -H "Content-Type: application/json" -d '{"type":"call","content":"Called"}')" = "201" ] && pass "Counselor add activity" || fail "Counselor add activity"
# Counselor uploads document
echo "%PDF-1.4 passport" > passport.pdf
DOC_RESPONSE=$(curl -s -X POST "$BASE_URL/leads/$LEAD_ID/documents" -H "$CAUTH" -F "file=@passport.pdf" -F "documentTypeId=1" -F "note=Passport copy")
rm passport.pdf
LEAD_DOC_ID=$(echo "$DOC_RESPONSE" | node -pe "JSON.parse(require('fs').readFileSync(0)).id" 2>/dev/null)
[ -n "$LEAD_DOC_ID" ] && [ "$LEAD_DOC_ID" != "null" ] && pass "Counselor upload lead doc" || fail "Counselor upload lead doc"

# ==================== TASKS ====================
echo ""
echo "── TASKS ──"

TASK_RESPONSE=$(curl -s -X POST "$BASE_URL/tasks" -H "$CAUTH" -H "Content-Type: application/json" \
  -d "{\"title\":\"Follow up\",\"dueAt\":\"2026-12-01T10:00:00Z\",\"leadId\":$LEAD_ID}")
TASK_ID=$(echo "$TASK_RESPONSE" | node -pe "JSON.parse(require('fs').readFileSync(0)).id" 2>/dev/null)
[ -n "$TASK_ID" ] && [ "$TASK_ID" != "null" ] && pass "Counselor create task (id=$TASK_ID)" || fail "Counselor create task"

[ "$(post "$BASE_URL/tasks/$TASK_ID/complete" -H "$CAUTH")" = "200" ] && pass "Complete task" || fail "Complete task"
[ "$(get "$BASE_URL/tasks" -H "$AUTH")" = "200" ] && pass "GET /tasks" || fail "GET /tasks"
[ "$(get "$BASE_URL/tasks?view=overdue" -H "$AUTH")" = "200" ] && pass "GET /tasks?view=overdue" || fail "GET /tasks?view=overdue"

# ==================== CONVERT ====================
echo ""
echo "── LEAD → STUDENT (CONVERT) ──"

CONVERT_RESPONSE=$(curl -s -X POST "$BASE_URL/leads/$LEAD_ID/convert" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"dateOfBirth":"2000-05-15","nationality":"Nepali","guardianName":"Parent Name"}')
STUDENT_ID=$(echo "$CONVERT_RESPONSE" | node -pe "JSON.parse(require('fs').readFileSync(0)).id" 2>/dev/null)
STUDENT_DOB=$(echo "$CONVERT_RESPONSE" | node -pe "JSON.parse(require('fs').readFileSync(0)).dateOfBirth" 2>/dev/null)

[ -n "$STUDENT_ID" ] && [ "$STUDENT_ID" != "null" ] && pass "Convert lead → student (id=$STUDENT_ID)" || fail "Convert lead → student"
[ "$STUDENT_DOB" = "2000-05-15" ] && pass "Convert dateOfBirth timezone-safe ($STUDENT_DOB)" || fail "Convert dateOfBirth ($STUDENT_DOB)"

# ==================== STUDENTS ====================
echo ""
echo "── STUDENTS ──"

[ "$(get "$BASE_URL/students" -H "$AUTH")" = "200" ] && pass "GET /students" || fail "GET /students"
[ "$(get "$BASE_URL/students/$STUDENT_ID" -H "$AUTH")" = "200" ] && pass "GET /students/:id" || fail "GET /students/:id"
[ "$(patch "$BASE_URL/students/$STUDENT_ID" -H "$AUTH" -H "Content-Type: application/json" -d '{"preferredCourses":"Nursing"}')" = "200" ] && pass "Update student" || fail "Update student"
[ "$(put "$BASE_URL/students/$STUDENT_ID/preferred-countries" -H "$AUTH" -H "Content-Type: application/json" -d '{"countryIds":[1]}')" = "200" ] && pass "Set preferred countries" || fail "Set preferred countries"

# Education
EDU_RESPONSE=$(curl -s -X POST "$BASE_URL/students/$STUDENT_ID/education" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"level":"High School","institution":"ABC","startYear":2018,"endYear":2020}')
EDU_ID=$(echo "$EDU_RESPONSE" | node -pe "JSON.parse(require('fs').readFileSync(0)).id" 2>/dev/null)
[ -n "$EDU_ID" ] && pass "Create education" || fail "Create education"
[ "$(patch "$BASE_URL/students/$STUDENT_ID/education/$EDU_ID" -H "$AUTH" -H "Content-Type: application/json" -d '{"grade":"A+"}')" = "200" ] && pass "Update education" || fail "Update education"
[ "$(delete "$BASE_URL/students/$STUDENT_ID/education/$EDU_ID" -H "$AUTH")" = "204" ] && pass "Delete education" || fail "Delete education"

# Test scores
SCORE_RESPONSE=$(curl -s -X POST "$BASE_URL/students/$STUDENT_ID/test-scores" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"testName":"IELTS","overallScore":7.0,"testDate":"2026-08-15"}')
SCORE_ID=$(echo "$SCORE_RESPONSE" | node -pe "JSON.parse(require('fs').readFileSync(0)).id" 2>/dev/null)
SCORE_DATE=$(echo "$SCORE_RESPONSE" | node -pe "JSON.parse(require('fs').readFileSync(0)).testDate" 2>/dev/null)
[ -n "$SCORE_ID" ] && pass "Create test score" || fail "Create test score"
[ "$SCORE_DATE" = "2026-08-15" ] && pass "Test score timezone-safe ($SCORE_DATE)" || fail "Test score date ($SCORE_DATE)"
[ "$(patch "$BASE_URL/students/$STUDENT_ID/test-scores/$SCORE_ID" -H "$AUTH" -H "Content-Type: application/json" -d '{"overallScore":7.5}')" = "200" ] && pass "Update test score" || fail "Update test score"

# Documents checklist
CHECKLIST_RESPONSE=$(curl -s "$BASE_URL/students/$STUDENT_ID/documents" -H "$AUTH")
PASSPORT_STATUS=$(echo "$CHECKLIST_RESPONSE" | node -pe "const d = JSON.parse(require('fs').readFileSync(0)); const p = d.checklist.find(c => c.documentType.name === 'Passport'); p ? p.status : 'missing'" 2>/dev/null)
[ "$PASSPORT_STATUS" = "received" ] && pass "Passport transferred to student checklist" || fail "Passport transfer (got $PASSPORT_STATUS)"

CHECKLIST_TOTAL=$(echo "$CHECKLIST_RESPONSE" | node -pe "JSON.parse(require('fs').readFileSync(0)).checklist.length" 2>/dev/null)
[ "$CHECKLIST_TOTAL" -ge 7 ] 2>/dev/null && pass "Checklist has $CHECKLIST_TOTAL items" || fail "Checklist count ($CHECKLIST_TOTAL)"

LEAD_ATTACHMENTS=$(echo "$CHECKLIST_RESPONSE" | node -pe "JSON.parse(require('fs').readFileSync(0)).leadAttachments.length" 2>/dev/null)
[ "$LEAD_ATTACHMENTS" -ge 1 ] 2>/dev/null && pass "Lead attachments visible in student ($LEAD_ATTACHMENTS)" || fail "Lead attachments ($LEAD_ATTACHMENTS)"

# Get checklist item for transcript
ITEM_ID=$(echo "$CHECKLIST_RESPONSE" | node -pe "const d = JSON.parse(require('fs').readFileSync(0)); const t = d.checklist.find(c => c.documentType.name === 'Academic Transcripts'); t ? t.id : 0" 2>/dev/null)

# Upload file to checklist item
echo "%PDF-1.4 transcript" > transcript.pdf
UPLOAD_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/students/$STUDENT_ID/documents/$ITEM_ID/file" -H "$AUTH" -F "file=@transcript.pdf")
rm transcript.pdf
[ "$UPLOAD_CODE" = "201" ] && pass "Upload checklist file" || fail "Upload checklist file (got $UPLOAD_CODE)"

# Verify student profile
PROFILE=$(curl -s "$BASE_URL/students/$STUDENT_ID" -H "$AUTH")
PROFILE_DOB=$(echo "$PROFILE" | node -pe "JSON.parse(require('fs').readFileSync(0)).dateOfBirth" 2>/dev/null)
PROFILE_ASSIGNED=$(echo "$PROFILE" | node -pe "JSON.parse(require('fs').readFileSync(0)).assignedTo.fullName" 2>/dev/null)
PROFILE_EDU=$(echo "$PROFILE" | node -pe "JSON.parse(require('fs').readFileSync(0)).education.length" 2>/dev/null)
PROFILE_SCORES=$(echo "$PROFILE" | node -pe "JSON.parse(require('fs').readFileSync(0)).testScores.length" 2>/dev/null)
PROFILE_COUNTRIES=$(echo "$PROFILE" | node -pe "JSON.parse(require('fs').readFileSync(0)).preferredCountries.length" 2>/dev/null)

[ "$PROFILE_DOB" = "2000-05-15" ] && pass "Student DOB timezone-safe ($PROFILE_DOB)" || fail "Student DOB ($PROFILE_DOB)"
[ "$PROFILE_ASSIGNED" = "Asha Rai" ] && pass "Student assigned to Asha" || fail "Student assignment ($PROFILE_ASSIGNED)"
[ "$PROFILE_SCORES" -ge 1 ] 2>/dev/null && pass "Student has test scores" || fail "Student test scores"
[ "$PROFILE_COUNTRIES" -ge 1 ] 2>/dev/null && pass "Student has preferred countries" || fail "Student countries"

# ==================== LEAD CONVERTED ====================
echo ""
echo "── VERIFICATION ──"

LEAD_STATUS=$(curl -s "$BASE_URL/leads/$LEAD_ID" -H "$AUTH" | node -pe "JSON.parse(require('fs').readFileSync(0)).status" 2>/dev/null)
[ "$LEAD_STATUS" = "converted" ] && pass "Lead is converted" || fail "Lead status ($LEAD_STATUS)"

LEAD_STUDENT_ID=$(curl -s "$BASE_URL/leads/$LEAD_ID" -H "$AUTH" | node -pe "JSON.parse(require('fs').readFileSync(0)).studentId" 2>/dev/null)
[ "$LEAD_STUDENT_ID" = "$STUDENT_ID" ] && pass "Lead studentId matches ($LEAD_STUDENT_ID)" || fail "Lead studentId mismatch"

# ==================== FILE STREAMING ====================
echo ""
echo "── FILES ──"

# Get a file id from the checklist
FILE_ID=$(curl -s "$BASE_URL/students/$STUDENT_ID/documents" -H "$AUTH" | node -pe "const d = JSON.parse(require('fs').readFileSync(0)); const p = d.checklist.find(c => c.file); p ? p.file.id : 0" 2>/dev/null)

[ "$(get "$BASE_URL/files/$FILE_ID" -H "$AUTH")" = "200" ] && pass "File stream (admin)" || fail "File stream (admin)"
[ "$(get "$BASE_URL/files/$FILE_ID")" = "401" ] && pass "File stream (no auth) → 401" || fail "File stream (no auth)"
[ "$(get "$BASE_URL/files/$FILE_ID" -H "$CAUTH")" = "403" ] && pass "File stream (counselor) → 403" || fail "File stream (counselor)"

# ==================== PERMISSIONS ====================
echo ""
echo "── PERMISSIONS ──"

[ "$(get "$BASE_URL/users" -H "$CAUTH")" = "403" ] && pass "Counselor blocked from /users" || fail "Counselor /users"
[ "$(get "$BASE_URL/users/assignable" -H "$CAUTH")" = "200" ] && pass "Counselor can see /users/assignable" || fail "Counselor /users/assignable"
[ "$(get "$BASE_URL/users" -H "$AUTH")" = "200" ] && pass "Admin can see /users" || fail "Admin /users"

# ==================== SECURITY ====================
echo ""
echo "── SECURITY ──"

[ "$(get "$BASE_URL/leads")" = "401" ] && pass "No token → 401" || fail "No token"
[ "$(get "$BASE_URL/leads/abc" -H "$AUTH")" = "400" ] && pass "Invalid ID → 400" || fail "Invalid ID"
[ "$(get "$BASE_URL/tasks?status=hacked" -H "$AUTH")" = "400" ] && pass "Invalid filter → 400" || fail "Invalid filter"
[ "$(get "$BASE_URL/leads/$LEAD_ID" -H "$CAUTH")" = "200" ] && pass "Counselor sees own lead" || fail "Counselor own lead"
[ "$(get "$BASE_URL/leads/1" -H "$CAUTH")" = "404" ] && pass "Counselor blocked from other lead → 404" || fail "Counselor other lead"

# ==================== CLEANUP ====================
echo ""
echo "── CLEANUP ──"

[ "$(delete "$BASE_URL/tasks/$TASK_ID" -H "$AUTH")" = "204" ] && pass "Delete task" || fail "Delete task"
[ "$(delete "$BASE_URL/leads/$LEAD_ID" -H "$AUTH")" = "204" ] && pass "Delete converted lead" || fail "Delete converted lead"

# ==================== SUMMARY ====================
echo ""
echo "=============================="
echo "RESULTS: $PASS passed, $FAIL failed"
echo "=============================="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi