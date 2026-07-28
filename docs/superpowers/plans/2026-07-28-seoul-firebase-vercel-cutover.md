# Seoul Firebase and Vercel Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recreate the `inflation-2e38b` default Firestore database in Seoul, deploy the completed Next.js migration to Vercel, verify privacy and classroom behavior, promote the verified deployment, and only then retire Supabase and GitHub Pages.

**Architecture:** The browser uses Firebase Authentication, while all persistent classroom data passes through authenticated Next.js Route Handlers on Vercel and is stored in the `(default)` Firestore database in `asia-northeast3`. Direct client Firestore access remains denied. Preview, security review, Production promotion, legacy-code removal, and legacy-data deletion are separate gates so a failure cannot silently advance the cutover.

**Tech Stack:** Next.js 16, React 19, TypeScript 6, Firebase Authentication, Cloud Firestore, Firebase Admin SDK, Firebase CLI 15, Vercel CLI 58, Vitest 4, Playwright/browser verification, Google Cloud CLI, dorms-check.

## Global Constraints

- Work directly on `main`; do not create a worktree.
- Every subagent uses `gpt-5.6-terra` with reasoning effort `medium`.
- Firebase display name is `inflation`; Firebase Project ID is exactly `inflation-2e38b`.
- The target database is exactly `projects/inflation-2e38b/databases/(default)`.
- The existing `(default)` database is in `nam5`; deleting it requires a fresh explicit approval that names the exact project and database.
- Recreate `(default)` as Firestore Native, Standard edition, in `asia-northeast3`, with deletion protection enabled.
- Do not copy existing Supabase records or existing Firestore records into the Seoul database.
- Firestore Seoul residency does **not** mean the whole service has no overseas transfer: Firebase Authentication is US-operated and Vercel may process API data in the US or other subprocessor locations.
- The privacy notice must disclose Firestore Seoul storage separately from Firebase Authentication and Vercel overseas processing; it must never say “국외이전 없음”.
- Teachers authenticate with Google; students authenticate anonymously.
- All browser Firestore reads and writes remain denied by `firestore.rules`; Vercel Route Handlers use the Admin SDK.
- Vercel scope is `yadorans-projects`; Vercel project is `inflation-classroom`.
- The intended Production origin is `https://inflation-classroom.vercel.app`.
- Configure Vercel `Preview` and `Production`; never put service-account private keys in tracked files, shell history, logs, or chat output.
- The Vercel service account is `vercel-firestore-api@inflation-2e38b.iam.gserviceaccount.com` and receives only `roles/datastore.user`.
- Do not promote Production until Preview API, auth, teacher, four-student concurrency, redaction, polling, recursive deletion, headers, tests, and security scan pass.
- `dorms-check@latest` currently returns npm 404. Run `github:shinnanchanguk/dorms-check` only after a separate explicit user approval.
- Treat dorms-check preparation as local evidence, not final dorms.school certification.
- Do not remove the Supabase SDK, GitHub Pages, Vercel legacy variables, or Supabase data until the Firebase/Vercel Production smoke flow passes.
- Deleting Supabase project `lzmtfcshypdhfdvwdbzb` requires a second explicit approval after Production verification.
- Use process-local Java 21 for emulator tests:

```bash
JAVA_HOME="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home" \
PATH="$JAVA_HOME/bin:$PATH" \
npm run test:firebase
```

## File Responsibility Map

- `app/layout.tsx` — Vercel-origin metadata and root-relative legal navigation.
- `app/privacy/page.tsx` — accurate domestic storage and overseas-processing disclosures.
- `.env.example` — complete public/server/Vercel environment-key contract.
- `README.md` — operator sequence, destructive gates, Preview/Production verification, and rollback.
- `tests/lib/deployment-config.test.ts` — static regression checks for Vercel origin, CSP, privacy copy, and safe emulator use.
- `firestore.rules` — deny all direct client Firestore access.
- `firebase.json` — Firestore rules and emulator configuration.
- `.dorms-check/evidence/cutover/` — redacted, non-secret infrastructure and verification evidence.
- `dorms-check.config.json` — deployed Vercel URL, `security` and `edzip` tracks, and `edzipCase: "D"`.
- `package.json`, `package-lock.json`, `lib/supabase.ts`, `supabase/`, `.github/workflows/deploy-pages.yml`, `public/_headers` — retired backend/hosting artifacts removed only after Production passes.

---

### Task 1: Correct Vercel Metadata and Overseas-Processing Disclosure

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/privacy/page.tsx`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `tests/lib/deployment-config.test.ts`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_SITE_URL`, current Vercel CSP, Firebase/Vercel processor facts.
- Produces: `siteUrl: string`, root-relative application URLs, and testable privacy language for later live verification.

- [ ] **Step 1: Add failing deployment-copy tests**

Add these assertions to `tests/lib/deployment-config.test.ts`:

```ts
it("uses a Vercel origin and root-relative legal routes", () => {
  const layout = readFileSync("app/layout.tsx", "utf8");
  const env = readFileSync(".env.example", "utf8");

  expect(layout).toContain("process.env.NEXT_PUBLIC_SITE_URL");
  expect(layout).toContain('href="/privacy/"');
  expect(layout).toContain('href="/terms/"');
  expect(layout).not.toContain("yadoran-2025.github.io");
  expect(layout).not.toContain("/your-own-demand/");
  expect(env).toContain(
    "NEXT_PUBLIC_SITE_URL=https://inflation-classroom.vercel.app",
  );
});

it("distinguishes Seoul storage from overseas processing", () => {
  const privacy = readFileSync("app/privacy/page.tsx", "utf8");

  expect(privacy).toContain("asia-northeast3");
  expect(privacy).toContain("서울");
  expect(privacy).toContain("Firebase Authentication");
  expect(privacy).toContain("미국");
  expect(privacy).toContain("Vercel");
  expect(privacy).toContain("국외");
  expect(privacy).not.toContain("국외이전 없음");
});
```

- [ ] **Step 2: Run the focused test and confirm the expected failure**

Run:

```bash
npm test -- tests/lib/deployment-config.test.ts
```

Expected: FAIL because `app/layout.tsx` still contains the GitHub Pages origin and `/your-own-demand/` paths, `.env.example` lacks `NEXT_PUBLIC_SITE_URL`, and the privacy page does not state the verified processing locations.

