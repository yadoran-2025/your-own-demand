# Firebase `inflation` (`inflation-2e38b`) + Vercel Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Supabase and GitHub Pages with Firebase project display name `inflation`, Project ID `inflation-2e38b`, for authentication/Firestore and Vercel for Next.js hosting/API execution, start with an empty Firebase database, then permanently remove the old Supabase data only after production verification and explicit approval.

**Architecture:** The browser authenticates with Firebase Authentication, then calls same-origin Next.js Route Handlers on Vercel with a Firebase ID token. Route Handlers use Firebase Admin SDK for every Firestore read/write, while Firestore client access is denied by default. Surveys embed products and price points; responses embed response items; a per-class transaction counter gives each student one stable, round-robin price assignment per product.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Firebase Authentication, Cloud Firestore, Firebase Admin SDK, Vercel, Vitest, Firebase Emulator Suite

## Global Constraints

- Firebase display name is `inflation`; the CLI-visible Project ID used by code, tests, environment variables, and deploy commands is `inflation-2e38b`.
- Create the default Firestore database in regional location `asia-northeast3` (Seoul); Firebase lists this as the Seoul region, and the database location cannot be casually changed after creation.
- Vercel hosts both the Next.js frontend and `/api/*` Route Handlers.
- Existing Supabase records are not copied into Firestore.
- Existing Supabase data remains untouched until Vercel production verification passes and the user gives a separate, explicit deletion approval.
- Student identity fields and individual learning results never receive direct public Firestore access.
- Teachers authenticate with Google; students authenticate anonymously.
- A non-anonymous Firebase user may create rooms and may access only rooms whose `ownerUid` equals that user's UID.
- Student result APIs redact every other student's `studentName` and `studentNumber`.
- Preserve the existing room-name UX, localStorage demo fallback, budget validation, teacher response editing, student result charts, and balanced price assignment behavior.
- Use one Firestore document per survey with embedded `classBudgets` and `products`; use one response document with embedded `items`.
- Use Firestore transactions for room-name uniqueness, assignment reservation, and response submission.
- Use server timestamps for persisted creation/update times; serialize timestamps as ISO 8601 strings at the HTTP boundary.
- Do not add Cloud Functions, a custom session-cookie system, Redux, an ORM, or a second API framework.
- Do not use `npm audit fix --force`, dependency downgrades, or untested package overrides to chase an audit count of zero.
- Treat the six production advisory IDs recorded in `docs/security/dependency-audit-baseline.json` as a temporary, owner-accepted baseline only; any new production advisory or any critical advisory blocks further work.
- The accepted advisories remain non-exploitable only while the app accepts no user-controlled CSS/source maps, uses no `next/image` or untrusted image processing, and imports no Firebase Admin Storage API.
- Run `npm run audit:regression` after dependency changes and immediately before Vercel Preview and Production promotion.
- Reassess every accepted advisory against actual application paths before production; a newly reachable advisory blocks deployment even when its ID is in the baseline.
- Every task ends with its listed checks passing before its commit.

---

## File Map

**Create**

- `vitest.config.ts` — Vitest alias and Node test configuration.
- `lib/firebase/client.ts` — browser Firebase app/Auth initialization.
- `lib/firebase/admin.ts` — server-only Admin app/Auth/Firestore initialization.
- `lib/firebase/documents.ts` — Firestore document types and API serialization helpers.
- `lib/server/auth.ts` — bearer-token verification and teacher/student authorization.
- `lib/server/http.ts` — consistent JSON success/error responses.
- `lib/server/rooms.ts` — room normalization, hashed lookup, ownership, and default-room creation.
- `lib/server/surveys.ts` — survey validation and teacher/student survey reads/writes.
- `lib/server/assignments.ts` — stable round-robin reservations in Firestore transactions.
- `lib/server/responses.ts` — response validation, submission, redacted reads, edits, and deletion.
- `lib/api-client.ts` — same-origin authenticated fetch wrapper.
- `components/AuthProvider.tsx` — anonymous bootstrap and Google teacher sign-in state.
- `components/TeacherAuthGate.tsx` — teacher-only UI gate.
- `app/api/rooms/ensure/route.ts` — create/resolve a teacher-owned room.
- `app/api/surveys/route.ts` — list/create/update surveys.
- `app/api/surveys/[surveyId]/route.ts` — delete a survey recursively.
- `app/api/assignments/reserve/route.ts` — reserve balanced assignments.
- `app/api/responses/route.ts` — submit/list responses.
- `app/api/responses/[responseId]/route.ts` — update/delete a response.
- `firestore.rules` — deny all direct client access.
- `firebase.json` — Firestore emulator/rules configuration only.
- `.firebaserc` — bind local tooling to Project ID `inflation-2e38b`.
- `tests/firebase/rules.test.ts` — prove direct Firestore access is denied.
- `tests/server/firebase-test-env.ts` — point Admin SDK tests at the Firestore emulator and clear fixtures.
- `tests/server/rooms.test.ts` — room normalization and ownership integration tests.
- `tests/server/surveys.test.ts` — survey validation and ownership integration tests.
- `tests/server/assignments.test.ts` — stable and balanced assignment integration tests.
- `tests/server/responses.test.ts` — submission, redaction, budget, edit, and deletion tests.
- `tests/lib/api-client.test.ts` — bearer-token and API error tests.
- `docs/security/dependency-risk.md` — accepted advisory scope, exposure analysis, and production recheck rules.
- `docs/security/dependency-audit-baseline.json` — exact accepted production advisory IDs.
- `scripts/check-dependency-audit.mjs` — fail on new or critical production advisories.
- `scripts/check-dependency-audit.d.mts` — TypeScript declarations for the audit checker imported by tests.
- `tests/lib/dependency-audit.test.ts` — regression tests for audit comparison.

**Modify**

- `package.json`, `package-lock.json` — Firebase and test dependencies/scripts.
- `next.config.ts` — remove static export and GitHub Pages base path.
- `app/layout.tsx` — mount `AuthProvider`.
- `lib/types.ts` — add API/auth types while keeping current UI model names.
- `lib/data.ts` — retain its public API, replace Supabase branches with Vercel API calls.
- `app/teacher/page.tsx` — require teacher authentication.
- `app/teacher/setup/page.tsx` — require teacher authentication and pass room name on deletion.
- `app/teacher/results/page.tsx` — replace Supabase Realtime with polling.
- `app/teacher/budget-results/page.tsx` — replace Supabase Realtime with polling.
- `app/teacher/responses/page.tsx` — require teacher authentication.
- `app/student/page.tsx` — update remote-storage copy.
- `app/student/results/page.tsx` — update remote-storage copy.
- `components/StudentResponseForm.tsx` — consume API response IDs unchanged.
- `.env.example` — Firebase browser/server environment variables.
- `vercel.json` — remove Supabase CSP origins and add Firebase Auth origins.
- `app/privacy/page.tsx` — replace Supabase/GitHub Pages processor and transfer language.
- `README.md` — Firebase/Vercel setup, emulator, deployment, and verification.

**Delete only after production cutover succeeds**

- `lib/supabase.ts`
- `supabase/schema.sql`
- `supabase/migrations/20260512000000_class_scoped_balanced_assignments.sql`
- `supabase/migrations/20260514000000_transactional_student_response.sql`
- `supabase/migrations/20260718063239_lock_private_response_reads.sql`
- `.github/workflows/deploy-pages.yml`
- `public/_headers` — Netlify-style header file is not used by Vercel; `vercel.json` becomes the single header source.

---

### Task 1: Record and Enforce the Temporary Dependency-Risk Baseline

**Files:**
- Modify: `package.json`
- Create: `docs/security/dependency-risk.md`
- Create: `docs/security/dependency-audit-baseline.json`
- Create: `scripts/check-dependency-audit.mjs`
- Create: `scripts/check-dependency-audit.d.mts`
- Create: `tests/lib/dependency-audit.test.ts`

**Interfaces:**
- Consumes: current committed dependency state after commits `1c3f7dd` and `0a6456f`, plus `npm audit --omit=dev --json`.
- Produces: `collectAdvisories(report)`, `compareAudit(report, baseline)`, and `npm run audit:regression`.

- [ ] **Step 1: Write the failing comparison tests**

