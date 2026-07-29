# Teacher Entry Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the teacher's single room-name gate with Golden UI-style region, school, grade, class, and lesson entry flow while retaining existing room APIs.

**Architecture:** Browser-local workspace stores school details and classes. A deterministic room key (`지역 / 학교 / 학년 / 학급`) continues through existing survey, response, and student URL APIs.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, existing CSS.

## Global Constraints

- Use Golden UI `v1.0.0` hierarchy and responsive card structure.
- Keep Firebase schema and server API contracts unchanged.
- Preserve existing `demand-app-teacher-room` values and data.
- Add no dependencies.

---

## File Structure

- `lib/teacher-workspace.ts`: workspace model, localStorage hook, validation, room-key builder.
- `tests/lib/teacher-workspace.test.ts`: pure behavior tests.
- `components/TeacherWorkspaceGate.tsx`: school/grade and class-selection UI.
- `components/RoomGate.tsx`: keeps student one-field gate; selects teacher gate by explicit variant.
- `app/globals.css`: scoped Golden entry and class-card styles.
- `app/teacher/*.tsx`: teacher gate usage; dashboard lesson selection.

### Task 1: Workspace model and tests

**Files:** Create `lib/teacher-workspace.ts`, `tests/lib/teacher-workspace.test.ts`.

**Interfaces:** `TeacherWorkspace`, `createRoomKey(workspace, className)`, `validateSchoolDetails(details)`, `addClass(classes, value)`, `removeClass(classes, value)`.

- [ ] Write a failing test: `createRoomKey({ region: "서울", school: "통합사회고", grade: "3학년", classes: [] }, "1반")` returns `서울 / 통합사회고 / 3학년 / 1반`.
- [ ] Test empty region, school, or grade fails validation; blank and duplicate class additions return Korean error text; deletion removes only target class.
- [ ] Run `npx vitest run tests/lib/teacher-workspace.test.ts` and confirm failures.
- [ ] Implement pure helpers and `useTeacherWorkspace` using `demand-app-teacher-workspace` localStorage key.
- [ ] Re-run focused test, then commit `feat: add teacher workspace state`.

### Task 2: Golden teacher workspace gate

**Files:** Create `components/TeacherWorkspaceGate.tsx`; modify `components/RoomGate.tsx`, `app/globals.css`, and Task 1 test.

**Interfaces:** Gate receives `ready`, `roomName`, `setRoomName`, `children`; it renders children after selecting a class and calling `setRoomName(createRoomKey(workspace, className))`.

- [ ] Add failing helper tests for selecting/deleting class and rebuilding the room key.
- [ ] Implement school setup: left product intro, right three-step panel, required region/school/grade fields, `학교와 학년 만들기 / 입장` action.
- [ ] Implement class screen: existing class cards, persistent `새 학급` form, duplicate error, explicit delete confirmation, selection action.
- [ ] Add only `.teacher-workspace-*` CSS: Golden desktop split layout, mobile stack, 22px panel, 58px fields, 60px action.
- [ ] Run focused Vitest, `npm run typecheck`, `npm run lint`; commit `feat: add teacher workspace entry gate`.

### Task 3: Teacher-route and lesson integration

**Files:** Modify every `app/teacher/*.tsx` gate caller, `app/teacher/page.tsx`, `components/TeacherShell.tsx`.

**Interfaces:** Teacher routes pass `variant="teacher"`; student pages retain current default `RoomGate`. Dashboard consumes existing `Survey[]` data.

- [ ] Replace only teacher gate calls so direct `/teacher/setup`, `/teacher/results`, and related routes require workspace setup when no room exists.
- [ ] On `/teacher`, show existing surveys as Golden lesson cards with title, `대시보드`, and `QR 열기`.
- [ ] On dashboard, add one contextual `나가기` action that returns to lesson cards without clearing workspace or room data.
- [ ] Keep QR URLs using existing `buildStudentPath(roomName)`; generated key is already URL encoded by that function.
- [ ] Verify manually that legacy stored room values bypass new setup unchanged; commit `feat: connect teacher workspace flow`.

### Task 4: Regression verification

**Files:** Modify only defects found by tests.

- [ ] Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- [ ] Browser-check: required three fields; class add/duplicate/delete; selection builds key; direct teacher route gate; legacy room opens; QR includes key; dashboard exit returns to lessons.
- [ ] Commit any fix as `fix: complete teacher entry flow`.

## Self-review

- Tasks 1–3 cover every design requirement: three fields, class and lesson choices, dashboard return, QR propagation, and legacy data preservation.
- No server schema or dependency change appears in the plan.
- All task interfaces are defined before use.