- [ ] **Step 3: Make metadata environment-backed and root-relative**

In `app/layout.tsx`, replace the hard-coded GitHub Pages metadata with:

```ts
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "수요곡선 활동 시스템",
  description: "고등학교 경제 수업을 위한 수요곡선 설문 앱",
  alternates: {
    canonical: "/teacher",
  },
  openGraph: {
    title: "수요곡선 활동 시스템",
    description: "고등학교 경제 수업을 위한 수요곡선 설문 앱",
    siteName: "수요곡선 활동 시스템",
    type: "website",
    url: "/teacher",
  },
};
```

Use these legal links:

```tsx
<a href="/privacy/">개인정보 처리방침</a>
<a href="/terms/">이용약관</a>
<a href="/privacy/#contact">문의</a>
```

- [ ] **Step 4: Add the Production-origin environment contract**

Append to `.env.example`:

```dotenv
NEXT_PUBLIC_SITE_URL=https://inflation-classroom.vercel.app
```

- [ ] **Step 5: Replace the privacy transfer paragraph with explicit separation**

In `app/privacy/page.tsx`, make section 6 state all of the following:

```tsx
<section>
  <h2>6. 처리 위탁 및 국외이전</h2>
  <p>
    설문과 응답의 주 저장소는 Firebase 프로젝트 ID{" "}
    <code>inflation-2e38b</code>의 Cloud Firestore이며, 데이터베이스
    위치는 대한민국 서울 리전 <code>asia-northeast3</code>입니다.
  </p>
  <p>
    Google Firebase Authentication은 교사 Google 로그인과 학생 익명
    세션의 식별자를 미국 데이터센터에서 처리합니다. Vercel은 웹사이트를
    호스팅하고 학생 프로필과 응답이 포함된 서버 API 요청을 미국의 주요 처리
    시설 및 계약상 하위 처리자를 통해 처리할 수 있습니다. 따라서 Firestore가
    서울에 있더라도 서비스 전체를 국외이전이 없는 구조로 보지 않습니다.
  </p>
  <p>
    국외 처리는 인증, API 실행, 보안 로그 및 장애 대응을 목적으로 서비스
    이용 중 지속적으로 발생할 수 있습니다. 운영자는 학교 도입 전에 Google과
    Vercel의 최신 처리 국가, 하위 처리자, 보유·삭제 조건을 확인하고,
    개인정보 보호법과 학교·교육청 기준에 따른 고지 또는 동의 절차를
    완료해야 합니다.
  </p>
</section>
```

Do not add an exact Vercel log-retention period unless the selected Vercel plan and contract prove it. If the contract does not prove a required disclosure field, the Production gate must fail instead of inventing a value.

- [ ] **Step 6: Document the legal classification**

Add this sentence to the README privacy/operations section:

```text
Firestore 서울 리전은 주 데이터 저장 위치를 국내로 제한하지만, Firebase Authentication과 Vercel API 처리까지 국내화하지 않으므로 개인정보 국외이전 검토를 생략할 근거가 되지 않습니다.
```

- [ ] **Step 7: Verify and commit**

Run:

```bash
npm test -- tests/lib/deployment-config.test.ts
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
```

Expected: all commands exit 0.

Commit:

```bash
git add app/layout.tsx app/privacy/page.tsx .env.example README.md tests/lib/deployment-config.test.ts
git commit -m "docs: disclose Vercel and Firebase overseas processing"
```

---

### Task 2: Authenticate Google Cloud and Record the Destructive Target

**Files:**
- Create: `.dorms-check/evidence/cutover/firestore-before.json`
- Create: `.dorms-check/evidence/cutover/vercel-before.json`
- Create: `.dorms-check/evidence/cutover/PREFLIGHT.md`

**Interfaces:**
- Consumes: Firebase CLI login, interactive `gcloud auth login`, linked Vercel project.
- Produces: redacted evidence that resolves the exact database, location, collection IDs, Vercel project, and environment-key names.

- [ ] **Step 1: Authenticate Google Cloud without exporting a token**

Run:

```bash
gcloud auth login
gcloud config set project inflation-2e38b
gcloud auth list --filter=status:ACTIVE --format="value(account)"
```

Expected: the user completes Google login in the browser and one active account is shown. Do not copy an access token into chat, a file, or shell history.

- [ ] **Step 2: Capture the exact Firestore database metadata**

Run:

```bash
mkdir -p .dorms-check/evidence/cutover
npx firebase-tools firestore:databases:get "(default)" \
  --project inflation-2e38b \
  --json \
  > .dorms-check/evidence/cutover/firestore-before.json
jq -e '
  .result.name == "projects/inflation-2e38b/databases/(default)" and
  .result.locationId == "nam5" and
  .result.type == "FIRESTORE_NATIVE"
' .dorms-check/evidence/cutover/firestore-before.json
```

Expected: `jq` exits 0 and proves the target is the existing `nam5` default database.

- [ ] **Step 3: List root collection IDs without writing data**

Run:

```bash
cutover_access_token="$(gcloud auth print-access-token)"
curl --fail --silent --show-error \
  -X POST \
  -H "Authorization: Bearer ${cutover_access_token}" \
  -H "Content-Type: application/json" \
  "https://firestore.googleapis.com/v1/projects/inflation-2e38b/databases/(default)/documents:listCollectionIds" \
  -d '{"pageSize":100}' \
  | jq '{collectionIds: (.collectionIds // []), nextPageToken: (.nextPageToken // null)}' \
  > .dorms-check/evidence/cutover/firestore-collections-before.json
unset cutover_access_token
```

Expected: the evidence contains collection IDs only and no OAuth token.

- [ ] **Step 4: Capture Vercel identifiers and key names without values**

Run:

```bash
jq '{
  projectId,
  orgId,
  projectName
}' .vercel/project.json \
  > .dorms-check/evidence/cutover/vercel-before.json
npx vercel env ls --scope yadorans-projects \
  | sed -E 's/[[:space:]]+Encrypted[[:space:]]+/ <redacted> /' \
  >> .dorms-check/evidence/cutover/vercel-before.json
```

Expected: evidence identifies project `inflation-classroom` and lists legacy `VITE_FIREBASE_*` names without values.

