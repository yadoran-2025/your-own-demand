# Student Identifiable Data Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permit names or classroom aliases for students aged 14 or older, expose respondent names only to authenticated respondents in the same class, keep deletion teacher-only, and automatically destroy response data every February 1 in Korea.

**Architecture:** Keep the existing Firebase anonymous-auth and server-API boundary. Add an age-attestation value to reservation and submission requests without storing birth dates; authorize same-class name visibility from the viewer's server-side response document, never URL parameters; delete response and matching reservation together; and run an idempotent Vercel Cron cleanup against Firestore documents older than the latest February 1 KST cutoff. Browser-held name copies expire lazily on the student's next visit using the same cutoff.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Firebase Authentication, Cloud Firestore Admin SDK, Vercel Cron, Vitest, Firebase Emulator.

## Global Constraints

- Service access is denied to anyone under age 14; no birth date is collected.
- Age eligibility is confirmed with a required checkbox and enforced again by both server write paths.
- Student identity field accepts either a real name or a teacher-approved classroom alias.
- Collection purpose for the name/alias is participation confirmation.
- Respondent names are visible to teacher and to authenticated students whose own submitted response has the same `grade` and `classNumber`.
- Same-class membership is derived only from the authenticated student's Firestore response; query-string grade/class values never grant identity access.
- Foreign response document IDs, Firebase UIDs, and student numbers remain hidden from students.
- Students can read their own response; only the owning teacher can update or delete server responses.
- Deleting one response also deletes its matching reservation because both contain the student's name/alias.
- Every February 1 at 00:00 KST, response and reservation documents created before that cutoff are destroyed; reruns are idempotent.
- Vercel Hobby may invoke the annual job within the scheduled hour, so the accepted window is February 1, 00:00–00:59 KST.
- Browser copies cannot be deleted remotely; expired name/profile/submission copies are removed on the student's next visit after the cutoff.
- Data processing is edzip case D because identifiable student data reaches Firebase and Vercel.
- Privacy copy must not claim that age restriction alone removes every legal basis requirement; school/teacher still confirms the applicable basis for processing students aged 14 or older.
- Do not add dependencies.
- Preserve unrelated dirty-worktree changes and stage only files listed in each task.

---

## File Structure

**Create**

- `lib/server/student-policy.ts` — shared server-side eligibility validation for every student write path.
- `lib/retention.ts` — pure Korea-time annual cutoff calculation shared by server and browser code.
- `lib/server/retention.ts` — Firestore cleanup for expired response and reservation documents.
- `app/api/cron/purge-student-data/route.ts` — `CRON_SECRET`-protected annual cleanup endpoint.
- `tests/lib/retention.test.ts` — cutoff boundary and browser-expiry unit tests.
- `tests/server/retention.test.ts` — Firebase Emulator tests for idempotent, cutoff-safe deletion.
- `tests/app/cron-retention-route.test.ts` — cron authentication and invocation contract.

**Modify**

- `components/StudentResponseForm.tsx` — age gate, name/alias disclosure, and request wiring.
- `lib/data.ts` — carry `ageConfirmed` to reservation and submission APIs.
- `app/api/assignments/reserve/route.ts` — accept and forward age confirmation.
- `app/api/responses/route.ts` — accept and forward age confirmation.
- `lib/server/assignments.ts` — reject reservations without age confirmation.
- `lib/server/responses.ts` — reject submissions without age confirmation, authorize same-class name visibility, and cascade teacher deletion to reservation.
- `lib/studentResultProfile.ts` — timestamp local identity copies and expire them after the annual cutoff.
- `app/student/page.tsx` — run browser privacy cleanup before redirecting from a stored submission.
- `app/student/results/page.tsx` — run browser privacy cleanup before loading stored profile/submission data.
- `vercel.json` — register the annual UTC cron schedule.
- `.env.example` — document `CRON_SECRET`.
- `app/privacy/page.tsx` — disclose age restriction, D-type processing, same-class name visibility, annual deletion, and rights workflow.
- `app/terms/page.tsx` — state age eligibility and classroom identity visibility.
- `dorms-check.config.json` — change `edzipCase` from `C` to `D`.
- `tests/lib/data-api.test.ts` — verify age confirmation reaches both APIs.
- `tests/lib/deployment-config.test.ts` — verify exact cron path/schedule and updated legal copy.
- `tests/server/assignments.test.ts` — enforce age gate for assignment reservations.
- `tests/server/responses.test.ts` — enforce age gate, same-class visibility, cross-class redaction, own-read behavior, and cascade deletion.

---

### Task 1: Enforce the 14-or-older participation gate

**Files:**

- Modify: `components/StudentResponseForm.tsx`
- Modify: `lib/data.ts`
- Modify: `app/api/assignments/reserve/route.ts`
- Modify: `app/api/responses/route.ts`
- Create: `lib/server/student-policy.ts`
- Modify: `lib/server/assignments.ts`
- Modify: `lib/server/responses.ts`
- Test: `tests/lib/data-api.test.ts`
- Test: `tests/server/assignments.test.ts`
- Test: `tests/server/responses.test.ts`

**Interfaces:**

- Produces: `reserveAssignments(..., ageConfirmed: boolean): Promise<AssignmentMap>`
- Produces: `submitResponse(..., ageConfirmed: boolean): Promise<string>`
- Produces: `reserveAssignmentsForUser(..., profile: StudentProfile, ageConfirmed: boolean): Promise<Record<string, string>>`
- Produces: `submitResponseForUser(..., quantities: QuantityMap, ageConfirmed: boolean): Promise<string>`
- Produces: `requireEligibleAge(ageConfirmed: unknown): asserts ageConfirmed is true`
- Produces: API body property `ageConfirmed: boolean`

- [ ] **Step 1: Write failing API-adapter tests**

Update the test profile calls in `tests/lib/data-api.test.ts`:

