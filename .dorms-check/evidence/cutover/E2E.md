# Firebase Preview E2E Verification

- Preview: `https://inflation-classroom-r5h7xzdlu-yadorans-projects.vercel.app`
- Fixture room: `전환검증-2026-07-28` (synthetic data only)

## Verified flows

- Teacher UI created and reloaded `서울 전환 검증 수정`: 빵/우유, two price points per product, and 1학년 1반 10,000원 persisted.
- Four isolated anonymous Firebase sessions submitted `검증학생1` through `검증학생4`. The retained runner verified each student's own identity visibility, foreign name/number redaction, redacted response IDs and item references, aggregate quantity 8, and a 2/2 split at every price point.
- Teacher UI showed four responses. Editing 학생1 updated the results chart in 30ms and the budget chart in 19ms (both under five seconds).
- Teacher UI deleted 학생4 and then deleted `서울 전환 검증 수정`; the survey deletion confirmation and disappearance were observed.
- Ownership was verified for the authenticated room owner. A different Google teacher account was not available, so cross-account rejection was not directly exercised.

## Cleanup

The room and its SHA-256 lookup are removed after this evidence is recorded. Cleanup verification records HTTP 404 for both exact Firestore document paths; no other room is targeted.