- [ ] **Step 5: Obtain the exact destructive approval**

Ask exactly:

```text
Firebase 프로젝트 inflation-2e38b의 (default) Firestore 데이터베이스는 현재 nam5에 있습니다. 기록된 컬렉션 ID를 포함한 모든 데이터를 영구 삭제하고, 같은 (default) 데이터베이스를 asia-northeast3(서울)에 빈 데이터베이스로 재생성해도 될까요?
```

Expected: explicit approval. Stop before Task 3 if the answer is absent, ambiguous, or selects `nam5`.

- [ ] **Step 6: Record the approved preflight**

Write `.dorms-check/evidence/cutover/PREFLIGHT.md` with:

```markdown
# Cutover Preflight

- Firebase display name: inflation
- Firebase Project ID: inflation-2e38b
- Database ID: (default)
- Source location: nam5
- Target location: asia-northeast3
- Vercel scope/project: yadorans-projects/inflation-classroom
- Existing Firestore records are not migrated.
- Supabase remains untouched until Production verification and a separate approval.
- Firestore Seoul storage does not remove Firebase Authentication or Vercel overseas processing.
```

Append the approval timestamp and the exact resolved collection-ID list, but do not add account email addresses or tokens.

- [ ] **Step 7: Commit redacted preflight evidence**

Run:

```bash
git diff --check
git add .dorms-check/evidence/cutover
git commit -m "docs: record Firebase cutover targets"
```

Expected: the commit contains no private key, OAuth token, or environment value.

---

### Task 3: Recreate the Default Firestore Database in Seoul

**Files:**
- Modify: `.dorms-check/evidence/cutover/PREFLIGHT.md`
- Create: `.dorms-check/evidence/cutover/firestore-after.json`
- Verify: `firestore.rules`
- Verify: `firebase.json`

**Interfaces:**
- Consumes: explicit Task 2 deletion approval for `inflation-2e38b/(default)`.
- Produces: empty Firestore Native `(default)` in `asia-northeast3`, deletion protection enabled, deny-all client rules deployed.

- [ ] **Step 1: Re-resolve the target immediately before deletion**

Run:

```bash
npx firebase-tools firestore:databases:get "(default)" \
  --project inflation-2e38b \
  --json \
  | jq -e '
      .result.name == "projects/inflation-2e38b/databases/(default)" and
      .result.locationId == "nam5"
    '
```

Expected: exit 0. Stop if the project, database ID, or location differs from the approved target.

- [ ] **Step 2: Delete only the approved database**

Run:

```bash
npx firebase-tools firestore:databases:delete "(default)" \
  --project inflation-2e38b \
  --force
```

Expected: Firebase reports deletion of `projects/inflation-2e38b/databases/(default)`. This operation permanently removes its data.

- [ ] **Step 3: Wait for the database ID to become reusable**

Poll with bounded 15-second waits:

```bash
for cutover_attempt in $(seq 1 40); do
  if ! npx firebase-tools firestore:databases:get "(default)" \
    --project inflation-2e38b >/dev/null 2>&1; then
    break
  fi
  sleep 15
done

if npx firebase-tools firestore:databases:get "(default)" \
  --project inflation-2e38b >/dev/null 2>&1; then
  echo "Database deletion did not complete within 10 minutes." >&2
  exit 1
fi
```

Expected: the final `get` fails because the old database no longer exists.

- [ ] **Step 4: Create the Seoul default database**

Run:

```bash
npx firebase-tools firestore:databases:create "(default)" \
  --project inflation-2e38b \
  --location asia-northeast3 \
  --edition standard \
  --delete-protection ENABLED
```

Expected: Firebase reports a Firestore Native Standard database in `asia-northeast3`.

- [ ] **Step 5: Prove the new location and empty state**

Run:

```bash
npx firebase-tools firestore:databases:get "(default)" \
  --project inflation-2e38b \
  --json \
  > .dorms-check/evidence/cutover/firestore-after.json
jq -e '
  .result.name == "projects/inflation-2e38b/databases/(default)" and
  .result.locationId == "asia-northeast3" and
  .result.type == "FIRESTORE_NATIVE" and
  .result.databaseEdition == "STANDARD" and
  .result.deleteProtectionState == "DELETE_PROTECTION_ENABLED"
' .dorms-check/evidence/cutover/firestore-after.json
```

Then list root collections again using the REST command from Task 2. Expected: `collectionIds` is `[]`.

- [ ] **Step 6: Redeploy and verify deny-all rules**

Run:

```bash
npx firebase-tools use inflation-2e38b
npx firebase-tools deploy --only firestore:rules --project inflation-2e38b
JAVA_HOME="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home" \
PATH="$JAVA_HOME/bin:$PATH" \
npm run test:firebase
```

Expected: rules deployment succeeds and all emulator tests pass.

- [ ] **Step 7: Commit the post-recreation evidence**

Append the deletion and recreation timestamps to `PREFLIGHT.md`, then run:

```bash
git add .dorms-check/evidence/cutover
git commit -m "docs: record Seoul Firestore recreation"
```

---

### Task 4: Configure Firebase Auth, Least-Privilege IAM, and Vercel Environments

**Files:**
- Verify: `.env.example`
- Verify: `.vercel/project.json`
- Modify: `.dorms-check/evidence/cutover/PREFLIGHT.md`

**Interfaces:**
- Consumes: Firebase Web App ID `1:879861035443:web:62a5069d8b347b86db9bc6`, Google Cloud login, Vercel login.
- Produces: enabled Anonymous/Google Auth, least-privilege Admin credential, Next.js Vercel project, complete Preview/Production environment-key sets.

- [ ] **Step 1: Configure Firebase Authentication in the console**

In Firebase Console project `inflation-2e38b`:

1. Open **Authentication → Sign-in method**.
2. Enable **Anonymous**.
3. Enable **Google**, select the actual support email, and save.
4. Under **Settings → Authorized domains**, add `inflation-classroom.vercel.app`.

Expected: Anonymous and Google both show `Enabled`; the Production domain appears once.

- [ ] **Step 2: Ensure the dedicated service account exists**

Run:

```bash
cutover_sa="vercel-firestore-api@inflation-2e38b.iam.gserviceaccount.com"

if ! gcloud iam service-accounts describe "$cutover_sa" \
  --project inflation-2e38b >/dev/null 2>&1; then
  gcloud iam service-accounts create vercel-firestore-api \
    --project inflation-2e38b \
    --display-name "Vercel Firestore API"
fi

gcloud projects add-iam-policy-binding inflation-2e38b \
  --member "serviceAccount:${cutover_sa}" \
  --role roles/datastore.user \
  --condition=None
```

Expected: the account exists and has `roles/datastore.user`. Do not add Editor, Owner, Firebase Admin, or Datastore Owner.

- [ ] **Step 3: Set Vercel to Next.js**

In Vercel project `yadorans-projects/inflation-classroom`:

1. Open **Settings → Build and Deployment**.
2. Set **Framework Preset** to **Next.js**.
3. Leave Root Directory at the repository root.
4. Leave Build Command as the detected `next build`.

Expected: the dashboard shows `Next.js`, not `Vite`.

- [ ] **Step 4: Resolve the Firebase public configuration without printing it**

Run:

```bash
cutover_tmp="$(mktemp -d)"
npx firebase-tools apps:sdkconfig WEB \
  "1:879861035443:web:62a5069d8b347b86db9bc6" \
  --project inflation-2e38b \
  --json \
  > "${cutover_tmp}/firebase-web.json"

jq -e '
  .result.sdkConfig.projectId == "inflation-2e38b" and
  .result.sdkConfig.authDomain == "inflation-2e38b.firebaseapp.com" and
  (.result.sdkConfig.apiKey | length > 0)
' "${cutover_tmp}/firebase-web.json" >/dev/null
```

Expected: validation exits 0; the API key is not printed.

- [ ] **Step 5: Add public Vercel variables to Preview and Production**

Run:

```bash
jq -r '.result.sdkConfig.apiKey' "${cutover_tmp}/firebase-web.json" \
  | npx vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production,preview \
      --scope yadorans-projects --force --no-sensitive --yes

jq -r '.result.sdkConfig.authDomain' "${cutover_tmp}/firebase-web.json" \
  | npx vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production,preview \
      --scope yadorans-projects --force --no-sensitive --yes

printf '%s' 'inflation-2e38b' \
  | npx vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production,preview \
      --scope yadorans-projects --force --no-sensitive --yes

printf '%s' 'inflation-2e38b' \
  | npx vercel env add FIREBASE_PROJECT_ID production,preview \
      --scope yadorans-projects --force --no-sensitive --yes

printf '%s' 'https://inflation-classroom.vercel.app' \
  | npx vercel env add NEXT_PUBLIC_SITE_URL production,preview \
      --scope yadorans-projects --force --no-sensitive --yes

printf '%s' 'https://blog.naver.com/yadoransw/224282983636' \
  | npx vercel env add NEXT_PUBLIC_TEACHER_REVIEW_URL production,preview \
      --scope yadorans-projects --force --no-sensitive --yes
```

Expected: all six names exist for Preview and Production.

- [ ] **Step 6: Create one service-account key and send it through stdin**

Run:

```bash
gcloud iam service-accounts keys create "${cutover_tmp}/vercel-sa.json" \
  --iam-account "$cutover_sa" \
  --project inflation-2e38b

jq -r '.client_email' "${cutover_tmp}/vercel-sa.json" \
  | npx vercel env add FIREBASE_CLIENT_EMAIL production,preview \
      --scope yadorans-projects --force --sensitive --yes

jq -r '.private_key' "${cutover_tmp}/vercel-sa.json" \
  | npx vercel env add FIREBASE_PRIVATE_KEY production,preview \
      --scope yadorans-projects --force --sensitive --yes
```

Expected: the secret values are accepted from stdin and do not appear in command arguments or output.

- [ ] **Step 7: Remove the local key material and verify the environment contract**

Run:

```bash
rm -f "${cutover_tmp}/vercel-sa.json" "${cutover_tmp}/firebase-web.json"
rmdir "$cutover_tmp"
unset cutover_tmp cutover_sa

npx vercel env ls --scope yadorans-projects \
  | rg 'NEXT_PUBLIC_FIREBASE_|NEXT_PUBLIC_SITE_URL|FIREBASE_PROJECT_ID|FIREBASE_CLIENT_EMAIL|FIREBASE_PRIVATE_KEY'

git status --short
```

Expected: required key names are listed for Preview and Production; no credential file appears in `git status`.

- [ ] **Step 8: Record non-secret configuration evidence**

Append to `PREFLIGHT.md`:

```markdown
- Authentication providers enabled: Anonymous, Google
- Authorized Production domain: inflation-classroom.vercel.app
- Vercel framework: Next.js
- Service account: vercel-firestore-api@inflation-2e38b.iam.gserviceaccount.com
- IAM role: roles/datastore.user
- Vercel secret values were transferred through stdin and removed locally.
```

Commit:

```bash
git add .dorms-check/evidence/cutover/PREFLIGHT.md
git commit -m "docs: record Firebase and Vercel access setup"
```

---

### Task 5: Deploy and Verify the Vercel Preview

**Files:**
- Create: `.vercel/firebase-migration-preview-url`
- Create: `.dorms-check/evidence/cutover/preview.json`
- Modify: `.dorms-check/evidence/cutover/PREFLIGHT.md`

**Interfaces:**
- Consumes: complete Preview environment, Next.js framework preset, current `main` commit.
- Produces: one READY Preview URL with live headers, anonymous API boundary, and authorized Firebase Auth domain.

- [ ] **Step 1: Run the local release gate**

Run:

```bash
npm test
JAVA_HOME="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home" \
PATH="$JAVA_HOME/bin:$PATH" \
npm run test:firebase
npm run audit:regression
npm run typecheck
npm run lint
npm run build
git diff --check
git status --short
```

Expected: all checks pass and the worktree is clean.

- [ ] **Step 2: Deploy Preview and capture only its URL**

Run:

```bash
npx vercel pull --yes --environment=preview --scope yadorans-projects
npx vercel deploy --yes --scope yadorans-projects \
  | tail -n 1 \
  > .vercel/firebase-migration-preview-url
cutover_preview_url="$(tr -d '\n' < .vercel/firebase-migration-preview-url)"
npx vercel inspect "$cutover_preview_url" \
  --scope yadorans-projects \
  --wait \
  --format=json \
  > .dorms-check/evidence/cutover/preview.json
jq -e '.readyState == "READY" or .state == "READY"' \
  .dorms-check/evidence/cutover/preview.json
```