```ts
await expect(
  reserveAssignments(survey, profile, "경제 1반", true),
).resolves.toEqual({ "product-1": "price-1" });

await expect(
  submitResponse(
    survey,
    profile,
    { "price-1": 2 },
    "경제 1반",
    true,
  ),
).resolves.toBe("student-1");

expect(apiFetch).toHaveBeenNthCalledWith(1, "/api/assignments/reserve", {
  method: "POST",
  body: JSON.stringify({
    roomName: "경제 1반",
    surveyId: "survey-1",
    profile: { ...profile, student_number: 1 },
    ageConfirmed: true,
  }),
});

expect(apiFetch).toHaveBeenNthCalledWith(2, "/api/responses", {
  method: "POST",
  body: JSON.stringify({
    roomName: "경제 1반",
    surveyId: "survey-1",
    profile,
    quantities: { "price-1": 2 },
    ageConfirmed: true,
  }),
});
```

- [ ] **Step 2: Write failing server age-gate tests**

Add to `tests/server/assignments.test.ts`:

```ts
it("rejects assignment reservation when age eligibility is not confirmed", async () => {
  const { reserveAssignmentsForUser } = await import("@/lib/server/assignments");
  const survey = await createSurvey();

  await expect(
    reserveAssignmentsForUser(
      "student-a",
      roomName,
      survey.id,
      profileA,
      false,
    ),
  ).rejects.toThrow("만 14세 미만은 이 서비스를 이용할 수 없습니다.");
});
```

Add to `tests/server/responses.test.ts`:

```ts
it("rejects response submission when age eligibility is not confirmed", async () => {
  const { submitResponseForUser } = await import("@/lib/server/responses");
  const { survey, assignmentsA } = await fixture();

  await expect(
    submitResponseForUser(
      "student-a",
      roomName,
      survey.id,
      profileA,
      { [Object.values(assignmentsA)[0]]: 1 },
      false,
    ),
  ).rejects.toThrow("만 14세 미만은 이 서비스를 이용할 수 없습니다.");
});
```

Update all existing emulator-test calls to pass `true` after the existing final argument.

- [ ] **Step 3: Run focused tests and confirm failure**

Run:

```bash
npx vitest run tests/lib/data-api.test.ts
npx firebase-tools emulators:exec --only firestore "npx vitest run --no-file-parallelism tests/server/assignments.test.ts tests/server/responses.test.ts"
```

Expected: Type/signature or assertion failures because `ageConfirmed` is not yet transported or enforced.

- [ ] **Step 4: Carry the age confirmation through client and API boundaries**

Change the two public function parameter lists in `lib/data.ts`:

```diff
 export async function reserveAssignments(
   survey: Survey,
   profile: StudentProfile,
-  roomName?: string,
+  roomName: string | undefined,
+  ageConfirmed: boolean,
 ): Promise<AssignmentMap> {
```

```diff
 export async function submitResponse(
   survey: Survey,
   profile: StudentProfile,
   quantities: QuantityMap,
-  roomName?: string,
+  roomName: string | undefined,
+  ageConfirmed: boolean,
 ): Promise<string> {
```

Include `ageConfirmed` in both remote JSON bodies. Before local-demo reservation or submission, apply the same rejection:

```ts
if (ageConfirmed !== true) {
  throw new Error("만 14세 미만은 이 서비스를 이용할 수 없습니다.");
}
```

Change request types:

```ts
type ReserveBody = {
  roomName: string;
  surveyId: string;
  profile: StudentProfile;
  ageConfirmed: boolean;
};
```

```ts
type SubmitBody = {
  roomName: string;
  surveyId: string;
  profile: StudentProfile;
  quantities: QuantityMap;
  ageConfirmed: boolean;
};
```

Forward `body?.ageConfirmed` to the corresponding server function.

- [ ] **Step 5: Enforce the gate in both server write paths**

Create `lib/server/student-policy.ts`:

```ts
export function requireEligibleAge(ageConfirmed: unknown): asserts ageConfirmed is true {
  if (ageConfirmed !== true) {
    throw new Error("만 14세 미만은 이 서비스를 이용할 수 없습니다.");
  }
}
```

Import the shared helper into `lib/server/assignments.ts` and `lib/server/responses.ts`. Extend each function signature with `ageConfirmed: boolean`, call `requireEligibleAge(ageConfirmed)` immediately after UID/path validation, and do not write the flag or a birth date to Firestore.

- [ ] **Step 6: Add the required UI confirmation and identity notice**

In `components/StudentResponseForm.tsx`, add:

```ts
const [ageConfirmed, setAgeConfirmed] = useState(false);
```

Require it in `hasValidProfile` and `validate()`:

```ts
if (!ageConfirmed) {
  return "만 14세 이상만 이용할 수 있습니다.";
}
```

Render before the assignment button:

```tsx
<label className="student-consent-row">
  <input
    checked={ageConfirmed}
    onChange={(event) => setAgeConfirmed(event.target.checked)}
    type="checkbox"
  />
  <span>본인은 만 14세 이상이며, 입력한 이름 또는 별명이 같은 반 학생에게 공개됨을 확인했습니다.</span>
</label>
```

Change the name field:

```tsx
<span className="field-label">이름 또는 수업용 별명</span>
<input
  className="input name-input"
  placeholder="예: 김민지 또는 학생01"
  value={profile.student_name}
  onChange={(event) =>
    updateProfile({
      ...profile,
      student_name: event.target.value,
    })
  }
/>
<small className="field-help">
  수업 참여 확인에 사용되며 같은 반 응답자에게 공개됩니다.
</small>
```

Pass `ageConfirmed` to both `reserveAssignments` and `submitResponse`. Reset it when the survey changes.

- [ ] **Step 7: Run focused tests and verify pass**

Run:

```bash
npx vitest run tests/lib/data-api.test.ts
npx firebase-tools emulators:exec --only firestore "npx vitest run --no-file-parallelism tests/server/assignments.test.ts tests/server/responses.test.ts"
```

Expected: all selected tests pass.

- [ ] **Step 8: Commit only Task 1 files**

```bash
git add components/StudentResponseForm.tsx lib/data.ts app/api/assignments/reserve/route.ts app/api/responses/route.ts lib/server/student-policy.ts lib/server/assignments.ts lib/server/responses.ts tests/lib/data-api.test.ts tests/server/assignments.test.ts tests/server/responses.test.ts
git commit -m "feat: enforce student age eligibility"
```

---

### Task 2: Reveal names only to authenticated respondents in the same class

**Files:**

- Modify: `lib/server/responses.ts`
- Test: `tests/server/responses.test.ts`
- Test: `tests/app/student-results-auth-gate.test.ts`

**Interfaces:**

- Consumes: authenticated actor `{ uid: string; isTeacher: boolean }`
- Produces: same existing `listResponsesForUser(...): Promise<StudentResponse[]>`
- Security invariant: only the actor's response document determines the viewer's class

- [ ] **Step 1: Replace old identity-redaction expectations with same-class and cross-class tests**

Create a fourth profile in `tests/server/responses.test.ts`:

```ts
const profileD: StudentProfile = {
  grade: 1,
  class_number: 2,
  student_number: 4,
  student_name: "다른반학생",
};
```

Add a class-2 budget to the relevant fixture, submit responses for `student-a`, `student-b`, and `student-d`, then assert:

```ts
const studentRows = await listResponsesForUser(
  { uid: "student-a", isTeacher: false },
  roomName,
  survey.id,
  "student-a",
);

const own = studentRows.find((row) => row.id === "student-a");
expect(own).toMatchObject({ student_name: "학생A", student_number: 1 });

const sameClass = studentRows.find((row) => row.student_name === "학생B");
expect(sameClass?.student_number).toBe(0);
expect(sameClass?.id).toMatch(/^redacted-/);

const otherClass = studentRows.find((row) => row.class_number === 2);
expect(otherClass).toMatchObject({
  student_name: "",
  student_number: 0,
});
expect(JSON.stringify(studentRows)).not.toContain("student-b");
expect(JSON.stringify(studentRows)).not.toContain("student-d");
```

Add a non-respondent test:

```ts
it("does not reveal class identities to an authenticated student without a response", async () => {
  const rows = await listResponsesForUser(
    { uid: "student-without-response", isTeacher: false },
    roomName,
    survey.id,
  );

  expect(rows.every((row) => row.student_name === "")).toBe(true);
});
```

- [ ] **Step 2: Run emulator tests and confirm failure**

Run:

```bash
npx firebase-tools emulators:exec --only firestore "npx vitest run --no-file-parallelism tests/server/responses.test.ts"
```

Expected: same-class foreign name remains blank.

- [ ] **Step 3: Derive class membership from the authenticated response**

In `listResponsesForUser`, load the viewer response from:

```ts
const viewerSnapshot = actor.isTeacher
  ? null
  : await surveyRef.collection("responses").doc(actor.uid).get();

const viewerClass = viewerSnapshot?.exists
  ? {
      grade: viewerSnapshot.get("grade"),
      classNumber: viewerSnapshot.get("classNumber"),
    }
  : null;
```

For non-teachers:

```ts
const isOwnResponse =
  snapshot.id === actor.uid &&
  snapshot.get("submitterUid") === actor.uid;

const isSameClass =
  viewerClass !== null &&
  response.grade === viewerClass.grade &&
  response.class_number === viewerClass.classNumber;
```

Return the full response for `isOwnResponse`. For every foreign response, keep opaque ID and rewritten `response_id`; preserve `student_name` only when `isSameClass`; always set `student_number: 0`:

```ts
return {
  ...response,
  id,
  student_name: isSameClass ? response.student_name : "",
  student_number: 0,
  response_items: response.response_items.map((item) => ({
    ...item,
    response_id: id,
  })),
};
```

Teacher behavior remains unchanged. Keep `revealResponseId` validation for backward compatibility, but never use it to authorize foreign identity access.

- [ ] **Step 4: Verify the student result page still uses authenticated data only**

Extend `tests/app/student-results-auth-gate.test.ts`:

```ts
it("does not use query-string grade or class as an identity authorization claim", () => {
  expect(source).not.toContain("viewerGrade");
  expect(source).not.toContain("viewerClassNumber");
  expect(source).toContain("fetchResponses(");
});
```

The UI may use grade/class query parameters for chart filtering; authorization stays entirely in `lib/server/responses.ts`.

- [ ] **Step 5: Run focused tests and verify pass**

Run:

```bash
npx vitest run tests/app/student-results-auth-gate.test.ts
npx firebase-tools emulators:exec --only firestore "npx vitest run --no-file-parallelism tests/server/responses.test.ts"
```

Expected: all selected tests pass.

- [ ] **Step 6: Commit only Task 2 files**

```bash
git add lib/server/responses.ts tests/server/responses.test.ts tests/app/student-results-auth-gate.test.ts
git commit -m "feat: reveal names within verified class"
```

---

### Task 3: Make teacher deletion remove every server-side copy of the identity

**Files:**

- Modify: `lib/server/responses.ts`
- Test: `tests/server/responses.test.ts`
- Test: `tests/server/auth.test.ts`

**Interfaces:**

- Consumes: existing teacher-authenticated `DELETE /api/responses/[responseId]`
- Produces: atomic deletion of `responses/{responseId}` and `reservations/{responseId}`

- [ ] **Step 1: Write a failing cascade-deletion test**

Replace the final success assertion in `tests/server/responses.test.ts` with:

```ts
const { resolveRoom } = await import("@/lib/server/rooms");
const root = `rooms/${(await resolveRoom(roomName))!.id}/surveys/${survey.id}`;

await expect(
  deleteTeacherResponse("teacher-a", roomName, survey.id, "student-a"),
).resolves.toBeUndefined();

expect((await adminDb.doc(`${root}/responses/student-a`).get()).exists).toBe(false);
expect((await adminDb.doc(`${root}/reservations/student-a`).get()).exists).toBe(false);
```

Keep the existing non-owner rejection assertion.

- [ ] **Step 2: Confirm students cannot call the deletion route**

In `tests/server/auth.test.ts`, preserve the existing `requireTeacher` anonymous-token rejection and add a source-contract assertion if the route is not directly invoked in tests:

```ts
const route = readFileSync("app/api/responses/[responseId]/route.ts", "utf8");
expect(route).toContain("requireTeacher");
expect(route).not.toContain("requireUser(request)");
```

- [ ] **Step 3: Run tests and confirm cascade failure**

Run:

```bash
npx vitest run tests/server/auth.test.ts
npx firebase-tools emulators:exec --only firestore "npx vitest run --no-file-parallelism tests/server/responses.test.ts"
```

Expected: the reservation still exists after response deletion.

- [ ] **Step 4: Delete response and reservation in one transaction**

In `deleteTeacherResponse`:

```ts
const responseRef = surveyRef.collection("responses").doc(responseId);
const reservationRef = surveyRef.collection("reservations").doc(responseId);

await adminDb.runTransaction(async (transaction) => {
  const [surveySnapshot, responseSnapshot] = await Promise.all([
    transaction.get(surveyRef),
    transaction.get(responseRef),
  ]);
  if (!surveySnapshot.exists || !responseSnapshot.exists) {
    throw new Error("응답을 찾지 못했습니다.");
  }
  transaction.delete(responseRef);
  transaction.delete(reservationRef);
});
```

Do not add a student-facing DELETE endpoint.

- [ ] **Step 5: Run focused tests and verify pass**

Run:

```bash
npx vitest run tests/server/auth.test.ts
npx firebase-tools emulators:exec --only firestore "npx vitest run --no-file-parallelism tests/server/responses.test.ts"
```

Expected: selected tests pass and both server documents disappear.

- [ ] **Step 6: Commit only Task 3 files**

```bash
git add lib/server/responses.ts tests/server/responses.test.ts tests/server/auth.test.ts
git commit -m "fix: cascade teacher response deletion"
```

---

### Task 4: Expire browser-held student identity copies on the annual cutoff

**Files:**

- Create: `lib/retention.ts`
- Modify: `lib/studentResultProfile.ts`
- Modify: `components/StudentResponseForm.tsx`
- Modify: `app/student/page.tsx`
- Modify: `app/student/results/page.tsx`
- Test: `tests/lib/retention.test.ts`

**Interfaces:**

- Produces: `latestFebruaryFirstCutoff(now: Date): Date`
- Produces: `isBeforeAnnualCutoff(isoTimestamp: string, now: Date): boolean`
- Produces: `purgeExpiredStudentStorage(now?: Date): void`
- Changes stored result profile to `{ profile: StudentProfile; stored_at: string }`

- [ ] **Step 1: Write cutoff boundary tests**

Create `tests/lib/retention.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  isBeforeAnnualCutoff,
  latestFebruaryFirstCutoff,
} from "@/lib/retention";

describe("annual student-data cutoff", () => {
  it("uses February 1 00:00 KST as the current cutoff", () => {
    expect(
      latestFebruaryFirstCutoff(
        new Date("2027-02-01T00:30:00+09:00"),
      ).toISOString(),
    ).toBe("2027-01-31T15:00:00.000Z");
  });

  it("uses the previous year's cutoff before February 1 KST", () => {
    expect(
      latestFebruaryFirstCutoff(
        new Date("2027-01-31T23:59:59+09:00"),
      ).toISOString(),
    ).toBe("2026-01-31T15:00:00.000Z");
  });

  it("expires only records strictly older than the cutoff", () => {
    const now = new Date("2027-02-01T00:30:00+09:00");
    expect(isBeforeAnnualCutoff("2027-01-31T14:59:59.999Z", now)).toBe(true);
    expect(isBeforeAnnualCutoff("2027-01-31T15:00:00.000Z", now)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the cutoff test and confirm failure**

Run:

```bash
npx vitest run tests/lib/retention.test.ts
```

Expected: import failure because `lib/retention.ts` does not exist.

- [ ] **Step 3: Implement the pure cutoff helper**

Create `lib/retention.ts`:

```ts
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function latestFebruaryFirstCutoff(now: Date): Date {
  const koreaYear = new Date(now.getTime() + KST_OFFSET_MS).getUTCFullYear();
  const currentYearCutoff = new Date(Date.UTC(koreaYear, 0, 31, 15));

  return now >= currentYearCutoff
    ? currentYearCutoff
    : new Date(Date.UTC(koreaYear - 1, 0, 31, 15));
}

export function isBeforeAnnualCutoff(isoTimestamp: string, now: Date): boolean {
  const storedAt = new Date(isoTimestamp);
  return (
    Number.isFinite(storedAt.getTime()) &&
    storedAt < latestFebruaryFirstCutoff(now)
  );
}
```

- [ ] **Step 4: Write failing local-storage expiry tests**

Extend `tests/lib/retention.test.ts` with this in-memory `window.localStorage` stub and assertion:

```ts
import { beforeEach, vi } from "vitest";

const values = new Map<string, string>();
const localStorage = {
  get length() {
    return values.size;
  },
  clear() {
    values.clear();
  },
  getItem(key: string) {
    return values.get(key) ?? null;
  },
  key(index: number) {
    return Array.from(values.keys())[index] ?? null;
  },
  removeItem(key: string) {
    values.delete(key);
  },
  setItem(key: string, value: string) {
    values.set(key, value);
  },
};

beforeEach(() => {
  values.clear();
  vi.stubGlobal("window", { localStorage });
});