Create `tests/lib/dependency-audit.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  collectAdvisories,
  compareAudit,
} from "@/scripts/check-dependency-audit.mjs";

const known = {
  advisories: [
    {
      url: "https://github.com/advisories/GHSA-f88m-g3jw-g9cj",
      severity: "high",
    },
  ],
};

describe("dependency audit regression", () => {
  it("accepts only recorded production advisories", () => {
    const report = {
      vulnerabilities: {
        sharp: {
          via: [{
            url: "https://github.com/advisories/GHSA-f88m-g3jw-g9cj",
            severity: "high",
          }],
        },
      },
    };
    expect(compareAudit(report, known)).toEqual({
      accepted: ["https://github.com/advisories/GHSA-f88m-g3jw-g9cj"],
      critical: [],
      introduced: [],
      ok: true,
    });
  });

  it("rejects a new advisory and every critical advisory", () => {
    const report = {
      vulnerabilities: {
        packageA: {
          via: [
            {
              url: "https://github.com/advisories/GHSA-new1-new2-new3",
              severity: "high",
            },
            {
              url: "https://github.com/advisories/GHSA-crit-ical-risk",
              severity: "critical",
            },
          ],
        },
      },
    };
    expect(collectAdvisories(report)).toHaveLength(2);
    expect(compareAudit(report, known)).toMatchObject({
      critical: ["https://github.com/advisories/GHSA-crit-ical-risk"],
      introduced: [
        "https://github.com/advisories/GHSA-crit-ical-risk",
        "https://github.com/advisories/GHSA-new1-new2-new3",
      ],
      ok: false,
    });
  });

  it("rejects a recorded advisory when its severity becomes critical", () => {
    const report = {
      vulnerabilities: {
        sharp: {
          via: [{
            url: "https://github.com/advisories/GHSA-f88m-g3jw-g9cj",
            severity: "critical",
          }],
        },
      },
    };
    expect(compareAudit(report, known)).toEqual({
      accepted: ["https://github.com/advisories/GHSA-f88m-g3jw-g9cj"],
      critical: ["https://github.com/advisories/GHSA-f88m-g3jw-g9cj"],
      introduced: [],
      ok: false,
    });
  });

  it("fails closed on unresolved npm audit references", () => {
    const report = {
      vulnerabilities: {
        aggregate: { via: ["missing-package"] },
      },
    };
    expect(() => compareAudit(report, known)).toThrow(
      "Unrecognized npm audit reference: missing-package",
    );
  });

  it("resolves string references to their advisory objects", () => {
    const report = {
      vulnerabilities: {
        next: { via: ["sharp"] },
        sharp: {
          via: [{
            url: "https://github.com/advisories/GHSA-f88m-g3jw-g9cj",
            severity: "high",
          }],
        },
      },
    };
    expect(compareAudit(report, known)).toMatchObject({
      accepted: ["https://github.com/advisories/GHSA-f88m-g3jw-g9cj"],
      introduced: [],
      ok: true,
    });
  });

  it.each([
    { aggregate: {} },
    { aggregate: { via: [{ severity: "high" }] } },
  ])("fails closed on malformed vulnerability data: %j", (vulnerabilities) => {
    expect(() => compareAudit({ vulnerabilities }, known)).toThrow(
      "Unrecognized npm audit",
    );
  });
});
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run:

```bash
npm test -- tests/lib/dependency-audit.test.ts
```

Expected: FAIL because `scripts/check-dependency-audit.mjs` does not exist.

- [ ] **Step 3: Record the exact accepted advisory IDs**

Create `docs/security/dependency-audit-baseline.json`:

```json
{
  "recordedAt": "2026-07-28",
  "scope": "npm audit --omit=dev",
  "advisories": [
    {
      "url": "https://github.com/advisories/GHSA-mh99-v99m-4gvg",
      "severity": "high"
    },
    {
      "url": "https://github.com/advisories/GHSA-qx2v-qp2m-jg93",
      "severity": "moderate"
    },
    {
      "url": "https://github.com/advisories/GHSA-6g55-p6wh-862q",
      "severity": "high"
    },
    {
      "url": "https://github.com/advisories/GHSA-r28c-9q8g-f849",
      "severity": "high"
    },
    {
      "url": "https://github.com/advisories/GHSA-f88m-g3jw-g9cj",
      "severity": "high"
    },
    {
      "url": "https://github.com/advisories/GHSA-w5hq-g745-h8pq",
      "severity": "moderate"
    }
  ]
}
```

- [ ] **Step 4: Implement the comparison and CLI**

Create `scripts/check-dependency-audit.mjs`:

```js
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export function collectAdvisories(report) {
  const byUrl = new Map();
  const vulnerabilities = report.vulnerabilities ?? {};
  const visited = new Set();

  function visit(name) {
    if (visited.has(name)) return;
    visited.add(name);
    const vulnerability = vulnerabilities[name];
    if (!vulnerability) {
      throw new Error(`Unrecognized npm audit reference: ${name}`);
    }
    if (!Array.isArray(vulnerability.via)) {
      throw new Error(`Unrecognized npm audit vulnerability entry: ${name}`);
    }
    for (const via of vulnerability.via) {
      if (typeof via === "string") {
        visit(via);
        continue;
      }
      if (!via?.url || !via?.severity) {
        throw new Error(
          `Unrecognized npm audit advisory entry: ${JSON.stringify(via)}`,
        );
      }
      byUrl.set(via.url, {
        severity: via.severity,
        url: via.url,
      });
    }
  }

  for (const name of Object.keys(vulnerabilities)) visit(name);

  return [...byUrl.values()].sort((left, right) =>
    left.url.localeCompare(right.url),
  );
}

export function compareAudit(report, baseline) {
  const allowed = new Set(baseline.advisories.map((item) => item.url));
  const advisories = collectAdvisories(report);
  const accepted = advisories
    .filter((item) => allowed.has(item.url))
    .map((item) => item.url);
  const introduced = advisories
    .filter((item) => !allowed.has(item.url))
    .map((item) => item.url);
  const critical = advisories
    .filter((item) => item.severity === "critical")
    .map((item) => item.url);
  return {
    accepted,
    critical,
    introduced,
    ok: introduced.length === 0 && critical.length === 0,
  };
}

async function main() {
  const audit = spawnSync("npm", ["audit", "--omit=dev", "--json"], {
    encoding: "utf8",
  });
  if (!audit.stdout.trim()) {
    console.error(audit.stderr || "npm audit returned no JSON.");
    process.exit(2);
  }
  const report = JSON.parse(audit.stdout);
  const baseline = JSON.parse(
    await readFile(
      new URL("../docs/security/dependency-audit-baseline.json", import.meta.url),
      "utf8",
    ),
  );
  const result = compareAudit(report, baseline);
  console.log(
    `${result.accepted.length} accepted advisories; ` +
    `${result.introduced.length} new; ${result.critical.length} critical`,
  );
  if (!result.ok) {
    for (const url of result.introduced) console.error(`NEW ${url}`);
    for (const url of result.critical) console.error(`CRITICAL ${url}`);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
```

Create `scripts/check-dependency-audit.d.mts`:

```ts
export type AuditAdvisory = {
  severity: string;
  url: string;
};

export type AuditReport = {
  vulnerabilities?: Record<string, {
    via?: Array<string | AuditAdvisory>;
  }>;
};

export type AuditBaseline = {
  advisories: AuditAdvisory[];
};

export function collectAdvisories(report: AuditReport): AuditAdvisory[];
export function compareAudit(
  report: AuditReport,
  baseline: AuditBaseline,
): {
  accepted: string[];
  critical: string[];
  introduced: string[];
  ok: boolean;
};
```

Add to `package.json`:

```json
"audit:regression": "node scripts/check-dependency-audit.mjs"
```

- [ ] **Step 5: Document why the current baseline is temporarily accepted**

Create `docs/security/dependency-risk.md` with these exact operational conclusions:

```markdown
# Dependency advisory baseline

Recorded: 2026-07-28

`npm audit --omit=dev` currently resolves six distinct advisory IDs through
Next.js and Firebase Admin dependency trees. Safe compatible upgrades were
applied in commit `0a6456f`; `npm audit fix --force` proposes breaking
downgrades and is prohibited.

Temporary exposure ruling:

- PostCSS advisories are not reachable because the application accepts no
  user-controlled CSS, source maps, or build input.
- The Sharp/libvips advisory is not reachable while the application imports no
  `next/image`, exposes no image-optimization endpoint in its UI, and processes
  no user-supplied images.
- Firebase Admin Storage/UUID advisories are not reachable while server code
  imports only `firebase-admin/app`, `firebase-admin/auth`, and
  `firebase-admin/firestore`; Storage APIs and user-provided UUID buffers are
  forbidden.
- Brace-expansion/minimatch/glob/rimraf findings are transitive tooling paths;
  application request data must never be passed to those packages.

This is not blanket acceptance of high-severity findings. Run
`npm run audit:regression` after every dependency change and before Preview and
Production deployment. Any new advisory, any critical advisory, use of
`next/image`, user-controlled CSS/source maps/images, Firebase Admin Storage, or
changed request flow into the listed packages blocks deployment until this
document and baseline are reviewed again.
```

- [ ] **Step 6: Verify RED became GREEN and validate exposure assumptions**

Run:

```bash
npm test -- tests/lib/dependency-audit.test.ts
npm run audit:regression
rg -n "from ['\"]next/image|<Image" app components lib
rg -n "firebase-admin/storage|getStorage" app components lib
npm run typecheck
npm run lint
npm run build
```

Expected: test, audit regression, typecheck, lint, and build exit 0. Both `rg`
commands print no matches. Audit output reports `6 accepted advisories; 0 new;
0 critical`.

- [ ] **Step 7: Commit**

```bash
git add package.json docs/security scripts/check-dependency-audit.mjs scripts/check-dependency-audit.d.mts tests/lib/dependency-audit.test.ts
git commit -m "security: baseline accepted dependency advisories"
```

---

### Task 2: Configure Firebase `inflation-2e38b` and Deny Direct Firestore Access

**Files:**
- Create: `.firebaserc`
- Create: `firebase.json`
- Create: `firestore.rules`
- Create: `tests/firebase/rules.test.ts`
- Create: `lib/firebase/client.ts`
- Create: `lib/firebase/admin.ts`
- Modify: `.env.example`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: Firebase packages installed in Task 1.
- Produces: `isFirebaseConfigured: boolean`, `getClientAuth(): Auth`, `adminAuth: Auth`, `adminDb: Firestore`.

- [ ] **Step 1: Verify the exact Firebase project**

Run:

```bash
npx firebase-tools projects:list
```

Expected: one row has display name `inflation` and Project ID exactly `inflation-2e38b`. Stop before configuration or deployment if it does not.

- [ ] **Step 2: Write the deny-all rules test**

Create `tests/firebase/rules.test.ts`:

```ts
import { readFileSync } from "node:fs";
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, beforeAll, describe, it } from "vitest";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "inflation-2e38b",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

describe("Firestore rules", () => {
  it("denies anonymous and authenticated direct access", async () => {
    const anonymous = env.unauthenticatedContext().firestore();
    const student = env.authenticatedContext("student-1").firestore();

    await assertFails(getDoc(doc(anonymous, "rooms/room-1")));
    await assertFails(setDoc(doc(student, "rooms/room-1"), { name: "경제" }));
  });
});
```

- [ ] **Step 3: Add Firebase project and emulator configuration**

Create `.firebaserc`:

```json
{
  "projects": {
    "default": "inflation-2e38b"
  }
}
```

Create `firebase.json`:

```json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "emulators": {
    "firestore": {
      "host": "127.0.0.1",
      "port": 8080
    },
    "ui": {
      "enabled": false
    },
    "singleProjectMode": true
  }
}
```

Create `firestore.rules`:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 4: Run the rules test**

Run:

```bash
npm run test:firebase
```

Expected: PASS for both unauthenticated read and authenticated write denial.

- [ ] **Step 5: Add browser and server Firebase initializers**

Create `lib/firebase/client.ts`:

```ts
"use client";