Expected: a READY Preview deployment.

- [ ] **Step 3: Add the generated Preview domain to Firebase Auth**

Extract the hostname:

```bash
cutover_preview_host="$(
  printf '%s' "$cutover_preview_url" \
    | sed -E 's#^https?://##; s#/.*$##'
)"
printf '%s\n' "$cutover_preview_host"
```

Add that exact hostname under Firebase Authentication **Authorized domains**. Expected: both `inflation-classroom.vercel.app` and the generated Preview hostname appear.

- [ ] **Step 4: Verify the unauthenticated API boundary**

Run:

```bash
curl --silent --show-error \
  --output /tmp/cutover-api-body \
  --write-out '%{http_code}' \
  "${cutover_preview_url}/api/surveys?room=test"
```

Expected: HTTP `401`; the JSON body is:

```json
{"error":"로그인이 필요합니다."}
```

Remove the temporary body:

```bash
rm -f /tmp/cutover-api-body
```

- [ ] **Step 5: Verify live security and legal responses**

Run:

```bash
curl --fail --silent --show-error --head "$cutover_preview_url" \
  | tr -d '\r' \
  | rg -i 'content-security-policy|x-frame-options|x-content-type-options|referrer-policy|permissions-policy'

curl --fail --silent --show-error "${cutover_preview_url}/privacy/" \
  | rg 'asia-northeast3|Firebase Authentication|Vercel|국외'
```

Expected: all five headers are live and the privacy page contains all four terms.

- [ ] **Step 6: Verify Google and anonymous sign-in bootstrap**

Use a real browser:

1. Open `${cutover_preview_url}/teacher`.
2. Click Google login and complete the popup.
3. Confirm the Firebase Auth iframe is not blocked by CSP.
4. Open `${cutover_preview_url}/student` in a private context.
5. Confirm an anonymous Firebase user is created before remote data calls.

Expected: no unauthorized-domain, CSP-frame, or missing-Firebase-config error appears.

- [ ] **Step 7: Commit redacted Preview evidence**

Append the Preview hostname, deployment ID, commit SHA, API `401`, and header result to `PREFLIGHT.md`. Do not commit `.vercel/firebase-migration-preview-url`.

```bash
git add .dorms-check/evidence/cutover
git commit -m "docs: record verified Vercel preview"
```

---

### Task 6: Run Teacher, Four-Student, Privacy, and Cleanup Flows

**Files:**
- Create: `.dorms-check/evidence/cutover/E2E.md`
- Create: `.dorms-check/evidence/cutover/e2e-results.json`

**Interfaces:**
- Consumes: READY Preview URL, one Google teacher account, anonymous Firebase sessions.
- Produces: verified room ownership, 2/2 assignment balance, response redaction, polling, teacher mutation, recursive survey deletion, and deleted test fixtures.

- [ ] **Step 1: Create the fixed teacher fixture**

On Preview as the Google-authenticated teacher:

1. Create room `전환검증-2026-07-28`.
2. Confirm the default survey appears.
3. Create survey `서울 전환 검증`.
4. Add products `빵` and `우유`.
5. Give each product exactly two price points.
6. Set grade 1, class 1 budget to `10000`.
7. Reload and change the title to `서울 전환 검증 수정`.

Expected: the edited title survives reload and a different teacher account cannot claim the room.

- [ ] **Step 2: Submit four isolated anonymous responses**

Use four separate private browser contexts with:

```text
검증학생1 — 1학년 1반 1번
검증학생2 — 1학년 1반 2번
검증학생3 — 1학년 1반 3번
검증학생4 — 1학년 1반 4번
```

Each context reserves assignments and submits quantities within the class budget. Expected for each product: its two price points receive a 2/2 split.

- [ ] **Step 3: Verify student privacy**

For each student context:

1. Open results.
2. Confirm its own name and number are visible.
3. Confirm the other three names are empty and numbers are `0`.
4. Confirm no other Firebase UID appears in row IDs or embedded response-item IDs.
5. Confirm aggregate chart quantities still include all four responses.

Expected: all five checks pass for all four contexts.

- [ ] **Step 4: Verify teacher polling and response management**

As the room owner:

1. Confirm `/teacher/results` and `/teacher/budget-results` update within 5 seconds.
2. Confirm four rows in `/teacher/responses`.
3. Edit `검증학생1` quantity and confirm both charts update within 5 seconds.
4. Delete `검증학생4` and confirm three rows remain.
5. Delete survey `서울 전환 검증 수정`.

Expected: survey deletion recursively removes responses, reservations, assignment states, products, and price-point data under that survey.

- [ ] **Step 5: Record structured E2E evidence**

Create `.dorms-check/evidence/cutover/e2e-results.json`:

```json
{
  "room": "전환검증-2026-07-28",
  "teacherOwnership": true,
  "studentsSubmitted": 4,
  "assignmentSplitPerProduct": [2, 2],
  "foreignStudentIdentityRedacted": true,
  "pollingUnderFiveSeconds": true,
  "teacherEditVerified": true,
  "teacherDeleteVerified": true,
  "surveyRecursiveDeleteVerified": true
}
```

Create `E2E.md` with timestamped screenshots or browser evidence references for each field.

- [ ] **Step 6: Remove the remaining cutover room fixture**

Resolve the lookup and room IDs:

```bash
cutover_room_name='전환검증-2026-07-28'
cutover_lookup_id="$(
  printf '%s' "$cutover_room_name" \
    | shasum -a 256 \
    | awk '{print $1}'
)"
cutover_access_token="$(gcloud auth print-access-token)"
cutover_room_id="$(
  curl --fail --silent --show-error \
    -H "Authorization: Bearer ${cutover_access_token}" \
    "https://firestore.googleapis.com/v1/projects/inflation-2e38b/databases/(default)/documents/roomNames/${cutover_lookup_id}" \
    | jq -er '.fields.roomId.stringValue'
)"
unset cutover_access_token
```

Delete only the exact test room and lookup:

```bash
npx firebase-tools firestore:delete "rooms/${cutover_room_id}" \
  --project inflation-2e38b \
  --recursive \
  --force
npx firebase-tools firestore:delete "roomNames/${cutover_lookup_id}" \
  --project inflation-2e38b \
  --force
unset cutover_room_name cutover_lookup_id cutover_room_id
```

Expected: subsequent REST reads of both exact document paths return `404`.

- [ ] **Step 7: Commit E2E evidence**

```bash
git add .dorms-check/evidence/cutover/E2E.md \
  .dorms-check/evidence/cutover/e2e-results.json
git commit -m "test: record Firebase preview E2E verification"
```

---

### Task 7: Run the dorms Security and Edzip Consent Workflow

**Files:**
- Modify: `dorms-check.config.json`
- Modify: `.dorms-check/answers.json`
- Create: `.dorms-check/evidence/REPORT.md`
- Create: `.dorms-check/evidence/report.json`

**Interfaces:**
- Consumes: verified Preview URL, source evidence, live headers, `dorms-security-check` consent rules.
- Produces: judged local security/edzip evidence with zero invented passes and a list of any blocking findings.

- [ ] **Step 1: Retry the required npm detector**

Run:

```bash
npx -y dorms-check@latest detect
```

Expected in the current environment: npm `404`.

- [ ] **Step 2: Obtain fallback execution approval**

Ask exactly:

```text
dorms-check npm 패키지가 404입니다. GitHub 저장소 github:shinnanchanguk/dorms-check의 코드를 npx로 받아 Preview URL에 대해 실행해도 될까요?
```

Expected: explicit approval. Stop this task if approval is absent.

- [ ] **Step 3: Confirm the edzip case**

Ask exactly:

```text
1. 이 앱은 학생 개인정보 또는 학습내용을 처리합니까?
2. 그 데이터가 학교 기기를 벗어나 클라우드·외부 서버로 전송됩니까?
3. 외부로 나갈 때 식별자는 마스킹되거나 학교 기기에만 남습니까?
```

Record the established answers as:

```json
{
  "handlesStudentData": true,
  "leavesSchoolDevice": true,
  "identifiersAlwaysMaskedOrLocal": false,
  "edzipCase": "D"
}
```

- [ ] **Step 4: Initialize and scan the Preview**

Run after approval:

```bash
cutover_preview_url="$(tr -d '\n' < .vercel/firebase-migration-preview-url)"
npx -y github:shinnanchanguk/dorms-check init \
  --name "수요곡선 활동 시스템" \
  --url "$cutover_preview_url" \
  --track security,edzip \
  --confirm-ownership
npx -y github:shinnanchanguk/dorms-check scan \
  --url "$cutover_preview_url"
```

Expected: live scan output is written under `.dorms-check`; `dorms-check.config.json` contains `edzipCase: "D"`.

- [ ] **Step 5: Judge only proven claims**

Read every pending review item and inspect:

```text
app/privacy/page.tsx
app/api/**
lib/server/**
lib/firebase/**
firestore.rules
vercel.json
README.md
.dorms-check/evidence/cutover/**
```

For each answer:

- use `pass` only with exact `file:line` or live-response evidence;
- use `fail` when policy or implementation is missing or contradicted;
- use `na` only when the feature genuinely does not exist;
- treat anonymous UID, names, student numbers, and individual results as personal or pseudonymous data;
- distinguish Firestore Seoul storage from Firebase Authentication and Vercel overseas processing.

Run:

```bash
npx -y github:shinnanchanguk/dorms-check judge \
  --in .dorms-check/answers.json
npx -y github:shinnanchanguk/dorms-check scan \
  --url "$cutover_preview_url"
npx -y github:shinnanchanguk/dorms-check status
```

- [ ] **Step 6: Apply the consent gate to findings**

If any finding requires code, legal-copy, hosting-config, or deployment changes:

1. Explain each finding in Korean.
2. Ask for explicit modification/deployment approval.
3. Make only the smallest approved fix.
4. Run unit, emulator, type, lint, build, and Preview deployment checks.
5. Rescan and rejudge.

Expected: do not proceed to Production while a Critical/Important security finding or required edzip disclosure remains.

- [ ] **Step 7: Save and commit local preparation evidence**

Copy the final generated evidence to:

```text
.dorms-check/evidence/REPORT.md
.dorms-check/evidence/report.json
```

Commit:

```bash
git add dorms-check.config.json .dorms-check
git commit -m "docs: record Vercel security readiness"
```

Expected: the report states that local preparation is not final dorms.school certification.

---

### Task 8: Promote the Exact Preview to Vercel Production

**Files:**
- Create: `.dorms-check/evidence/cutover/production.json`
- Modify: `dorms-check.config.json`
- Modify: `.dorms-check/evidence/cutover/PREFLIGHT.md`

**Interfaces:**
- Consumes: clean reviewed commit, verified Preview URL, passing dorms/edzip preparation.
- Produces: Production alias serving the exact Preview deployment, with a captured rollback target.

- [ ] **Step 1: Capture the current Production rollback target**

Run:

```bash
npx vercel list inflation-classroom \
  --scope yadorans-projects \
  --environment production \
  --format json \
  > .dorms-check/evidence/cutover/vercel-production-before.json

jq -r '.deployments[0].url // empty' \
  .dorms-check/evidence/cutover/vercel-production-before.json
```

Expected: if an earlier Production deployment exists, its URL is recorded for rollback.

- [ ] **Step 2: Confirm commit and Preview identity**

Run:

```bash
cutover_commit_sha="$(git rev-parse HEAD)"
cutover_preview_url="$(tr -d '\n' < .vercel/firebase-migration-preview-url)"
npx vercel inspect "$cutover_preview_url" \
  --scope yadorans-projects \
  --format json \
  > .dorms-check/evidence/cutover/preview-before-promote.json
git status --short
```

Expected: worktree clean; deployment metadata corresponds to `cutover_commit_sha`.

- [ ] **Step 3: Promote the exact deployment**

Run:

```bash
npx vercel promote "$cutover_preview_url" \
  --scope yadorans-projects \
  --yes
npx vercel promote status inflation-classroom \
  --scope yadorans-projects
```

Expected: promotion completes successfully.

- [ ] **Step 4: Verify Production headers, API boundary, auth, and smoke flow**

