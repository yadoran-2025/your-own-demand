import { beforeEach, expect, it, vi } from "vitest";
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
  student_name: "학생A",
};
const profileB: StudentProfile = {
  grade: 1,
  class_number: 1,
  student_number: 2,
  student_name: "학생B",
};

async function fixture() {
  const { saveTeacherSurvey } = await import("@/lib/server/surveys");
  const { reserveAssignmentsForUser } = await import("@/lib/server/assignments");
  const survey = await saveTeacherSurvey("teacher-a", roomName, {
    title: "수요 조사",
    classBudgets: [{ grade: 1, class_number: 1, budget: 5_000 }],
    products: [{
      name: "빵",
      pricePoints: [
        { description: "저렴", price: 100 },
        { description: "비쌈", price: 200 },
      ],
    }],
  });
  const assignmentsA = await reserveAssignmentsForUser("student-a", roomName, survey.id, profileA);
  return { survey, assignmentsA };
}

it("rejects items not reserved for the student", async () => {
  const { submitResponseForUser } = await import("@/lib/server/responses");
  const { survey } = await fixture();
  await expect(submitResponseForUser("student-a", roomName, survey.id, profileA, {
    "unassigned-price-point": 3,
  })).rejects.toThrow("배정된 가격 구성이 아닙니다.");
});

it("rejects a class-budget overrun", async () => {
  const { submitResponseForUser } = await import("@/lib/server/responses");
  const { survey, assignmentsA } = await fixture();
  const assignedPricePointId = Object.values(assignmentsA)[0];
  await expect(submitResponseForUser("student-a", roomName, survey.id, profileA, {
    [assignedPricePointId]: 100,
  })).rejects.toThrow("예산을 초과했습니다.");
});

it("stores one response and consumes its reservation atomically", async () => {
  const { submitResponseForUser } = await import("@/lib/server/responses");
  const { resolveRoom } = await import("@/lib/server/rooms");
  const { survey, assignmentsA } = await fixture();
  await expect(submitResponseForUser("student-a", roomName, survey.id, profileA, {
    [Object.values(assignmentsA)[0]]: 3,
  })).resolves.toBe("student-a");
  const root = `rooms/${(await resolveRoom(roomName))!.id}/surveys/${survey.id}`;
  expect((await adminDb.doc(`${root}/responses/student-a`).get()).exists).toBe(true);
  expect((await adminDb.doc(`${root}/reservations/student-a`).get()).get("consumedAt")).toBeTruthy();
  await expect(submitResponseForUser("student-a", roomName, survey.id, profileA, {
    [Object.values(assignmentsA)[0]]: 3,
  })).rejects.toThrow("이미 응답했습니다.");
});

it("redacts other students for student callers", async () => {
  const { submitResponseForUser, listResponsesForUser } = await import("@/lib/server/responses");
  const { reserveAssignmentsForUser } = await import("@/lib/server/assignments");
  const { survey, assignmentsA } = await fixture();
  const assignmentsB = await reserveAssignmentsForUser("student-b", roomName, survey.id, profileB);
  await submitResponseForUser("student-a", roomName, survey.id, profileA, { [Object.values(assignmentsA)[0]]: 1 });
  await submitResponseForUser("student-b", roomName, survey.id, profileB, { [Object.values(assignmentsB)[0]]: 1 });
  const rows = await listResponsesForUser({ uid: "student-a", isTeacher: false }, roomName, survey.id, "student-a");
  expect(rows.find((row) => row.id === "student-b")?.student_name).toBe("");
  expect(rows.find((row) => row.id === "student-b")?.student_number).toBe(0);
  expect(rows.find((row) => row.id === "student-b")?.response_items).toHaveLength(1);
  expect(rows.find((row) => row.id === "student-a")?.student_name).toBe("학생A");
});

it("permits only room owner to edit and delete responses", async () => {
  const { submitResponseForUser, updateTeacherResponse, deleteTeacherResponse } = await import("@/lib/server/responses");
  const { survey, assignmentsA } = await fixture();
  const quantities = { [Object.values(assignmentsA)[0]]: 1 };
  await submitResponseForUser("student-a", roomName, survey.id, profileA, quantities);
  await expect(updateTeacherResponse("teacher-b", roomName, survey.id, "student-a", profileA, quantities))
    .rejects.toThrow("방 관리 권한이 없습니다.");
  await expect(deleteTeacherResponse("teacher-a", roomName, survey.id, "student-a")).resolves.toBeUndefined();
});