import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId,
);

export function getClientAuth() {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase browser environment variables are missing.");
  }
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getAuth(app);
}
```

Create `lib/firebase/admin.ts`:

```ts
import "server-only";

import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID ?? "inflation-2e38b";
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

if (!emulator && (!process.env.FIREBASE_CLIENT_EMAIL || !privateKey)) {
  throw new Error("Firebase Admin environment variables are missing.");
}

const app = getApps().length
  ? getApp()
  : initializeApp(emulator
      ? { projectId }
      : {
          credential: cert({
            projectId,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
            privateKey: privateKey!,
          }),
        });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
```

- [ ] **Step 6: Document environment names without secrets**

Replace `.env.example` with:

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=your-web-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=inflation-2e38b.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=inflation-2e38b
FIREBASE_PROJECT_ID=inflation-2e38b
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@example.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nreplace-with-vercel-secret\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_TEACHER_REVIEW_URL=https://blog.naver.com/yadoransw/224282983636
```

Ensure `.gitignore` includes:

```gitignore
.env
.env.local
.env.*.local
firebase-debug.log
firestore-debug.log
```

- [ ] **Step 7: Verify Firebase files**

Run:

```bash
npm run typecheck
npm run test:firebase
```

Expected: both commands exit 0.

- [ ] **Step 8: Commit**

```bash
git add .firebaserc firebase.json firestore.rules tests/firebase/rules.test.ts lib/firebase/client.ts lib/firebase/admin.ts .env.example .gitignore
git commit -m "feat: configure locked-down Firebase backend"
```

---

### Task 3: Add Firebase Authentication and API Token Transport

**Files:**
- Create: `components/AuthProvider.tsx`
- Create: `components/TeacherAuthGate.tsx`
- Create: `lib/auth-state.ts`
- Create: `lib/teacher-access.ts`
- Create: `lib/api-client.ts`
- Create: `tests/lib/api-client.test.ts`
- Create: `tests/lib/auth-state.test.ts`
- Create: `tests/lib/teacher-access.test.ts`
- Modify: `app/layout.tsx`
- Modify: `app/teacher/page.tsx`
- Modify: `app/teacher/setup/page.tsx`
- Modify: `app/teacher/results/page.tsx`
- Modify: `app/teacher/budget-results/page.tsx`
- Modify: `app/teacher/responses/page.tsx`

**Interfaces:**
- Consumes: `getClientAuth()` from Task 2.
- Produces: `useAuth(): { user: User | null; ready: boolean; isTeacher: boolean; demoMode: boolean; signInTeacher(): Promise<void>; signOutUser(): Promise<void> }`, `applyAuthState<T>(nextUser, handlers): Promise<void>`, `canAccessTeacherData(state): boolean`, `apiFetch<T>(input: string, init?: RequestInit): Promise<T>`.

- [ ] **Step 1: Write failing API-header, auth-state, and teacher-access tests**

Create `tests/lib/api-client.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const getIdToken = vi.fn().mockResolvedValue("firebase-token");
const auth = {
  currentUser: { getIdToken },
};

vi.mock("@/lib/firebase/client", () => ({
  getClientAuth: () => auth,
}));

describe("apiFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    auth.currentUser = { getIdToken };
  });

  it("adds the Firebase bearer token and surfaces API messages", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "방을 찾지 못했습니다." }), { status: 404 }),
      );
    const { apiFetch } = await import("@/lib/api-client");

    await expect(apiFetch<{ ok: boolean }>("/api/check")).resolves.toEqual({ ok: true });
    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer firebase-token");
    expect(headers.get("Content-Type")).toBe("application/json");
    await expect(apiFetch("/api/missing")).rejects.toThrow("방을 찾지 못했습니다.");
  });

  it("preserves Headers input but cannot be given a spoofed authorization", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const { apiFetch } = await import("@/lib/api-client");
    await apiFetch("/api/check", {
      headers: new Headers({
        Authorization: "Bearer attacker-token",
        "X-Request-ID": "request-1",
      }),
    });
    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer firebase-token");
    expect(headers.get("X-Request-ID")).toBe("request-1");
  });

  it("rejects before fetch when no Firebase user exists", async () => {
    auth.currentUser = null as never;
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const { apiFetch } = await import("@/lib/api-client");
    await expect(apiFetch("/api/check")).rejects.toThrow("로그인이 필요합니다.");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
```

Create `tests/lib/auth-state.test.ts`:

```ts
import { expect, it, vi } from "vitest";
import { applyAuthState } from "@/lib/auth-state";

it("clears stale teacher state and starts anonymous auth exactly once", async () => {
  const setUser = vi.fn();
  const setReady = vi.fn();
  const signInGuest = vi.fn().mockResolvedValue(undefined);
  await applyAuthState(null, { setReady, setUser, signInGuest });
  expect(setUser).toHaveBeenCalledWith(null);
  expect(setReady).toHaveBeenCalledWith(false);
  expect(signInGuest).toHaveBeenCalledTimes(1);
});

it("marks a resolved Firebase user ready without anonymous auth", async () => {
  const user = { isAnonymous: false };
  const setUser = vi.fn();
  const setReady = vi.fn();
  const signInGuest = vi.fn();
  await applyAuthState(user, { setReady, setUser, signInGuest });
  expect(setUser).toHaveBeenCalledWith(user);
  expect(setReady).toHaveBeenCalledWith(true);
  expect(signInGuest).not.toHaveBeenCalled();
});
```

Create `tests/lib/teacher-access.test.ts`:

```ts
import { expect, it } from "vitest";
import { canAccessTeacherData } from "@/lib/teacher-access";

it("allows local demo and authenticated teachers only", () => {
  expect(canAccessTeacherData({ demoMode: true, isTeacher: false, ready: true })).toBe(true);
  expect(canAccessTeacherData({ demoMode: false, isTeacher: true, ready: true })).toBe(true);
  expect(canAccessTeacherData({ demoMode: false, isTeacher: true, ready: false })).toBe(false);
  expect(canAccessTeacherData({ demoMode: false, isTeacher: false, ready: true })).toBe(false);
});
```

- [ ] **Step 2: Run tests and verify the missing behavior**

Run:

```bash
npm test -- tests/lib/api-client.test.ts tests/lib/auth-state.test.ts tests/lib/teacher-access.test.ts
```

Expected: FAIL because `lib/auth-state.ts` and `lib/teacher-access.ts` do not exist; the existing API client also fails the `Headers` and missing-user cases.

- [ ] **Step 3: Implement fail-safe header construction**

Replace `lib/api-client.ts` with:

```ts
"use client";

import { getClientAuth } from "@/lib/firebase/client";

export async function apiFetch<T>(input: string, init: RequestInit = {}): Promise<T> {
  const user = getClientAuth().currentUser;
  if (!user) throw new Error("로그인이 필요합니다.");
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(input, {
    ...init,
    headers,
  });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? "요청을 처리하지 못했습니다.");
  }
  return body;
}
```

- [ ] **Step 4: Implement single-path auth transitions**

Create `lib/auth-state.ts`:

```ts
type AuthStateHandlers<T> = {
  setUser: (user: T | null) => void;
  setReady: (ready: boolean) => void;
  signInGuest: () => Promise<unknown>;
};

export async function applyAuthState<T>(
  nextUser: T | null,
  handlers: AuthStateHandlers<T>,
) {
  handlers.setUser(nextUser);
  if (nextUser) {
    handlers.setReady(true);
    return;
  }
  handlers.setReady(false);
  await handlers.signInGuest();
}
```

Update `components/AuthProvider.tsx` so `onAuthStateChanged` is the only place that starts anonymous auth:

```tsx
"use client";

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getClientAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { applyAuthState } from "@/lib/auth-state";

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  isTeacher: boolean;
  demoMode: boolean;
  signInTeacher: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setReady(true);
      return;
    }
    const auth = getClientAuth();
    return onAuthStateChanged(auth, (nextUser) => {
      void applyAuthState(nextUser, {
        setReady,
        setUser,
        signInGuest: () => signInAnonymously(auth),
      }).catch(() => setReady(true));
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    ready,
    demoMode: !isFirebaseConfigured,
    isTeacher: !isFirebaseConfigured || Boolean(user && !user.isAnonymous),
    signInTeacher: async () => {
      if (!isFirebaseConfigured) return;
      await signInWithPopup(getClientAuth(), new GoogleAuthProvider());
    },
    signOutUser: async () => {
      if (!isFirebaseConfigured) return;
      setReady(false);
      await signOut(getClientAuth());
    },
  }), [user, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
```

Keep `components/TeacherAuthGate.tsx` as the visible login/loading boundary:

```tsx
"use client";

import { useAuth } from "@/components/AuthProvider";

export function TeacherAuthGate({ children }: { children: React.ReactNode }) {
  const { ready, isTeacher, demoMode, signInTeacher } = useAuth();
  if (!ready) return <main className="teacher-login">로그인 상태를 확인하는 중입니다.</main>;
  if (demoMode) return children;
  if (!isTeacher) {
    return (
      <main className="teacher-login">
        <h1>교사 로그인</h1>
        <p>내 수업 방과 학생 응답을 관리하려면 Google 계정으로 로그인하세요.</p>
        <button className="primary-button" onClick={() => void signInTeacher()} type="button">
          Google로 로그인
        </button>
      </main>
    );
  }
  return children;
}
```

- [ ] **Step 5: Make auth state gate the teacher data effects**

Create `lib/teacher-access.ts`:

```ts
export type TeacherAccessState = {
  ready: boolean;
  isTeacher: boolean;
  demoMode: boolean;
};

export function canAccessTeacherData(state: TeacherAccessState) {
  return state.demoMode || (state.ready && state.isTeacher);
}
```

Wrap `app/layout.tsx` body content:

```tsx
<AuthProvider>{children}</AuthProvider>
```

Wrap each teacher page's current top-level returned UI:

```tsx
<TeacherAuthGate>
  {/* existing page UI */}
</TeacherAuthGate>
```

Add imports from `@/components/AuthProvider` and `@/components/TeacherAuthGate` as required.

In each of these five pages:

```text
app/teacher/page.tsx
app/teacher/setup/page.tsx
app/teacher/results/page.tsx
app/teacher/budget-results/page.tsx
app/teacher/responses/page.tsx
```

read auth state unconditionally:

```tsx
const { ready: authReady, isTeacher, demoMode } = useAuth();
const canUseTeacherData = canAccessTeacherData({
  ready: authReady,
  isTeacher,
  demoMode,
});
```

Every callback that reads, creates, updates, or deletes teacher data must start with:

```ts
if (!canUseTeacherData) return;
```

Every `useEffect` that triggers teacher data work must also return before invoking it:

```ts
if (!canUseTeacherData) return;
```

Include `canUseTeacherData` in callback/effect dependency arrays. Keep all Hooks unconditional.

- [ ] **Step 6: Verify auth transport, auth gating, and UI compilation**

Run:

```bash
npm test -- tests/lib/api-client.test.ts tests/lib/auth-state.test.ts tests/lib/teacher-access.test.ts
npm test
npm run audit:regression
npm run typecheck
npm run lint
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add components/AuthProvider.tsx components/TeacherAuthGate.tsx lib/api-client.ts lib/auth-state.ts lib/teacher-access.ts tests/lib/api-client.test.ts tests/lib/auth-state.test.ts tests/lib/teacher-access.test.ts app/layout.tsx app/teacher
git commit -m "feat: add Firebase teacher and student authentication"
```

---

### Task 4: Implement Server Authorization, Room Lookup, and Default Room Creation

**Files:**
- Create: `lib/server/auth.ts`
- Create: `lib/server/http.ts`
- Create: `lib/firebase/documents.ts`
- Create: `lib/server/rooms.ts`
- Create: `app/api/rooms/ensure/route.ts`
- Create: `tests/server/rooms.test.ts`
- Create: `tests/server/auth.test.ts`
- Create: `tests/server/firebase-test-env.ts`

**Interfaces:**
- Consumes: `adminAuth`, `adminDb`, `createDefaultDraft()`.
- Produces: `requireUser(request): Promise<DecodedIdToken>`, `requireTeacher(request): Promise<DecodedIdToken>`, `normalizeRoomName(name): string`, `roomLookupId(name): string`, `ensureTeacherRoom(uid, name): Promise<{ roomId: string; name: string }>`, `resolveRoom(name): Promise<RoomDocument | null>`.

- [ ] **Step 1: Define document types**

Create `lib/firebase/documents.ts`:

```ts
import type { Timestamp } from "firebase-admin/firestore";
import type { ClassBudget, Product, ResponseItem } from "@/lib/types";

export type RoomDocument = {
  ownerUid: string;
  name: string;
  normalizedName: string;
  createdAt: Timestamp;
};

export type SurveyDocument = {
  title: string;
  classBudgets: ClassBudget[];
  products: Product[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ResponseDocument = {
  submitterUid: string;
  grade: number;
  classNumber: number;
  studentNumber: number;
  studentName: string;
  items: ResponseItem[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ReservationDocument = {
  submitterUid: string;
  grade: number;
  classNumber: number;
  studentName: string;
  assignments: Record<string, string>;
  expiresAt: Timestamp;
  consumedAt: Timestamp | null;
};
```

- [ ] **Step 2: Write room integration tests against the emulator**

Create `tests/server/firebase-test-env.ts`:

```ts
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_PROJECT_ID = "inflation-2e38b";

export async function clearFirebaseTestData() {
  const { adminDb } = await import("@/lib/firebase/admin");
  await Promise.all([
    adminDb.recursiveDelete(adminDb.collection("roomNames")),
    adminDb.recursiveDelete(adminDb.collection("rooms")),
  ]);
}
```

Create `tests/server/rooms.test.ts` with:

```ts
import { beforeEach, expect, it } from "vitest";
import { clearFirebaseTestData } from "./firebase-test-env";

beforeEach(clearFirebaseTestData);

it("normalizes equivalent room names to one lookup id", async () => {
  const { normalizeRoomName, roomLookupId } = await import("@/lib/server/rooms");
  expect(normalizeRoomName("  경제   1반 ")).toBe("경제 1반");
  expect(roomLookupId("경제   1반")).toBe(roomLookupId(" 경제 1반 "));
});

it("creates one owner-bound room and rejects a second owner", async () => {
  const { ensureTeacherRoom } = await import("@/lib/server/rooms");
  const first = await ensureTeacherRoom("teacher-a", "경제 1반");
  await expect(ensureTeacherRoom("teacher-b", "경제 1반")).rejects.toThrow(
    "이미 다른 교사가 사용 중인 방 이름입니다.",
  );
  await expect(ensureTeacherRoom("teacher-a", "경제 1반")).resolves.toEqual(first);
});
```

Create `tests/server/auth.test.ts`:

```ts
import { beforeEach, expect, it, vi } from "vitest";

const { verifyIdToken } = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: { verifyIdToken },
}));

beforeEach(() => verifyIdToken.mockReset());

function bearerRequest() {
  return new Request("http://localhost/api/test", {
    headers: { Authorization: "Bearer test-token" },
  });
}

it("classifies a rejected Firebase token as 401", async () => {
  verifyIdToken.mockRejectedValue(new Error("auth/id-token-expired"));
  const { requireUser } = await import("@/lib/server/auth");
  await expect(requireUser(bearerRequest())).rejects.toMatchObject({
    message: "유효한 로그인이 필요합니다.",
    status: 401,
  });
});

it.each([
  { firebase: { sign_in_provider: "anonymous" }, uid: "student" },
  { firebase: {}, uid: "missing-provider" },
])("classifies a non-teacher token as 403: %j", async (token) => {
  verifyIdToken.mockResolvedValue(token);
  const { requireTeacher } = await import("@/lib/server/auth");
  await expect(requireTeacher(bearerRequest())).rejects.toMatchObject({
    message: "교사 권한이 필요합니다.",
    status: 403,
  });
});

it("accepts a verified non-anonymous teacher", async () => {
  const teacher = {
    firebase: { sign_in_provider: "google.com" },
    uid: "teacher",
  };
  verifyIdToken.mockResolvedValue(teacher);
  const { requireTeacher } = await import("@/lib/server/auth");
  await expect(requireTeacher(bearerRequest())).resolves.toBe(teacher);
});

it("uses an explicit HttpError status in the JSON response", async () => {
  const { HttpError, jsonError } = await import("@/lib/server/http");
  const response = jsonError(new HttpError(403, "교사 권한이 필요합니다."));
  expect(response.status).toBe(403);
  await expect(response.json()).resolves.toEqual({
    error: "교사 권한이 필요합니다.",
  });
});
```

- [ ] **Step 3: Run tests and verify missing implementation failure**

Run:

```bash
npm run test:firebase
```

Expected for a fresh implementation: FAIL because `lib/server/rooms.ts` does not exist. During the reviewed Task 4 fix, run `tests/server/auth.test.ts` against the existing implementation and expect failures because rejected tokens have no explicit `status`, anonymous tokens report 401 semantics, and missing providers pass.

- [ ] **Step 4: Implement auth and JSON helpers**

Create `lib/server/auth.ts`:

```ts
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebase/admin";
import { HttpError } from "@/lib/server/http";

export async function requireUser(request: Request): Promise<DecodedIdToken> {
  const value = request.headers.get("authorization");
  if (!value?.startsWith("Bearer ")) {
    throw new HttpError(401, "로그인이 필요합니다.");
  }
  try {
    return await adminAuth.verifyIdToken(value.slice(7));
  } catch {
    throw new HttpError(401, "유효한 로그인이 필요합니다.");
  }
}

export async function requireTeacher(request: Request): Promise<DecodedIdToken> {
  const token = await requireUser(request);
  const provider = token.firebase?.sign_in_provider;
  if (!provider || provider === "anonymous") {
    throw new HttpError(403, "교사 권한이 필요합니다.");
  }
  return token;
}
```

Create `lib/server/http.ts`:

```ts
import { NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const jsonOk = <T>(body: T, status = 200) => NextResponse.json(body, { status });

export function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : "요청을 처리하지 못했습니다.";
  const status = error instanceof HttpError ? error.status
    : message.includes("권한") || message.includes("다른 교사") ? 403
    : message.includes("찾지 못") ? 404
    : 400;
  return NextResponse.json({ error: message }, { status });
}
```

- [ ] **Step 5: Implement normalized, hashed room lookup**

Create `lib/server/rooms.ts` with these exact normalization rules:

```ts
import { createHash, randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { RoomDocument } from "@/lib/firebase/documents";

export function normalizeRoomName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function roomLookupId(value: string) {
  return createHash("sha256").update(normalizeRoomName(value)).digest("hex");
}

export async function ensureTeacherRoom(uid: string, name: string) {
  const normalizedName = normalizeRoomName(name);
  if (!normalizedName) throw new Error("방 이름을 입력해 주세요.");
  const lookupRef = adminDb.doc(`roomNames/${roomLookupId(normalizedName)}`);

  return adminDb.runTransaction(async (transaction) => {
    const lookup = await transaction.get(lookupRef);
    if (lookup.exists) {
      const roomId = lookup.get("roomId") as string;
      const room = await transaction.get(adminDb.doc(`rooms/${roomId}`));
      if (room.get("ownerUid") !== uid) {
        throw new Error("이미 다른 교사가 사용 중인 방 이름입니다.");
      }
      return { roomId, name: room.get("name") as string };
    }
    const roomId = randomUUID();
    transaction.create(adminDb.doc(`rooms/${roomId}`), {
      ownerUid: uid,
      name: normalizedName,
      normalizedName,
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.create(lookupRef, { roomId });
    return { roomId, name: normalizedName };
  });
}

export async function resolveRoom(name: string) {
  const lookup = await adminDb.doc(`roomNames/${roomLookupId(name)}`).get();
  if (!lookup.exists) return null;
  const room = await adminDb.doc(`rooms/${lookup.get("roomId") as string}`).get();
  return room.exists ? { id: room.id, ...(room.data() as RoomDocument) } : null;
}
```

- [ ] **Step 6: Implement room ensure route**

Create `app/api/rooms/ensure/route.ts`:

```ts
import { requireTeacher } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/http";
import { ensureTeacherRoom } from "@/lib/server/rooms";

export async function POST(request: Request) {
  try {
    const teacher = await requireTeacher(request);
    const { name } = (await request.json()) as { name: string };
    return jsonOk(await ensureTeacherRoom(teacher.uid, name), 201);
  } catch (error) {
    return jsonError(error);
  }
}
```

- [ ] **Step 7: Verify room behavior**

Run:

```bash
npm run test:firebase
npm run typecheck
npm run lint
```

Expected: all commands exit 0.

- [ ] **Step 8: Commit**

```bash
git add lib/firebase/documents.ts lib/server/auth.ts lib/server/http.ts lib/server/rooms.ts app/api/rooms/ensure/route.ts tests/server/firebase-test-env.ts tests/server/rooms.test.ts tests/server/auth.test.ts
git commit -m "feat: add owner-bound Firebase rooms"
```

---

### Task 5: Implement Survey Storage and Teacher Ownership

**Files:**
- Create: `lib/server/surveys.ts`
- Create: `app/api/surveys/route.ts`
- Create: `app/api/surveys/[surveyId]/route.ts`
- Create: `tests/server/surveys.test.ts`

**Interfaces:**
- Consumes: `ensureTeacherRoom`, `resolveRoom`, `SurveyDraft`, `Survey`.
- Produces: `listSurveys(roomName): Promise<Survey[]>`, `saveTeacherSurvey(uid, roomName, draft): Promise<Survey>`, `deleteTeacherSurvey(uid, roomName, surveyId): Promise<void>`.

- [ ] **Step 1: Write survey ownership and validation tests**

Create `tests/server/surveys.test.ts` with:

```ts
import { beforeEach, expect, it } from "vitest";
import type { SurveyDraft } from "@/lib/types";
import { clearFirebaseTestData } from "./firebase-test-env";

beforeEach(clearFirebaseTestData);

const validDraft: SurveyDraft = {
  title: "수요 조사",
  classBudgets: [],
  products: [{
    name: "빵",
    pricePoints: [{ description: "한 개", price: 1000 }],
  }],
};

it("creates a survey with embedded products and sorted price points", async () => {
  const { saveTeacherSurvey } = await import("@/lib/server/surveys");
  const saved = await saveTeacherSurvey("teacher-a", "경제 1반", {
    title: "수요 조사",
    classBudgets: [{ grade: 1, class_number: 2, budget: 10000 }],
    products: [{
      name: "빵",
      pricePoints: [
        { description: "비쌈", price: 2000 },
        { description: "저렴", price: 1000 },
      ],
    }],
  });
  expect(saved.products[0].price_points.map((point) => point.price)).toEqual([2000, 1000]);
  expect(saved.teacher_pin).toBe("경제 1반");
});

it("rejects invalid prices and another teacher's update", async () => {
  const { saveTeacherSurvey } = await import("@/lib/server/surveys");
  await expect(saveTeacherSurvey("teacher-a", "경제 1반", {
    title: "오류",
    classBudgets: [],
    products: [{ name: "빵", pricePoints: [{ description: "", price: 0 }] }],
  })).rejects.toThrow("상황과 가격 구성을 1개 이상 입력해 주세요.");
  const survey = await saveTeacherSurvey("teacher-a", "경제 1반", validDraft);
  await expect(saveTeacherSurvey("teacher-b", "경제 1반", {
    ...validDraft,
    id: survey.id,
  })).rejects.toThrow("방 관리 권한이 없습니다.");
});
```

- [ ] **Step 2: Run tests and verify missing service failure**

Run:

```bash
npm run test:firebase
```

Expected: FAIL because `lib/server/surveys.ts` does not exist.

- [ ] **Step 3: Implement survey validation and serialization**

In `lib/server/surveys.ts`, implement:

```ts
export function cleanSurveyDraft(draft: SurveyDraft): SurveyDraft {
  const products = draft.products.map((product) => ({
    ...product,
    name: product.name.trim(),
    pricePoints: product.pricePoints
      .map((point) => ({
        ...point,
        description: point.description.trim(),
        price: Math.round(Number(point.price)),
      }))
      .filter((point) => point.price > 0),
  })).filter((product) => product.name && product.pricePoints.length);
  if (!products.length) throw new Error("상황과 가격 구성을 1개 이상 입력해 주세요.");
  return {
    ...draft,
    title: draft.title.trim() || "경제 수요설문",
    classBudgets: draft.classBudgets.filter((item) =>
      Number.isInteger(item.grade) &&
      item.grade > 0 &&
      Number.isInteger(item.class_number) &&
      item.class_number > 0 &&
      Number.isFinite(item.budget) &&
      item.budget > 0
    ),
    products,
  };
}
```

Generate missing survey/product/price-point IDs with `randomUUID()`. Persist the survey at `rooms/{roomId}/surveys/{surveyId}` and convert `createdAt`/`updatedAt` to `created_at` ISO strings when returning `Survey`.

When updating an existing survey, query its `responses` subcollection and remove embedded response items whose `product_id` or `price_point_id` no longer exists in the saved survey. Apply those response updates with `adminDb.bulkWriter()` and close the writer before returning.

- [ ] **Step 4: Implement ownership rules in the service**

Use this owner check before teacher writes:

```ts
const room = await resolveRoom(roomName);
if (!room) throw new Error("방을 찾지 못했습니다.");
if (room.ownerUid !== uid) throw new Error("방 관리 권한이 없습니다.");
```

For `deleteTeacherSurvey`, call:

```ts
const surveyRef = adminDb.doc(`rooms/${room.id}/surveys/${surveyId}`);
await adminDb.recursiveDelete(surveyRef);
```

- [ ] **Step 5: Implement survey routes**

`app/api/surveys/route.ts` behavior:

```ts
GET    /api/surveys?room=<name>  -> requireUser, listSurveys
POST   /api/surveys              -> requireTeacher, saveTeacherSurvey
PATCH  /api/surveys              -> requireTeacher, saveTeacherSurvey
```

Use request bodies:

```ts
type SurveyWriteBody = { roomName: string; draft: SurveyDraft };
```

`app/api/surveys/[surveyId]/route.ts` behavior:

```ts
DELETE /api/surveys/:surveyId?room=<name> -> requireTeacher, deleteTeacherSurvey
```

Each route must wrap logic in `try/catch` and return through `jsonOk`/`jsonError`.

- [ ] **Step 6: Verify survey behavior**

Run:

