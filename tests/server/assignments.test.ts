import { beforeEach, expect, it, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { StudentProfile } from "@/lib/types";
import { clearFirebaseTestData } from "./firebase-test-env";

vi.mock("server-only", () => ({}));

beforeEach(clearFirebaseTestData);

const roomName = "경제 1반";
const profileA: StudentProfile = {
  grade: 1,
  class_number: 1,
  student_number: 1,
  student_name: "학생1",
};

async function createSurvey() {
  const { saveTeacherSurvey } = await import("@/lib/server/surveys");
  return saveTeacherSurvey("teacher-a", roomName, {
    title: "수요 조사",
    classBudgets: [],
    products: [{
      name: "빵",
      pricePoints: [
        { description: "저렴", price: 1000 },
        { description: "비쌈", price: 2000 },
      ],
    }],
  });
}

async function reservationRef(surveyId: string, uid: string) {
  const { resolveRoom } = await import("@/lib/server/rooms");
  return adminDb.doc(`rooms/${(await resolveRoom(roomName))!.id}/surveys/${surveyId}/reservations/${uid}`);
}

async function stateRef(surveyId: string) {
  const { resolveRoom } = await import("@/lib/server/rooms");
  return adminDb.doc(`rooms/${(await resolveRoom(roomName))!.id}/surveys/${surveyId}/assignmentStates/1-1`);
}

it("returns the same assignments for repeated calls by one student", async () => {
  const { reserveAssignmentsForUser } = await import("@/lib/server/assignments");
  const survey = await createSurvey();
  const first = await reserveAssignmentsForUser("student-a", roomName, survey.id, profileA);
  const second = await reserveAssignmentsForUser("student-a", roomName, survey.id, profileA);
  expect(second).toEqual(first);
});

it("round-robins each product across concurrent students", async () => {
  const { reserveAssignmentsForUser } = await import("@/lib/server/assignments");
  const survey = await createSurvey();
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
}, 15_000);

it("reissues stale, empty, and malformed cached assignments against current survey products", async () => {
  const { reserveAssignmentsForUser } = await import("@/lib/server/assignments");
  const survey = await createSurvey();
  const product = survey.products[0];
  const oldAssignment = { [product.id]: "removed-price" };
  const cases: Array<[string, unknown]> = [
    ["stale-price", oldAssignment],
    ["stale-product", { ...oldAssignment, "removed-product": product.price_points[0].id }],
    ["empty", {}],
    ["malformed", []],
  ];
  await stateRef(survey.id).then((ref) => ref.set({ nextByProduct: { [product.id]: 1 } }));
  for (const [index, [uid, assignments]] of cases.entries()) {
    await (await reservationRef(survey.id, uid)).set({
      assignments,
      expiresAt: Timestamp.fromMillis(Date.now() + 60_000),
      consumedAt: null,
    });
    await expect(reserveAssignmentsForUser(uid, roomName, survey.id, profileA)).resolves.toEqual({
      [product.id]: product.price_points[(index + 1) % 2].id,
    });
  }
  expect((await (await stateRef(survey.id)).get()).get("nextByProduct")[product.id]).toBe(5);
});

it("reallocates expired and consumed reservations", async () => {
  const { reserveAssignmentsForUser } = await import("@/lib/server/assignments");
  const survey = await createSurvey();
  const product = survey.products[0];
  for (const [uid, reservation] of [
    ["expired", { expiresAt: Timestamp.fromMillis(Date.now() - 1), consumedAt: null }],
    ["consumed", { expiresAt: Timestamp.fromMillis(Date.now() + 60_000), consumedAt: Timestamp.now() }],
  ] as const) {
    await (await reservationRef(survey.id, uid)).set({
      assignments: { [product.id]: product.price_points[0].id },
      ...reservation,
    });
    await expect(reserveAssignmentsForUser(uid, roomName, survey.id, profileA)).resolves.toEqual({
      [product.id]: product.price_points[uid === "expired" ? 0 : 1].id,
    });
  }
  expect((await (await stateRef(survey.id)).get()).get("nextByProduct")[product.id]).toBe(2);
});

it("returns one reservation and increments state once for concurrent calls from one UID", async () => {
  const { reserveAssignmentsForUser } = await import("@/lib/server/assignments");
  const survey = await createSurvey();
  const assignments = await Promise.all(
    Array.from({ length: 4 }, () => reserveAssignmentsForUser("student-a", roomName, survey.id, profileA)),
  );
  expect(new Set(assignments.map((value) => JSON.stringify(value))).size).toBe(1);
  expect((await (await stateRef(survey.id)).get()).get("nextByProduct")[survey.products[0].id]).toBe(1);
}, 15_000);
