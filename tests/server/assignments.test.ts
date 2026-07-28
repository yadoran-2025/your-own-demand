import { beforeEach, expect, it, vi } from "vitest";
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