```bash
npm run test:firebase
npm run typecheck
npm run lint
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add lib/server/surveys.ts app/api/surveys tests/server/surveys.test.ts
git commit -m "feat: store surveys in Firestore"
```

---

### Task 6: Implement Stable Balanced Assignment Reservations

**Files:**
- Create: `lib/server/assignments.ts`
- Create: `app/api/assignments/reserve/route.ts`
- Create: `tests/server/assignments.test.ts`

**Interfaces:**
- Consumes: room/survey lookup and authenticated student UID.
- Produces: `reserveAssignmentsForUser(uid, roomName, surveyId, profile): Promise<Record<string, string>>`.

- [ ] **Step 1: Write assignment transaction tests**

Create `tests/server/assignments.test.ts` with these assertions:

```ts
it("returns the same assignments for repeated calls by one student", async () => {
  const first = await reserveAssignmentsForUser("student-a", roomName, survey.id, profileA);
  const second = await reserveAssignmentsForUser("student-a", roomName, survey.id, profileA);
  expect(second).toEqual(first);
});

it("round-robins each product across concurrent students", async () => {
  const assignments = await Promise.all(
    ["a", "b", "c", "d"].map((uid, index) =>
      reserveAssignmentsForUser(uid, roomName, survey.id, {
        grade: 1,
        class_number: 1,
        student_number: index + 1,
        student_name: `학생${index + 1}`,
      }),
    ),
  );
  const selected = assignments.map((value) => value[survey.products[0].id]);
  expect(new Set(selected).size).toBe(2);
  expect(selected.filter((id) => id === selected[0])).toHaveLength(2);
});
```

Create the fixture survey with one product and two price points.

- [ ] **Step 2: Run tests and verify missing service failure**

Run:

```bash
npm run test:firebase
```

Expected: FAIL because `lib/server/assignments.ts` does not exist.

- [ ] **Step 3: Implement one Firestore transaction per reservation**

Use these document paths:

```text
rooms/{roomId}/surveys/{surveyId}/assignmentStates/{grade}-{classNumber}
rooms/{roomId}/surveys/{surveyId}/reservations/{uid}
```

Inside one transaction:

1. Read survey, reservation, and assignment-state documents.
2. Return existing unconsumed reservation assignments for the same UID.
3. For each product in `sort_order`, select `price_points[nextByProduct[product.id] % price_points.length]`.
4. Increment `nextByProduct[product.id]`.
5. Store reservation with a 30-minute `expiresAt`.
6. Return `Record<productId, pricePointId>`.

Use this counter type:

```ts
type AssignmentState = {
  nextByProduct: Record<string, number>;
};
```

Keep the single class counter document deliberately; classroom write volume is below Firestore hotspot limits. Upgrade to sharded counters only after measured contention.

- [ ] **Step 4: Implement reservation route**

Create `app/api/assignments/reserve/route.ts`:

```ts
type ReserveBody = {
  roomName: string;
  surveyId: string;
  profile: StudentProfile;
};
```

Require any Firebase user, call `reserveAssignmentsForUser(token.uid, ...)`, and return:

```ts
{ assignments: Record<string, string> }
```

- [ ] **Step 5: Verify stable and balanced behavior**

Run:

```bash
npm run test:firebase
npm run typecheck
npm run lint
```

Expected: repeated calls are stable and four concurrent students split 2/2 across two price points.

- [ ] **Step 6: Commit**

```bash
git add lib/server/assignments.ts app/api/assignments/reserve/route.ts tests/server/assignments.test.ts
git commit -m "feat: add transactional balanced assignments"
```

---

### Task 7: Implement Response Submission, Redaction, Editing, and Deletion

**Files:**
- Create: `lib/server/responses.ts`
- Create: `app/api/responses/route.ts`
- Create: `app/api/responses/[responseId]/route.ts`
- Create: `tests/server/responses.test.ts`

**Interfaces:**
- Consumes: reservation assignments, survey products/budgets, teacher room ownership.
- Produces: `submitResponseForUser`, `listResponsesForUser`, `updateTeacherResponse`, `deleteTeacherResponse`.

- [ ] **Step 1: Write response security and validation tests**

Create `tests/server/responses.test.ts` with explicit fixtures and these cases:

```ts
it("rejects items not reserved for the student", async () => {
  await expect(submitResponseForUser("student-a", roomName, survey.id, profile, {
    "unassigned-price-point": 3,
  })).rejects.toThrow("배정된 가격 구성이 아닙니다.");
});

it("rejects a class-budget overrun", async () => {
  await expect(submitResponseForUser("student-a", roomName, survey.id, profile, {
    [assignedPricePointId]: 100,
  })).rejects.toThrow("예산을 초과했습니다.");
});

it("redacts other students for student callers", async () => {
  const rows = await listResponsesForUser(
    { uid: "student-a", isTeacher: false },
    roomName,
    survey.id,
    "student-a",
  );
  expect(rows.find((row) => row.id === "student-b")?.student_name).toBe("");
  expect(rows.find((row) => row.id === "student-b")?.student_number).toBe(0);
  expect(rows.find((row) => row.id === "student-a")?.student_name).toBe("학생A");
});

it("permits only the room owner to edit and delete responses", async () => {
  await expect(updateTeacherResponse("teacher-b", roomName, survey.id, "student-a", patch))
    .rejects.toThrow("방 관리 권한이 없습니다.");
  await expect(deleteTeacherResponse("teacher-a", roomName, survey.id, "student-a"))
    .resolves.toBeUndefined();
});
```

- [ ] **Step 2: Run tests and verify missing service failure**

Run:

```bash
npm run test:firebase
```

Expected: FAIL because `lib/server/responses.ts` does not exist.

- [ ] **Step 3: Implement atomic submission**

`submitResponseForUser` must run one transaction that:

1. Reads survey and `reservations/{uid}`.
2. Rejects a missing, expired, or consumed reservation.
3. Allows exactly one item for each assigned product and rejects price-point IDs not present in `reservation.assignments`.
4. Clamps nothing server-side; rejects non-integer quantities outside `0..100`.
5. Calculates the matching class budget using authoritative Firestore prices.
6. Creates `responses/{uid}` so one anonymous UID can submit only once per survey.
7. Sets `consumedAt` on the reservation.

Use:

```ts
export type QuantityMap = Record<string, number>;

export async function submitResponseForUser(
  uid: string,
  roomName: string,
  surveyId: string,
  profile: StudentProfile,
  quantities: QuantityMap,
): Promise<string>
```

Return `uid` as the response ID.

- [ ] **Step 4: Implement teacher and redacted student reads**

Use:

```ts
export async function listResponsesForUser(
  actor: { uid: string; isTeacher: boolean },
  roomName: string,
  surveyId: string,
  revealResponseId?: string | null,
): Promise<StudentResponse[]>
```

For teachers, verify room ownership and return complete response fields. For students, return complete `response_items` for chart aggregation but replace other responses' `student_name` with `""` and `student_number` with `0`; reveal a row only when both its response ID and `submitterUid` equal the caller UID.

- [ ] **Step 5: Implement teacher update and delete**

Use exact signatures:

```ts
export async function updateTeacherResponse(
  teacherUid: string,
  roomName: string,
  surveyId: string,
  responseId: string,
  profile: StudentProfile,
  quantities: QuantityMap,
): Promise<void>

export async function deleteTeacherResponse(
  teacherUid: string,
  roomName: string,
  surveyId: string,
  responseId: string,
): Promise<void>
```

Re-run the authoritative quantity, price-point, and budget checks before an update.

- [ ] **Step 6: Implement response routes**

`app/api/responses/route.ts`:

```text
GET  /api/responses?room=<name>&surveyId=<id>&reveal=<responseId>
POST /api/responses
```

POST body:

```ts
type SubmitBody = {
  roomName: string;
  surveyId: string;
  profile: StudentProfile;
  quantities: QuantityMap;
};
```

`app/api/responses/[responseId]/route.ts`:

```text
PATCH  /api/responses/:responseId
DELETE /api/responses/:responseId?room=<name>&surveyId=<id>
```

PATCH body:

```ts
type UpdateBody = {
  roomName: string;
  surveyId: string;
  profile: StudentProfile;
  quantities: QuantityMap;
};
```

- [ ] **Step 7: Verify response behavior**

Run:

```bash
npm run test:firebase
npm run typecheck
npm run lint
```

Expected: all commands exit 0.

- [ ] **Step 8: Commit**

```bash
git add lib/server/responses.ts app/api/responses tests/server/responses.test.ts
git commit -m "feat: move student responses to Firestore"
```

---

### Task 8: Replace the Supabase Client Branch Without Rewriting the UI

**Files:**
- Modify: `lib/data.ts:1-873`
- Modify: `lib/types.ts`
- Modify: `app/teacher/setup/page.tsx:66-89`
- Modify: `app/student/page.tsx:124-128`
- Modify: `app/student/results/page.tsx`
- Modify: `app/teacher/page.tsx`
- Modify: `app/teacher/responses/page.tsx`
- Modify: `app/teacher/results/page.tsx`
- Modify: `app/teacher/budget-results/page.tsx`
- Modify: `components/StudentResponseForm.tsx`
- Create: `tests/lib/data-api.test.ts`

**Interfaces:**
- Consumes: Route Handler request/response shapes from Tasks 4-7.
- Produces: the existing exports `fetchSurveys`, `ensureRoomHasDefaultSurveys`, `saveSurvey`, `deleteSurvey`, `updateStudentResponse`, `deleteStudentResponse`, `fetchResponses`, `reserveAssignments`, `submitResponse`, `hasRemoteDatabase`.

