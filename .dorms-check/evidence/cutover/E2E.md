# Firebase Preview E2E Verification

- Preview: `https://inflation-classroom-r5h7xzdlu-yadorans-projects.vercel.app`
- Fixture room: `전환검증-2026-07-28` (synthetic data only)

## Verified flows

- Teacher UI created and reloaded `서울 전환 검증 수정`: 빵/우유, two price points per product, and 1학년 1반 10,000원 persisted.
- Four isolated anonymous Firebase sessions submitted `검증학생1` through `검증학생4`. The retained runner verified each student's own identity visibility, foreign name/number redaction, redacted response IDs and item references, aggregate quantity 8, and a 2/2 split at every price point.
- Teacher UI showed four responses. Editing 학생1 updated the results chart in 30ms and the budget chart in 19ms (both under five seconds).
- Teacher UI deleted 학생4 and then deleted `서울 전환 검증 수정`; the survey deletion confirmation and disappearance were observed.
- Ownership was verified for the authenticated room owner.

## Auditable live receipt

[`task6-live-receipt.json`](task6-live-receipt.json) was recorded at `2026-07-29T07:34:31.900Z`. It proves a separate live Preview check with two synthetic non-anonymous teacher tokens: the second owner received 403. It also proves four anonymous students, own/foreign response privacy, 2/2 price-point splits for both products, aggregate quantity 8, and exact recursive deletion counts: responses 4→0, reservations 4→0, assignmentStates 1→0, with the survey absent afterward and its exact synthetic room and lookup absent afterward.

[`browser-events.json`](browser-events.json) is a controller-recorded IAB event index. Its `recordedAt` time is the record time, not each event's occurrence time. It references stable IDs `teacher-fixture-save-reload`, `teacher-results-four`, `results-edit-first-poll`, `budget-edit-first-poll`, `student4-delete`, `survey-delete`, and `fixture-cleanup`; it claims no screenshots.

The fixed Task 6 fixture room and lookup each returned 404 after cleanup. The remaining `수원 잠원중` room/lookup is a non-task room created after the empty baseline; it is not authorized for deletion and was retained.

## Cleanup

The room and its SHA-256 lookup are removed after this evidence is recorded. Cleanup verification records HTTP 404 for both exact Firestore document paths; no other room is targeted.