Run:

```bash
cutover_production_url='https://inflation-classroom.vercel.app'
curl --fail --silent --show-error --head "$cutover_production_url" \
  | tr -d '\r' \
  | rg -i 'content-security-policy|x-frame-options|x-content-type-options'
curl --silent --show-error \
  --output /dev/null \
  --write-out '%{http_code}\n' \
  "${cutover_production_url}/api/surveys?room=test"
```

Expected: security headers appear and unauthenticated API returns `401`.

Repeat with one temporary teacher room and one anonymous student response, then delete the exact fixture using Task 6’s cleanup procedure.

- [ ] **Step 5: Verify rollback is executable**

If the new Production smoke flow fails:

```bash
cutover_previous_url="$(
  jq -r '.deployments[0].url // empty' \
    .dorms-check/evidence/cutover/vercel-production-before.json
)"
test -n "$cutover_previous_url"
npx vercel rollback "$cutover_previous_url" \
  --scope yadorans-projects \
  --yes
```

Expected: rollback completes. Do not advance to Task 9.

- [ ] **Step 6: Record and commit Production evidence**

Run:

```bash
npx vercel inspect "$cutover_production_url" \
  --scope yadorans-projects \
  --format json \
  > .dorms-check/evidence/cutover/production.json
```

Update `dorms-check.config.json` URL to:

```json
"https://inflation-classroom.vercel.app"
```

Append Production deployment ID, commit SHA, and smoke result to `PREFLIGHT.md`, then commit:

```bash
git add dorms-check.config.json .dorms-check/evidence/cutover
git commit -m "docs: record Firebase Vercel production cutover"
```

---

### Task 9: Remove Supabase Runtime and GitHub Pages Deployment

**Files:**
- Create: `tests/lib/no-legacy-backend.test.ts`
- Delete: `lib/supabase.ts`
- Delete: `supabase/schema.sql`
- Delete: `supabase/migrations/20260512000000_class_scoped_balanced_assignments.sql`
- Delete: `supabase/migrations/20260514000000_transactional_student_response.sql`
- Delete: `supabase/migrations/20260718063239_lock_private_response_reads.sql`
- Delete: `.github/workflows/deploy-pages.yml`
- Delete: `public/_headers`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: successful Task 8 Production verification and rollback evidence.
- Produces: no Supabase runtime/build/deployment dependency, no GitHub Pages workflow, and a second verified Production deployment.

- [ ] **Step 1: Write the failing legacy-backend regression test**

Create `tests/lib/no-legacy-backend.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const checkedFiles = [
  "package.json",
  "package-lock.json",
  "README.md",
  ".env.example",
  "vercel.json",
];

describe("retired backend", () => {
  it("has no Supabase runtime or GitHub Pages deployment", () => {
    expect(existsSync("lib/supabase.ts")).toBe(false);
    expect(existsSync("supabase")).toBe(false);
    expect(existsSync(".github/workflows/deploy-pages.yml")).toBe(false);
    expect(existsSync("public/_headers")).toBe(false);

    for (const file of checkedFiles) {
      expect(readFileSync(file, "utf8")).not.toMatch(
        /@supabase|supabase\.co|github pages|deploy-pages/i,
      );
    }
  });
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run:

```bash
npm test -- tests/lib/no-legacy-backend.test.ts
```

Expected: FAIL because the Supabase SDK, schema directory, Pages workflow, and `_headers` file still exist.

- [ ] **Step 3: Remove the SDK and exact retired files**

Run:

```bash
npm uninstall @supabase/supabase-js
```

Delete only the files listed in Task 9’s **Files** section. Keep `.dorms-check` evidence and unrelated GitHub workflows.

- [ ] **Step 4: Update operator documentation**

Remove setup instructions for Supabase and GitHub Pages from README. Retain:

```text
Production: https://inflation-classroom.vercel.app
Firebase Project ID: inflation-2e38b
Firestore database: (default), asia-northeast3
Supabase data deletion remains a separate destructive action.
```

- [ ] **Step 5: Prove code and build independence**

Run:

```bash
npm test -- tests/lib/no-legacy-backend.test.ts
npm test
JAVA_HOME="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home" \
PATH="$JAVA_HOME/bin:$PATH" \
npm run test:firebase
npm run audit:regression
npm run typecheck
npm run lint
npm run build
rg -n -i 'from .*supabase|@supabase|supabase\\.co|postgres_changes|deploy-pages' \
  app components lib public package.json package-lock.json .github README.md \
  || true
```

Expected: tests/checks pass and `rg` prints no match.

- [ ] **Step 6: Commit and deploy cleanup as a new Preview**

Run:

```bash
git add -A
git commit -m "chore: remove retired Supabase backend"
npx vercel deploy --yes --scope yadorans-projects \
  | tail -n 1 \
  > .vercel/firebase-migration-cleanup-preview-url
cutover_cleanup_url="$(
  tr -d '\n' < .vercel/firebase-migration-cleanup-preview-url
)"
npx vercel inspect "$cutover_cleanup_url" \
  --scope yadorans-projects \
  --wait
```

Expected: cleanup Preview reaches READY.

- [ ] **Step 7: Smoke-test and promote the cleanup deployment**

Verify Google teacher login, one room/survey creation, one anonymous submission, polling results, edit, and deletion. Confirm browser network requests contain no Supabase host.

Then:

```bash
npx vercel promote "$cutover_cleanup_url" \
  --scope yadorans-projects \
  --yes
```

Expected: Production works without the Supabase package or variables.

- [ ] **Step 8: Disable GitHub Pages only after new Production passes**

Run:

```bash
gh api \
  --method DELETE \
  repos/yadoran-2025/your-own-demand/pages
```

Expected: HTTP `204`. Verify the GitHub repository Pages settings show no active deployment source.

- [ ] **Step 9: Remove legacy Vercel variable names**

Run:

```bash
for cutover_legacy_name in \
  VITE_FIREBASE_MEASUREMENT_ID \
  VITE_FIREBASE_APP_ID \
  VITE_FIREBASE_MESSAGING_SENDER_ID \
  VITE_FIREBASE_STORAGE_BUCKET \
  VITE_FIREBASE_PROJECT_ID \
  VITE_FIREBASE_AUTH_DOMAIN \
  VITE_FIREBASE_API_KEY