- [ ] **Step 1: Write API adapter tests**

Create `tests/lib/data-api.test.ts` and mock `apiFetch`:

```ts
vi.mock("@/lib/api-client", () => ({ apiFetch: vi.fn() }));

it("passes room name when deleting a survey", async () => {
  const { apiFetch } = await import("@/lib/api-client");
  const { deleteSurvey } = await import("@/lib/data");
  await deleteSurvey("survey-1", "경제 1반");
  expect(apiFetch).toHaveBeenCalledWith(
    "/api/surveys/survey-1?room=%EA%B2%BD%EC%A0%9C%201%EB%B0%98",
    { method: "DELETE" },
  );
});

it("unwraps assignment and response API results", async () => {
  vi.mocked(apiFetch)
    .mockResolvedValueOnce({ assignments: { product: "price" } })
    .mockResolvedValueOnce({ responseId: "student-1" });
  await expect(reserveAssignments(survey, profile, "경제 1반"))
    .resolves.toEqual({ product: "price" });
  await expect(submitResponse(survey, profile, quantities, "경제 1반"))
    .resolves.toBe("student-1");
});
```

- [ ] **Step 2: Run tests and verify old signatures fail**

Run:

```bash
npm test -- tests/lib/data-api.test.ts
```

Expected: FAIL because the old functions call Supabase and lack required room-name arguments.

- [ ] **Step 3: Preserve localStorage functions and replace only remote branches**

Remove the `supabase` import and set:

```ts
export const hasRemoteDatabase = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
);
```

For every remote branch, call `apiFetch`. Preserve existing localStorage branches unchanged.

The remote `ensureRoomHasDefaultSurveys(roomName)` implementation must:

```ts
await apiFetch("/api/rooms/ensure", {
  method: "POST",
  body: JSON.stringify({ name: roomName }),
});
const surveys = await fetchSurveys(roomName);
return surveys.length ? surveys : [await saveSurvey(createDefaultDraft(), roomName)];
```

Use these final signatures:

```ts
fetchSurveys(roomName?: string, slim?: boolean): Promise<Survey[]>
ensureRoomHasDefaultSurveys(roomName?: string): Promise<Survey[]>
saveSurvey(draft: SurveyDraft, roomName?: string): Promise<Survey>
deleteSurvey(surveyId: string, roomName?: string): Promise<void>
updateStudentResponse(surveyId, responseId, profile, quantities, roomName?): Promise<void>
deleteStudentResponse(surveyId, responseId, roomName?): Promise<void>
fetchResponses(surveyId, slim?, roomName?, revealResponseId?): Promise<StudentResponse[]>
reserveAssignments(survey, profile, roomName?): Promise<AssignmentMap>
submitResponse(survey, profile, quantities, roomName?): Promise<string>
```

Remove `consumeAssignmentReservations`; submission consumes the reservation atomically on the server.

- [ ] **Step 4: Update the three changed call sites**

In `app/teacher/setup/page.tsx`:

```ts
await deleteSurvey(selectedSurvey.id, roomName);
```

In `components/StudentResponseForm.tsx`:

```ts
await reserveAssignments(survey, cleanProfile, roomName);
await submitResponse(survey, cleanProfile, quantities, roomName);
```

- [ ] **Step 5: Replace Supabase notices**

Replace visible text:

```text
Supabase 환경변수가 없어서
```

with:

```text
Firebase 환경변수가 없어서
```

in every teacher/student page.

- [ ] **Step 6: Verify the adapter and all callers**

Run:

```bash
npm test -- tests/lib/data-api.test.ts
npm run typecheck
npm run lint
```

Expected: all commands exit 0 and `rg -n "supabase|Supabase" lib app components` returns only the still-existing `lib/supabase.ts` file scheduled for cutover deletion.

- [ ] **Step 7: Commit**

```bash
git add lib/data.ts lib/types.ts app components tests/lib/data-api.test.ts
git commit -m "refactor: route app data through Vercel APIs"
```

---

### Task 9: Replace Supabase Realtime With Bounded Polling

**Files:**
- Modify: `app/teacher/results/page.tsx:99-130`
- Modify: `app/teacher/budget-results/page.tsx:572-603`
- Create: `lib/polling.ts`
- Create: `tests/lib/polling.test.ts`

**Interfaces:**
- Consumes: existing `loadResponses(surveyId)` callbacks.
- Produces: `startPolling(callback: () => void | Promise<void>, intervalMs?: number): () => void`.

- [ ] **Step 1: Write fake-timer polling tests**