it("removes expired profile and submission copies but preserves current records", async () => {
  window.localStorage.setItem(
    "demand-app-student-result-profile",
    JSON.stringify({
      profile: {
        grade: 1,
        class_number: 1,
        student_number: 1,
        student_name: "지난학생",
      },
      stored_at: "2027-01-31T14:59:59.999Z",
    }),
  );
  window.localStorage.setItem(
    "demand-app-student-submission:room:survey-old",
    JSON.stringify({
      profile: {
        grade: 1,
        class_number: 1,
        student_number: 1,
        student_name: "지난학생",
      },
      submitted_at: "2027-01-31T14:59:59.999Z",
    }),
  );
  window.localStorage.setItem(
    "demand-app-student-submission:room:survey-current",
    JSON.stringify({
      profile: {
        grade: 1,
        class_number: 1,
        student_number: 1,
        student_name: "현재학생",
      },
      submitted_at: "2027-01-31T15:00:00.000Z",
    }),
  );

  const { purgeExpiredStudentStorage } = await import(
    "@/lib/studentResultProfile"
  );
  purgeExpiredStudentStorage(new Date("2027-02-01T00:30:00+09:00"));

  expect(
    window.localStorage.getItem("demand-app-student-result-profile"),
  ).toBeNull();
  expect(
    window.localStorage.getItem(
      "demand-app-student-submission:room:survey-old",
    ),
  ).toBeNull();
  expect(
    window.localStorage.getItem(
      "demand-app-student-submission:room:survey-current",
    ),
  ).not.toBeNull();
});
```

- [ ] **Step 5: Timestamp and purge local identity records**

In `lib/studentResultProfile.ts`:

```ts
import { isBeforeAnnualCutoff } from "./retention";

export function writeStoredStudentResultProfile(profile: StudentProfile) {
  window.localStorage.setItem(
    STUDENT_RESULT_PROFILE_KEY,
    JSON.stringify({
      profile,
      stored_at: new Date().toISOString(),
    }),
  );
}