do
  npx vercel env rm "$cutover_legacy_name" production \
    --scope yadorans-projects \
    --yes
done
unset cutover_legacy_name
```

Expected: `vercel env ls` contains required `NEXT_PUBLIC_*` and `FIREBASE_*` names but no `VITE_FIREBASE_*`.

---

### Task 10: Delete the Approved Supabase Project and Finalize Evidence

**Files:**
- Modify: `.dorms-check/evidence/REPORT.md`
- Modify: `.dorms-check/evidence/report.json`
- Create: `.dorms-check/evidence/cutover/FINAL.md`

**Interfaces:**
- Consumes: successful Firebase-only Production deployment and exact old project ref `lzmtfcshypdhfdvwdbzb`.
- Produces: approved Supabase deletion, final Firebase/Vercel verification, and complete security handoff.

- [ ] **Step 1: Re-resolve the Supabase target**

Use the Supabase dashboard and current account to confirm:

```text
Project ref: lzmtfcshypdhfdvwdbzb
Purpose: your-own-demand legacy backend
Production browser requests to this project: zero
Recovery availability: value shown by the current Supabase plan/dashboard
```

Expected: all four facts are recorded in `FINAL.md`. Do not claim recoverability unless the dashboard shows it.

- [ ] **Step 2: Obtain a second destructive approval**

Ask exactly:

```text
Firebase/Vercel Production 전환과 Supabase 없는 재배포가 검증되었습니다. Supabase 프로젝트 lzmtfcshypdhfdvwdbzb와 그 안의 기존 데이터를 영구 삭제해도 될까요?
```

Expected: a fresh explicit approval. Stop without deleting if it is absent or ambiguous.

- [ ] **Step 3: Delete only the approved Supabase target**

If the dashboard proves the whole project is dedicated to this app, use **Project Settings → General → Delete project**, enter the displayed confirmation value, and delete project `lzmtfcshypdhfdvwdbzb`.

If the project is shared, do not delete the project. Delete only these tables in dependency-safe order:

```text
assignment_reservations
response_items
responses
price_points
products
survey_class_budgets
surveys
```

Expected: the dashboard confirms deletion of the exact approved project or exact listed tables.

- [ ] **Step 4: Run final repository and Production checks**

Run:

```bash
npm test
JAVA_HOME="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home" \
PATH="$JAVA_HOME/bin:$PATH" \
npm run test:firebase
npm run audit:regression
npm run typecheck
npm run lint
npm run build
curl --fail --silent --show-error --head \
  https://inflation-classroom.vercel.app \
  | tr -d '\r' \
  | rg -i 'content-security-policy|x-frame-options|x-content-type-options'
```

Repeat teacher login, one anonymous student submission, polling, edit, delete, and exact fixture cleanup.

- [ ] **Step 5: Rescan Production with the approved dorms fallback**

Run:

```bash
npx -y github:shinnanchanguk/dorms-check scan \
  --url https://inflation-classroom.vercel.app
npx -y github:shinnanchanguk/dorms-check status
```

Expected: updated `.dorms-check/evidence/REPORT.md` and `report.json`. Do not turn an unresolved or unverifiable item into a pass.

- [ ] **Step 6: Submit only if both dorms tracks pass**

If and only if `status` reports both security eligibility and edzip readiness as passing with zero remaining required items, run:

```bash
npx -y github:shinnanchanguk/dorms-check submit
```

Expected: local submission evidence is generated. State that dorms.school performs the final independent verification. If either track does not pass, do not run `submit`; record the remaining items in `FINAL.md`.

- [ ] **Step 7: Write the final handoff**

Create `.dorms-check/evidence/cutover/FINAL.md` containing:

```markdown
# Final Cutover

- Production URL: https://inflation-classroom.vercel.app
- Deployed Firebase Project ID: inflation-2e38b
- Firestore database/location: (default), asia-northeast3
- Direct client Firestore access: denied
- Authentication: Google teachers, anonymous students
- Vercel service-account role: roles/datastore.user
- Supabase project ref: lzmtfcshypdhfdvwdbzb
- Supabase deletion result: confirmed in dashboard evidence
- GitHub Pages: disabled
- Overseas-processing conclusion: Firestore storage is in Seoul; Firebase Authentication and Vercel processing still require overseas-transfer review and disclosure
- dorms-check result: local preparation only, not final dorms.school certification
```

- [ ] **Step 8: Commit final non-secret evidence**

Run:

```bash
git status --short
git diff --check
git add .dorms-check/evidence
git commit -m "docs: finalize Firebase Vercel cutover evidence"
git log -1 --oneline
```

Expected: worktree is clean; no secret or student fixture data is committed.

---

## Self-Review Record

- **Spec coverage:** Task 1 fixes remaining GitHub Pages metadata and makes the domestic-storage/overseas-processing distinction explicit. Tasks 2-3 gate and perform the exact destructive Firestore recreation. Task 4 creates least-privilege credentials and configures Auth/Vercel. Tasks 5-8 cover Preview, classroom E2E, dorms consent/review, Production, and rollback. Tasks 9-10 separately remove code/hosting and then delete the exact Supabase target behind a second approval.
- **Destructive safety:** Firestore deletion and Supabase deletion have different target-resolution evidence and different explicit approvals. Neither action uses a broad path, unresolved variable, or wildcard.
- **Privacy coverage:** Firestore Seoul residency is never represented as eliminating overseas transfer. Firebase Authentication US processing, Vercel API processing, pseudonymous UIDs, student profiles, retention uncertainty, and school/education-authority review remain visible gates.
- **Security coverage:** Direct Firestore denial, least-privilege IAM, secret transport through stdin, live CSP/API checks, student redaction, owner authorization, recursive deletion, dorms scan/judge/rescan, and rollback are all verified.
- **Type and name consistency:** Project ID is always `inflation-2e38b`; database is always `(default)`; region is always `asia-northeast3`; Vercel target is always `yadorans-projects/inflation-classroom`; Supabase ref is always `lzmtfcshypdhfdvwdbzb`.
- **Placeholder scan:** The plan contains no `TBD`, `TODO`, “implement later”, or unresolved code/type names. Runtime-derived values use bounded commands and are verified before use.