Create `tests/lib/polling.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { startPolling } from "@/lib/polling";

afterEach(() => vi.useRealTimers());

describe("startPolling", () => {
  it("runs every 2500 ms and stops cleanly", async () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const stop = startPolling(callback);
    await vi.advanceTimersByTimeAsync(5000);
    expect(callback).toHaveBeenCalledTimes(2);
    stop();
    await vi.advanceTimersByTimeAsync(2500);
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run the test and verify missing helper failure**

Run:

```bash
npm test -- tests/lib/polling.test.ts
```

Expected: FAIL because `lib/polling.ts` does not exist.

- [ ] **Step 3: Implement the minimal polling helper**

Create `lib/polling.ts`:

```ts
export function startPolling(
  callback: () => void | Promise<void>,
  intervalMs = 2500,
) {
  const timer = window.setInterval(() => void callback(), intervalMs);
  return () => window.clearInterval(timer);
}
```

- [ ] **Step 4: Replace both Supabase channels**

In both results pages, delete the `supabase` import and channel subscription. Use:

```ts
useEffect(() => {
  if (!selectedSurvey?.id) return;
  return startPolling(() => loadResponses(selectedSurvey.id));
}, [loadResponses, selectedSurvey?.id]);
```

- [ ] **Step 5: Verify polling and absence of runtime Supabase usage**

Run:

```bash
npm test -- tests/lib/polling.test.ts
npm run typecheck
npm run lint
rg -n "channel\\(|postgres_changes|removeChannel" app lib components
```

Expected: tests/typecheck/lint exit 0; `rg` returns no matches.

- [ ] **Step 6: Commit**

```bash
git add lib/polling.ts tests/lib/polling.test.ts app/teacher/results/page.tsx app/teacher/budget-results/page.tsx
git commit -m "refactor: poll Firestore results through Vercel API"
```

---

### Task 10: Update Vercel Security Headers, Privacy Copy, and Operator Documentation

**Files:**
- Modify: `vercel.json`
- Modify: `app/privacy/page.tsx:15-76`
- Modify: `README.md`
- Create: `tests/lib/deployment-config.test.ts`

**Interfaces:**
- Consumes: actual Firebase Auth endpoints and Vercel architecture.
- Produces: deployable Vercel headers and accurate operator/privacy documentation.

- [ ] **Step 1: Write deployment configuration tests**

Create `tests/lib/deployment-config.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("deployment configuration", () => {
  it("contains Firebase Auth origins and no Supabase origins", () => {
    const vercel = readFileSync("vercel.json", "utf8");
    expect(vercel).not.toContain("supabase.co");
    expect(vercel).toContain("https://*.googleapis.com");
    expect(vercel).toContain("https://*.firebaseapp.com");
  });

  it("documents Firebase and Vercel instead of Supabase and GitHub Pages", () => {
    const privacy = readFileSync("app/privacy/page.tsx", "utf8");
    expect(privacy).toContain("Firebase");
    expect(privacy).toContain("Vercel");
    expect(privacy).not.toContain("Supabase");
    expect(privacy).not.toContain("GitHub Pages");
  });
});
```

- [ ] **Step 2: Run tests and verify old copy/CSP fails**

Run:

```bash
npm test -- tests/lib/deployment-config.test.ts
```

Expected: FAIL because current CSP and privacy copy mention Supabase and GitHub Pages.

- [ ] **Step 3: Replace CSP connect sources**

In `vercel.json`, use this `connect-src`:

```text
connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com https://securetoken.googleapis.com
```

Keep the existing `default-src`, `script-src`, `style-src`, `font-src`, `img-src`, `object-src`, `base-uri`, `form-action`, and `frame-ancestors` directives unchanged.

- [ ] **Step 4: Replace processing and security disclosures**

Update `app/privacy/page.tsx` so it states:

- Vercel hosts the site and executes server API requests.
- Google Firebase Authentication verifies teachers and anonymous student sessions.
- Cloud Firestore in Firebase Project ID `inflation-2e38b` stores survey and response data.
- Direct client Firestore access is denied and Vercel server APIs enforce room ownership.
- The operator must verify the actual Firebase/Firestore region, Vercel processing location, subprocessors, and overseas-transfer details before school submission.
- The effective date is `2026년 7월 28일`.

- [ ] **Step 5: Rewrite setup and operations documentation**

README sections must include these exact commands:

```bash
npm install
cp .env.example .env.local
npx firebase-tools emulators:start --only firestore
npm run dev
npm test
npm run test:firebase
npm run audit:regression
npm run typecheck
npm run lint
npm run build
```

Document Firebase Console setup:

1. Select display name `inflation`, Project ID `inflation-2e38b`.
2. Enable Firestore.
3. Enable Authentication providers `Anonymous` and `Google`.
4. Add the Vercel production/preview domains under Authentication authorized domains.
5. Create a least-privilege service account for Vercel Admin SDK access.
6. Add all `.env.example` keys to Vercel Production and Preview.

- [ ] **Step 6: Verify docs, configuration, and build**

Run:

```bash
npm test -- tests/lib/deployment-config.test.ts
npm test
npm run audit:regression
npm run typecheck
npm run lint
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add vercel.json app/privacy/page.tsx README.md tests/lib/deployment-config.test.ts
git commit -m "docs: prepare Firebase app for Vercel"
```

---

### Task 11: Preview Deploy and End-to-End Cutover Verification

**Files:**
- Modify only if verification exposes a defect: the smallest file responsible for that defect.
- Evidence: `.dorms-check/evidence/REPORT.md`
- Evidence: `.dorms-check/evidence/report.json`

**Interfaces:**
- Consumes: completed Tasks 1-10 and Vercel/Firebase credentials.
- Produces: a verified Vercel Preview deployment and a cutover decision.

- [ ] **Step 1: Configure Firebase production services**

In Firebase Console for display name `inflation`, Project ID `inflation-2e38b`:

1. Create Firestore in `asia-northeast3` (Seoul), as listed in the [official Firestore locations documentation](https://firebase.google.com/docs/firestore/locations).
2. Enable Anonymous Authentication.
3. Enable Google Authentication.
4. Add the Vercel Preview domain and intended Production domain as authorized domains.

Expected: both providers show Enabled and both domains appear in Authorized domains.

- [ ] **Step 2: Deploy Firestore rules**

Run:

```bash
npx firebase-tools use inflation-2e38b
npx firebase-tools deploy --only firestore:rules
```

Expected: output identifies Project ID `inflation-2e38b` and reports a successful rules release.

- [ ] **Step 3: Configure Vercel secrets and deploy Preview**

Add each `.env.example` key in Vercel Project Settings. Store `FIREBASE_PRIVATE_KEY` as the complete PEM value with newline characters. Link the repository and capture the generated Preview URL:

```bash
npm run audit:regression
npx vercel pull --yes
npx vercel deploy --yes | tail -n 1 > .vercel/firebase-migration-preview-url
tr -d '\n' < .vercel/firebase-migration-preview-url
```

Expected: Vercel build succeeds and `/api/surveys` returns `401` without a Firebase bearer token.

- [ ] **Step 4: Run the teacher flow**

On Preview:

1. Open `/teacher`.
2. Sign in with Google.
3. Create room `전환검증-2026-07-28`.
4. Confirm the default survey appears.
5. Create a second survey with two products, two prices each, and a class budget.
6. Edit its title and confirm reload persistence.

Expected: only the signed-in teacher can reopen and edit that room.

- [ ] **Step 5: Run the student and concurrency flow**

Using four separate private browser sessions:

1. Open `/student`.
2. Enter `전환검증-2026-07-28`.
3. Enter distinct student profiles in grade 1, class 1.
4. Reserve assignments and submit responses.

Expected: each product's two price points receive a 2/2 assignment split; quantities persist; no student sees another student's name or number.

- [ ] **Step 6: Verify teacher results and management**

1. Confirm `/teacher/results` and `/teacher/budget-results` update within 5 seconds.
2. Confirm all four responses appear in `/teacher/responses`.
3. Edit one response and verify charts update.
4. Delete one response and verify charts update.
5. Delete the second survey and verify its response/reservation subcollections no longer exist in Firestore.

Expected: polling, authorization, recursive deletion, and charts all work.

- [ ] **Step 7: Run production-grade checks**

Run:

```bash
npm test
npm run test:firebase
npm run audit:regression
rg -n "from ['\"]next/image|<Image" app components lib
rg -n "firebase-admin/storage|getStorage" app components lib
npm run typecheck
npm run lint
npm run build
preview_url="$(tr -d '\n' < .vercel/firebase-migration-preview-url)"
npx -y dorms-check@latest scan --url "$preview_url"
npx -y dorms-check@latest status
```

Expected: tests and audit regression exit 0; both exposure-path `rg` commands print no matches; dorms-check reports no newly introduced Firebase public-read or unauthenticated-endpoint finding. Do not judge or remediate dorms-check findings without following the `dorms-security-check` consent workflow.

- [ ] **Step 8: Promote the verified build to Vercel Production**

Promote the exact verified Preview deployment:

```bash
preview_url="$(tr -d '\n' < .vercel/firebase-migration-preview-url)"
npx vercel promote "$preview_url" --yes
```

Expected: Production serves the same commit SHA and repeats the teacher/student smoke flow successfully.

- [ ] **Step 9: Record the cutover commit**

```bash
git status --short
git log -1 --oneline
```

Expected: worktree is clean and the displayed commit is the one deployed to Production. No new commit is needed for this verification-only task.

---

### Task 12: Remove Supabase Code, Stop GitHub Pages, and Delete Old Data

**Files:**
- Delete: `lib/supabase.ts`
- Delete: `supabase/schema.sql`
- Delete: `supabase/migrations/20260512000000_class_scoped_balanced_assignments.sql`
- Delete: `supabase/migrations/20260514000000_transactional_student_response.sql`
- Delete: `supabase/migrations/20260718063239_lock_private_response_reads.sql`
- Delete: `.github/workflows/deploy-pages.yml`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Modify: repository/Vercel environment settings

**Interfaces:**
- Consumes: successful Task 11 Production verification.
- Produces: no Supabase runtime/build/deployment dependency and an explicitly approved deletion action against the exact old Supabase project.

- [ ] **Step 1: Confirm the destructive-action gate**

The current scan evidence identifies Supabase project reference `lzmtfcshypdhfdvwdbzb`. Re-resolve it from the current deployment configuration, confirm it still matches, and ask:

```text
Vercel Production 전환이 검증되었습니다. Supabase 프로젝트 lzmtfcshypdhfdvwdbzb의 기존 데이터를 영구 삭제해도 될까요?
```

Expected: a new, explicit user approval naming or clearly accepting that exact project. Stop this task without deleting data if approval is absent.

- [ ] **Step 2: Remove Supabase runtime dependency**

Run:

```bash
npm uninstall @supabase/supabase-js
```

Expected: `package.json` and `package-lock.json` contain no `@supabase/*` package.

- [ ] **Step 3: Delete retired source and deployment files**

Delete only the files listed in this task's **Files** section. Do not delete `.dorms-check` evidence or unrelated GitHub workflows.

- [ ] **Step 4: Remove repository and hosting variables**

Remove:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

from GitHub repository variables and every Vercel environment. Keep all Firebase variables.

- [ ] **Step 5: Prove the repository has no Supabase dependency**

Run:

```bash
rg -n -i "supabase|github pages|deploy-pages" \
  package.json package-lock.json app components lib public README.md \
  next.config.ts vercel.json .env.example .github || true
npm test
npm run test:firebase
npm run audit:regression
npm run typecheck
npm run lint
npm run build
```

Expected: `rg` prints no runtime, policy, documentation, dependency, or deployment references; all checks exit 0.

- [ ] **Step 6: Commit and deploy the cleanup**

```bash
git add -A
git commit -m "chore: remove retired Supabase backend"
```

Deploy this exact commit to Vercel Production and repeat one teacher creation plus one student submission.

Expected: production works while Supabase variables and SDK are absent.

- [ ] **Step 7: Delete the approved Supabase data**

Resolve the exact project reference again immediately before deletion. Use the Supabase dashboard's project deletion flow if the whole project is dedicated to this app; otherwise delete only this app's tables:

```text
assignment_reservations
response_items
responses
price_points
products
survey_class_budgets
surveys
```

Expected: the dashboard confirms deletion for the exact approved project. Report whether recovery is available under the Supabase plan; do not claim recoverability without dashboard evidence.

- [ ] **Step 8: Run final production verification**

Run:

```bash
production_deployment_url="$(tr -d '\n' < .vercel/firebase-migration-preview-url)"
npm run audit:regression
npx -y dorms-check@latest scan --url "$production_deployment_url"
npx -y dorms-check@latest status
```

Then verify teacher login, room creation, student submission, polling results, edit, and deletion once more.

Expected: Production uses Firebase Project ID `inflation-2e38b`, remaining Supabase network requests are zero, and local security preparation evidence is updated. State that dorms-check preparation is not final dorms.school certification.

---

## Self-Review Record

- **Spec coverage:** dependency-risk acceptance and regression blocking are covered in Tasks 1, 10, 11, and 12; Firebase display name `inflation` and Project ID `inflation-2e38b` are covered in Tasks 2 and 11; Vercel hosting/API migration in Tasks 3-11; empty-database start in the global constraints and Task 11; permanent Supabase removal in Task 12 behind an explicit approval gate.
- **Security coverage:** teacher ownership, anonymous student identity, API token verification, direct Firestore denial, response redaction, authoritative validation, CSP, privacy copy, and post-deploy scan each have an implementation and verification task.
- **Behavior coverage:** default survey creation, survey CRUD, class budgets, balanced assignment, submission, teacher response CRUD, student result reveal, teacher polling, and localStorage fallback are retained.
- **Type consistency:** room name remains the external lookup value; server services resolve it to `roomId`; assignment and response functions use `StudentProfile`, `QuantityMap`, and `Record<string, string>` consistently.
- **Intentional simplification:** Vercel polling replaces Realtime, and one per-class counter document replaces SQL advisory locks. This fits classroom scale and avoids Cloud Functions; revisit only if measured API load or Firestore contention requires it.