export function purgeExpiredStudentStorage(now = new Date()) {
  if (typeof window === "undefined") return;

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (
      key !== STUDENT_RESULT_PROFILE_KEY &&
      !key?.startsWith(`${STUDENT_SUBMISSION_KEY_PREFIX}:`)
    ) {
      continue;
    }

    const raw = key ? window.localStorage.getItem(key) : null;
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      const timestamp =
        key === STUDENT_RESULT_PROFILE_KEY
          ? parsed?.stored_at
          : parsed?.submitted_at;
      if (
        typeof timestamp !== "string" ||
        isBeforeAnnualCutoff(timestamp, now)
      ) {
        window.localStorage.removeItem(key!);
      }
    } catch {
      window.localStorage.removeItem(key!);
    }
  }
}
```

Update `readStoredStudentResultProfile()` to parse `parsed.profile` after calling `purgeExpiredStudentStorage()`. Treat the legacy untimestamped shape as expired and remove it. Replace the direct `localStorage.setItem(STUDENT_RESULT_PROFILE_KEY, ...)` in `StudentResponseForm.tsx` with `writeStoredStudentResultProfile(trimmedProfile)`.

Update `hasStoredStudentSubmission()` to call `readStoredStudentSubmission()` so expired submissions cannot trigger a redirect.

- [ ] **Step 6: Invoke cleanup before student data loads**

In both `app/student/page.tsx` and `app/student/results/page.tsx`, add:

```ts
useEffect(() => {
  purgeExpiredStudentStorage();
}, []);
```

This is a privacy cleanup only. It does not expose a student DELETE action and does not alter server data.

- [ ] **Step 7: Run tests and verify pass**

Run:

```bash
npx vitest run tests/lib/retention.test.ts tests/app/student-results-auth-gate.test.ts
```

Expected: all selected tests pass.

- [ ] **Step 8: Commit only Task 4 files**

```bash
git add lib/retention.ts lib/studentResultProfile.ts components/StudentResponseForm.tsx app/student/page.tsx app/student/results/page.tsx tests/lib/retention.test.ts
git commit -m "feat: expire student identity cache annually"
```

---

### Task 5: Automatically purge expired Firestore response data every February 1

**Files:**

- Create: `lib/server/retention.ts`
- Create: `app/api/cron/purge-student-data/route.ts`
- Create: `tests/server/retention.test.ts`
- Create: `tests/app/cron-retention-route.test.ts`
- Modify: `vercel.json`
- Modify: `.env.example`
- Modify: `tests/lib/deployment-config.test.ts`

**Interfaces:**

- Consumes: `latestFebruaryFirstCutoff(now: Date): Date`
- Produces: `purgeExpiredStudentData(now?: Date): Promise<{ cutoff: string; responsesDeleted: number; reservationsDeleted: number }>`
- Produces: `GET /api/cron/purge-student-data`
- Requires: `Authorization: Bearer ${CRON_SECRET}`

- [ ] **Step 1: Write failing Firebase cleanup tests**

Create `tests/server/retention.test.ts`:

```ts
import { beforeEach, expect, it, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { clearFirebaseTestData } from "./firebase-test-env";

vi.mock("server-only", () => ({}));
beforeEach(clearFirebaseTestData);

it("deletes only responses and reservations older than February 1 KST", async () => {
  const oldTime = Timestamp.fromDate(
    new Date("2027-01-31T14:59:59.999Z"),
  );
  const currentTime = Timestamp.fromDate(
    new Date("2027-01-31T15:00:00.000Z"),
  );
  const root = "rooms/room-a/surveys/survey-a";

  await Promise.all([
    adminDb.doc(`${root}/responses/old`).set({ createdAt: oldTime }),
    adminDb.doc(`${root}/responses/current`).set({ createdAt: currentTime }),
    adminDb.doc(`${root}/reservations/old`).set({
      createdAt: oldTime,
      studentName: "지난학생",
    }),
    adminDb.doc(`${root}/reservations/current`).set({
      createdAt: currentTime,
      studentName: "현재학생",
    }),
  ]);

  const { purgeExpiredStudentData } = await import(
    "@/lib/server/retention"
  );
  const result = await purgeExpiredStudentData(
    new Date("2027-02-01T00:30:00+09:00"),
  );

  expect(result).toEqual({
    cutoff: "2027-01-31T15:00:00.000Z",
    responsesDeleted: 1,
    reservationsDeleted: 1,
  });
  expect((await adminDb.doc(`${root}/responses/old`).get()).exists).toBe(false);
  expect(
    (await adminDb.doc(`${root}/responses/current`).get()).exists,
  ).toBe(true);
  expect(
    (await adminDb.doc(`${root}/reservations/old`).get()).exists,
  ).toBe(false);
  expect(
    (await adminDb.doc(`${root}/reservations/current`).get()).exists,
  ).toBe(true);

  await expect(
    purgeExpiredStudentData(new Date("2027-02-01T00:30:00+09:00")),
  ).resolves.toMatchObject({
    responsesDeleted: 0,
    reservationsDeleted: 0,
  });
});
```

- [ ] **Step 2: Run the Firebase test and confirm failure**

Run:

```bash
npx firebase-tools emulators:exec --only firestore "npx vitest run --no-file-parallelism tests/server/retention.test.ts"
```

Expected: import failure because `lib/server/retention.ts` does not exist.

- [ ] **Step 3: Implement idempotent cutoff deletion**

Create `lib/server/retention.ts`:

```ts
import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { latestFebruaryFirstCutoff } from "@/lib/retention";

async function deleteBefore(
  collectionId: "responses" | "reservations",
  cutoff: Timestamp,
) {
  const snapshots = await adminDb
    .collectionGroup(collectionId)
    .where("createdAt", "<", cutoff)
    .get();
  const writer = adminDb.bulkWriter();
  for (const snapshot of snapshots.docs) {
    writer.delete(snapshot.ref);
  }
  await writer.close();
  return snapshots.size;
}

export async function purgeExpiredStudentData(now = new Date()) {
  const cutoffDate = latestFebruaryFirstCutoff(now);
  const cutoff = Timestamp.fromDate(cutoffDate);
  const [responsesDeleted, reservationsDeleted] = await Promise.all([
    deleteBefore("responses", cutoff),
    deleteBefore("reservations", cutoff),
  ]);

  return {
    cutoff: cutoffDate.toISOString(),
    responsesDeleted,
    reservationsDeleted,
  };
}
```

Queries use strict `< cutoff`, so responses created after the annual boundary survive delayed or repeated runs.

- [ ] **Step 4: Write failing cron-auth and configuration tests**

Extend `tests/lib/deployment-config.test.ts`:

```ts
type VercelConfig = {
  headers: Array<{ source: string; headers: Header[] }>;
  crons: Array<{ path: string; schedule: string }>;
};

it("runs the annual student-data purge on February 1 KST", () => {
  const vercel = readVercel();
  expect(vercel.crons).toEqual([
    {
      path: "/api/cron/purge-student-data",
      schedule: "0 15 31 1 *",
    },
  ]);

  const env = readFileSync(".env.example", "utf8");
  expect(env).toContain("CRON_SECRET=");
});
```

Create `tests/app/cron-retention-route.test.ts`:

```ts
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { purgeExpiredStudentData } = vi.hoisted(() => ({
  purgeExpiredStudentData: vi.fn(),
}));

vi.mock("@/lib/server/retention", () => ({
  purgeExpiredStudentData,
}));

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "test-cron-secret");
  purgeExpiredStudentData.mockResolvedValue({
    cutoff: "2027-01-31T15:00:00.000Z",
    responsesDeleted: 2,
    reservationsDeleted: 2,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

it("rejects a request without the cron bearer secret", async () => {
  const { GET } = await import(
    "@/app/api/cron/purge-student-data/route"
  );
  const response = await GET(
    new Request("http://localhost/api/cron/purge-student-data"),
  );

  expect(response.status).toBe(401);
  expect(purgeExpiredStudentData).not.toHaveBeenCalled();
});

it("runs the purge for Vercel's authenticated request", async () => {
  const { GET } = await import(
    "@/app/api/cron/purge-student-data/route"
  );
  const response = await GET(
    new Request("http://localhost/api/cron/purge-student-data", {
      headers: { authorization: "Bearer test-cron-secret" },
    }),
  );

  expect(response.status).toBe(200);
  expect(purgeExpiredStudentData).toHaveBeenCalledOnce();
  await expect(response.json()).resolves.toMatchObject({
    responsesDeleted: 2,
    reservationsDeleted: 2,
  });
});
```

- [ ] **Step 5: Implement the secured cron route**

Create `app/api/cron/purge-student-data/route.ts`:

```ts
import { jsonOk } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (
    !secret ||
    request.headers.get("authorization") !== `Bearer ${secret}`
  ) {
    return Response.json({ error: "인증되지 않은 요청입니다." }, {
      status: 401,
    });
  }

  const { purgeExpiredStudentData } = await import(
    "@/lib/server/retention"
  );
  return jsonOk(await purgeExpiredStudentData());
}
```

- [ ] **Step 6: Register the UTC schedule and environment contract**

Add to top level of `vercel.json`:

```json
"crons": [
  {
    "path": "/api/cron/purge-student-data",
    "schedule": "0 15 31 1 *"
  }
]
```

`15:00 UTC` on January 31 equals `00:00 KST` on February 1. Add:

```dotenv
CRON_SECRET=replace-with-at-least-16-random-characters
```

to `.env.example`. During deployment, create a random Production `CRON_SECRET` in Vercel; never commit its real value.

- [ ] **Step 7: Run focused tests and verify pass**

Run:

```bash
npx vitest run tests/lib/deployment-config.test.ts tests/app/cron-retention-route.test.ts
npx firebase-tools emulators:exec --only firestore "npx vitest run --no-file-parallelism tests/server/retention.test.ts"
```

Expected: all selected tests pass.

- [ ] **Step 8: Commit only Task 5 files**

```bash
git add lib/server/retention.ts app/api/cron/purge-student-data/route.ts tests/server/retention.test.ts tests/app/cron-retention-route.test.ts vercel.json .env.example tests/lib/deployment-config.test.ts
git commit -m "feat: purge student responses every February"
```

---

### Task 6: Align legal disclosures and dorms-check case D evidence

**Files:**

- Modify: `app/privacy/page.tsx`
- Modify: `app/terms/page.tsx`
- Modify: `dorms-check.config.json`
- Modify: `tests/lib/deployment-config.test.ts`

**Interfaces:**

- Consumes: implemented age gate, same-class visibility, teacher-only deletion, and annual purge behavior
- Produces: published disclosures that match implementation
- Produces: `edzipCase: "D"`

- [ ] **Step 1: Write failing legal-copy assertions**

Add to `tests/lib/deployment-config.test.ts`:

```ts
it("documents identifiable student-data rules and annual destruction", () => {
  const privacy = readFileSync("app/privacy/page.tsx", "utf8");
  const terms = readFileSync("app/terms/page.tsx", "utf8");
  const dorms = JSON.parse(
    readFileSync("dorms-check.config.json", "utf8"),
  ) as { edzipCase: string };

  expect(privacy).toContain("만 14세 미만에게는 제공하지 않습니다");
  expect(privacy).toContain("수업 참여 여부 확인");
  expect(privacy).toContain("같은 학년·반");
  expect(privacy).toContain("매년 2월 1일");
  expect(privacy).toContain("교사만 삭제");
  expect(privacy).toContain("Firebase");
  expect(privacy).toContain("Vercel");
  expect(terms).toContain("만 14세 이상");
  expect(terms).toContain("이름 또는 수업용 별명");
  expect(dorms.edzipCase).toBe("D");
});
```

- [ ] **Step 2: Run the legal-copy test and confirm failure**

Run:

```bash
npx vitest run tests/lib/deployment-config.test.ts
```

Expected: age restriction, exact annual deletion, visibility, or D-case assertions fail.

- [ ] **Step 3: Update the privacy policy to match actual behavior**

Revise `app/privacy/page.tsx` with these exact operational statements:

```tsx
<p className="legal-placeholder">
  이 서비스는 만 14세 미만에게는 제공하지 않습니다. 학생은 응답 전에
  만 14세 이상임을 확인해야 합니다. 만 14세 이상이라는 확인은 학교 또는
  교사가 확인해야 하는 개인정보 처리의 법적 근거를 대신하지 않습니다.
</p>
```

Under purpose and items:

```tsx
<li>
  <strong>수업 참여 여부 확인:</strong> 학년, 반, 이름 또는 교사가
  허용한 수업용 별명을 사용해 응답 제출 여부를 확인
</li>
```

Under visibility:

```tsx
<p>
  담당 교사는 수업방의 이름·별명과 응답을 볼 수 있습니다. 응답을 제출한
  학생은 자신의 응답을 직접 열람할 수 있으며, 같은 학년·반에서 응답한
  학생의 이름 또는 수업용 별명을 볼 수 있습니다. 다른 반 학생에게는
  이름·학생 번호·응답 식별자를 공개하지 않습니다.
</p>
```

Under retention and deletion:

```tsx
<li>
  <strong>학생 응답과 가격 배정 예약:</strong> 교사가 먼저 삭제하지
  않으면 매년 2월 1일에 이전 응답과 그 응답에 연결된 이름·별명 및
  가격 배정 예약을 자동 파기합니다.
</li>
<li>
  <strong>학생 브라우저 사본:</strong> 매년 2월 1일 이후 학생이
  서비스에 다시 접속할 때 이전 이름·별명과 제출정보를 자동 삭제합니다.
  사용자가 브라우저 데이터를 직접 지우면 그보다 먼저 삭제됩니다.
</li>
```

Under rights:

```tsx
<p>
  학생은 결과 화면에서 자신의 응답을 직접 열람할 수 있습니다. 서버에
  저장된 응답의 수정·삭제는 수업방을 소유한 교사만 실행할 수 있으므로,
  학생 또는 보호자는 담당 교사나 개인정보 보호책임자 최진영
  (jinyoung1571@naver.com)에게 요청해야 합니다.
</p>
```

Under overseas processing, keep the existing Firebase/Vercel D-type disclosure. Do not say names are pseudonymized before external transmission.

- [ ] **Step 4: Update terms and D-case configuration**

In `app/terms/page.tsx`, replace the audience and identity clauses with:

```tsx
<section>
  <h2>2. 이용 대상</h2>
  <p>
    서비스는 만 14세 이상인 학생과 교사에게만 제공됩니다. 만 14세
    미만은 수업방에 입장하거나 응답을 제출하면 안 됩니다.
  </p>
</section>

<section>
  <h2>3. 학생 이름과 수업용 별명</h2>
  <p>
    학생은 수업 참여 여부 확인을 위해 이름 또는 교사가 허용한 수업용
    별명을 입력합니다. 입력한 이름 또는 별명은 담당 교사와 같은 학년·반
    응답 학생에게 공개됩니다.
  </p>
</section>
```

Set:

```json
"edzipCase": "D"
```

in `dorms-check.config.json`.

- [ ] **Step 5: Run tests and verify pass**

Run:

```bash
npx vitest run tests/lib/deployment-config.test.ts
npx eslint app/privacy/page.tsx app/terms/page.tsx
npm run typecheck
```

Expected: all commands pass.

- [ ] **Step 6: Commit only Task 6 files**

```bash
git add app/privacy/page.tsx app/terms/page.tsx dorms-check.config.json tests/lib/deployment-config.test.ts
git commit -m "docs: disclose identifiable student data lifecycle"
```

---

### Task 7: Full verification, production deployment, and independent rescan

**Files:**

- Update after scan: `.dorms-check/answers.json`
- Generated after scan: `.dorms-check/REPORT.md`
- Generated after scan: `.dorms-check/review.json`
- Generated after scan: `.dorms-check/scan.json`
- Generated after scan: `.dorms-check/state.json`
- Generated after submission readiness: `.dorms-check/evidence/REPORT.md`
- Generated after submission readiness: `.dorms-check/evidence/report.json`

**Interfaces:**

- Consumes: all prior tasks
- Produces: verified production deployment and current dorms-check evidence

- [ ] **Step 1: Run the complete local verification suite**

Run:

```bash
npx eslint app components lib tests
npm run typecheck
npx vitest run --exclude 'tests/firebase/**/*' --exclude 'tests/server/**/*' --exclude '.worktrees/**/*'
npx firebase-tools emulators:exec --only firestore "npx vitest run --no-file-parallelism tests/firebase tests/server"
npm run build
git diff --check
```

Expected: all checks pass. The Next.js build lists `/api/cron/purge-student-data`.

- [ ] **Step 2: Perform focused local behavior checks**

At `http://localhost:3000/student` verify:

1. Assignment button remains disabled until name/alias and age checkbox are complete.
2. Unchecked age confirmation produces `만 14세 이상만 이용할 수 있습니다.`
3. Name and alias both submit.
4. Submitted student sees their own response.
5. Same-class respondent names appear.
6. Other-class names remain blank.

At `http://localhost:3000/teacher/responses` verify:

1. Owning teacher can delete a response.
2. Student has no delete control.
3. Deleted response no longer appears after refresh.

- [ ] **Step 3: Configure the production cron secret**

Generate a random secret locally without printing it into source:

```bash
openssl rand -hex 32
```

Store it as the Vercel Production environment variable `CRON_SECRET`. Verify the project has exactly one active cron after deployment. Vercel Cron uses UTC and sends a GET request to the configured path; `CRON_SECRET` is sent as the bearer token.

- [ ] **Step 4: Deploy only after explicit deployment approval**

Run the project's established production deployment command. Confirm the resulting production alias is:

```text
https://inflation-classroom.vercel.app
```

Do not deploy Firebase Hosting. Firestore rules are unchanged; deploy them only if their file changed during implementation.

- [ ] **Step 5: Verify the live privacy and security surface**

Run:

```bash
curl -fsSIL https://inflation-classroom.vercel.app/privacy
curl -fsS https://inflation-classroom.vercel.app/privacy | rg "최진영|jinyoung1571@naver.com|매년 2월 1일|같은 학년·반"
curl -fsS -o /dev/null -w "%{http_code}\n" https://inflation-classroom.vercel.app/api/cron/purge-student-data
```

Expected:

- `/privacy` returns `200` with existing CSP/HSTS/security headers.
- Privacy HTML contains all four required strings.
- Unauthenticated cron request returns `401`.

Do not manually invoke the authorized annual purge against production unless the user separately approves that destructive test.

- [ ] **Step 6: Re-run dorms-check and create evidence-based answers**

Run:

```bash
npx -y github:shinnanchanguk/dorms-check scan --url "https://inflation-classroom.vercel.app"
```

Read every pending item. Rebuild `.dorms-check/answers.json` using current `file:line` evidence:

- `edzip.1-1`: participation-confirmation purpose plus name-or-alias UI.
- `edzip.1-3`: exact February 1 retention and implemented cron/client cleanup.
- `edzip.3-1`: own direct read, teacher-only deletion request path, cascade deletion.
- `edzip.4-1`: enforced age gate and D-type disclosure.

Mark an item `pass` only if both code and published policy prove it. Then run:

```bash
npx -y github:shinnanchanguk/dorms-check judge --in .dorms-check/answers.json
npx -y github:shinnanchanguk/dorms-check scan --url "https://inflation-classroom.vercel.app"
npx -y github:shinnanchanguk/dorms-check status
```

Expected: security eligibility passes and remaining edzip items equal zero.

- [ ] **Step 7: Generate submission evidence only after zero remaining items**

Run:

```bash
npx -y github:shinnanchanguk/dorms-check submit
```

Confirm these files exist:

```text
.dorms-check/evidence/REPORT.md
.dorms-check/evidence/report.json
```

The local result prepares evidence; `dorms.school` performs final independent verification.

- [ ] **Step 8: Commit generated current evidence separately**

```bash
git add .dorms-check/answers.json .dorms-check/REPORT.md .dorms-check/review.json .dorms-check/scan.json .dorms-check/state.json .dorms-check/evidence/REPORT.md .dorms-check/evidence/report.json
git commit -m "chore: refresh privacy readiness evidence"
```

---

## Self-Review

- Spec coverage: age restriction → Task 1 and Task 6; name or alias for participation confirmation → Task 1 and Task 6; same-class name visibility → Task 2; student own read and teacher-only deletion → Task 2, Task 3, Task 6; February 1 destruction → Task 4 and Task 5; D-type external processing → Task 6; deployment and rescan → Task 7.
- Security boundary: same-class authorization comes only from the authenticated UID's own Firestore response, not query strings or browser storage.
- Retention boundary: server deletion and browser lazy cleanup share one pure cutoff function and use strict `< cutoff`.
- Type consistency: `ageConfirmed` is a separate boolean request field; it is not added to `StudentProfile` or persisted as a birth-date substitute.
- Dependency check: no package additions.
- Operational limitation disclosed: Vercel does not retry failed cron invocations; Task 7 requires log verification, while idempotence permits a safe authorized rerun after a failure.
