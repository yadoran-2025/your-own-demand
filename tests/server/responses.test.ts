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
  student_name: "학생A",
};
const profileB: StudentProfile = {
  grade: 1,
  class_number: 1,
  student_number: 2,
  student_name: "학생B",
};
const profileC: StudentProfile = {
  grade: 1,
  class_number: 1,
  student_number: 3,
  student_name: "학생C",
};
const profileD: StudentProfile = {
  grade: 1,
  class_number: 2,
  student_number: 4,
  student_name: "다른반학생",
};

async function fixture() {
  const { saveTeacherSurvey } = await import("@/lib/server/surveys");
  const { reserveAssignmentsForUser } = await import("@/lib/server/assignments");
  const survey = await saveTeacherSurvey("teacher-a", roomName, {
    title: "수요 조사",
    classBudgets: [
      { grade: 1, class_number: 1, budget: 5_000 },
      { grade: 1, class_number: 2, budget: 5_000 },
    ],
    products: [{
      name: "빵",
      pricePoints: [
        { description: "저렴", price: 100 },
        { description: "비쌈", price: 200 },
      ],
    }],
  });
  const assignmentsA = await reserveAssignmentsForUser("student-a", roomName, survey.id, profileA, true);
  return { survey, assignmentsA };
}

async function multiFixture() {
  const { saveTeacherSurvey } = await import("@/lib/server/surveys");
  const { reserveAssignmentsForUser } = await import("@/lib/server/assignments");
  const survey = await saveTeacherSurvey("teacher-a", roomName, {
    title: "복수 상품 조사",
    classBudgets: [{ grade: 1, class_number: 1, budget: 5_000 }],
    products: ["빵", "우유"].map((name) => ({
      name,
      pricePoints: [{ description: "기본", price: 100 }, { description: "고가", price: 200 }],
    })),
  });
  return { survey, assignments: await reserveAssignmentsForUser("student-a", roomName, survey.id, profileA, true) };
}

it("rejects items not reserved for the student", async () => {
  const { submitResponseForUser } = await import("@/lib/server/responses");
  const { survey } = await fixture();
  await expect(submitResponseForUser("student-a", roomName, survey.id, profileA, {
    "unassigned-price-point": 3,
  }, true)).rejects.toThrow("배정된 가격 구성이 아닙니다.");
});

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

it("rejects a class-budget overrun", async () => {
  const { submitResponseForUser } = await import("@/lib/server/responses");
  const { survey, assignmentsA } = await fixture();
  const assignedPricePointId = Object.values(assignmentsA)[0];
  await expect(submitResponseForUser("student-a", roomName, survey.id, profileA, {
    [assignedPricePointId]: 100,
  }, true)).rejects.toThrow("예산을 초과했습니다.");
});

it("stores one response and consumes its reservation atomically", async () => {
  const { submitResponseForUser } = await import("@/lib/server/responses");
  const { resolveRoom } = await import("@/lib/server/rooms");
  const { survey, assignmentsA } = await fixture();
  await expect(submitResponseForUser("student-a", roomName, survey.id, profileA, {
    [Object.values(assignmentsA)[0]]: 3,
  }, true)).resolves.toBe("student-a");
  const root = `rooms/${(await resolveRoom(roomName))!.id}/surveys/${survey.id}`;
  expect((await adminDb.doc(`${root}/responses/student-a`).get()).exists).toBe(true);
  expect((await adminDb.doc(`${root}/reservations/student-a`).get()).get("consumedAt")).toBeTruthy();
  await expect(submitResponseForUser("student-a", roomName, survey.id, profileA, {
    [Object.values(assignmentsA)[0]]: 3,
  }, true)).rejects.toThrow("이미 응답했습니다.");
});

it("reveals same-class names while redacting foreign identities", async () => {
  const { submitResponseForUser, listResponsesForUser } = await import("@/lib/server/responses");
  const { reserveAssignmentsForUser } = await import("@/lib/server/assignments");
  const { survey, assignmentsA } = await fixture();
  const assignmentsB = await reserveAssignmentsForUser("student-b", roomName, survey.id, profileB, true);
  const assignmentsD = await reserveAssignmentsForUser("student-d", roomName, survey.id, profileD, true);
  await submitResponseForUser("student-a", roomName, survey.id, profileA, { [Object.values(assignmentsA)[0]]: 1 }, true);
  await submitResponseForUser("student-b", roomName, survey.id, profileB, { [Object.values(assignmentsB)[0]]: 1 }, true);
  await submitResponseForUser("student-d", roomName, survey.id, profileD, { [Object.values(assignmentsD)[0]]: 1 }, true);

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
  expect(otherClass).toMatchObject({ student_name: "", student_number: 0 });
  expect(JSON.stringify(studentRows)).not.toContain("student-b");
  expect(JSON.stringify(studentRows)).not.toContain("student-d");
});

it("does not reveal class identities to an authenticated student without a response", async () => {
  const { submitResponseForUser, listResponsesForUser } = await import("@/lib/server/responses");
  const { survey, assignmentsA } = await fixture();
  await submitResponseForUser("student-a", roomName, survey.id, profileA, { [Object.values(assignmentsA)[0]]: 1 }, true);

  const rows = await listResponsesForUser(
    { uid: "student-without-response", isTeacher: false },
    roomName,
    survey.id,
  );

  expect(rows.every((row) => row.student_name === "")).toBe(true);
});

it("uses collision-free opaque IDs while preserving own reveal and teacher rows", async () => {
  const { submitResponseForUser, listResponsesForUser } = await import("@/lib/server/responses");
  const { reserveAssignmentsForUser } = await import("@/lib/server/assignments");
  const { survey, assignmentsA } = await fixture();
  const collisionAssignments = await reserveAssignmentsForUser("redacted-0", roomName, survey.id, profileC, true);
  const assignmentsB = await reserveAssignmentsForUser("student-b", roomName, survey.id, profileB, true);
  await submitResponseForUser("student-a", roomName, survey.id, profileA, { [Object.values(assignmentsA)[0]]: 1 }, true);
  await submitResponseForUser("student-b", roomName, survey.id, profileB, { [Object.values(assignmentsB)[0]]: 1 }, true);
  await submitResponseForUser("redacted-0", roomName, survey.id, profileC, { [Object.values(collisionAssignments)[0]]: 1 }, true);
  const studentRows = await listResponsesForUser({ uid: "student-a", isTeacher: false }, roomName, survey.id, "student-a");
  expect(new Set(studentRows.map((row) => row.id)).size).toBe(studentRows.length);
  expect(JSON.stringify(studentRows)).not.toContain("redacted-0");
  const own = studentRows.find((row) => row.id === "student-a");
  expect(own).toMatchObject({ student_name: "학생A", student_number: 1 });
  expect(own?.response_items[0].response_id).toBe("student-a");
  expect(studentRows.filter((row) => row.id !== "student-a").every((row) =>
    row.student_number === 0 && row.response_items.every((item) => item.response_id === row.id),
  )).toBe(true);
  expect(studentRows.find((row) => row.student_name === "학생B")?.id).toMatch(/^redacted-/);
  expect(studentRows.find((row) => row.student_name === "학생C")?.id).toMatch(/^redacted-/);
  const teacherRows = await listResponsesForUser({ uid: "teacher-a", isTeacher: true }, roomName, survey.id);
  expect(teacherRows.find((row) => row.id === "redacted-0")).toMatchObject({ student_name: "학생C", student_number: 3 });
  expect(teacherRows.find((row) => row.id === "redacted-0")?.response_items[0].response_id).toBe("redacted-0");
});

it("rejects missing, expired, consumed, and profile-mismatched reservations", async () => {
  const { submitResponseForUser } = await import("@/lib/server/responses");
  const { resolveRoom } = await import("@/lib/server/rooms");
  const { survey, assignmentsA } = await fixture();
  const quantity = { [Object.values(assignmentsA)[0]]: 1 };
  await expect(submitResponseForUser("missing", roomName, survey.id, profileA, quantity, true)).rejects.toThrow("배정 시간이 만료되었습니다.");
  const root = `rooms/${(await resolveRoom(roomName))!.id}/surveys/${survey.id}`;
  for (const [uid, values] of [
    ["expired", { expiresAt: Timestamp.fromMillis(Date.now() - 1), consumedAt: null }],
    ["consumed", { expiresAt: Timestamp.fromMillis(Date.now() + 60_000), consumedAt: Timestamp.now() }],
  ] as const) {
    await adminDb.doc(`${root}/reservations/${uid}`).set({
      submitterUid: uid, grade: 1, classNumber: 1, studentNumber: 1, studentName: "학생A",
      assignments: { [survey.products[0].id]: Object.values(assignmentsA)[0] }, ...values,
    });
    await expect(submitResponseForUser(uid, roomName, survey.id, profileA, quantity, true)).rejects.toThrow("배정 시간이 만료되었습니다.");
  }
  await expect(submitResponseForUser("student-a", roomName, survey.id, { ...profileA, student_name: "위조" }, quantity, true))
    .rejects.toThrow("학생 정보를 확인해 주세요.");
});

it("rejects non-exact keys and invalid quantities", async () => {
  const { submitResponseForUser } = await import("@/lib/server/responses");
  const { survey, assignmentsA } = await fixture();
  const id = Object.values(assignmentsA)[0];
  for (const quantities of [{}, { [id]: 1, extra: 0 }, { [id]: 1.5 }, { [id]: -1 }, { [id]: 101 }]) {
    await expect(submitResponseForUser("student-a", roomName, survey.id, profileA, quantities, true)).rejects.toThrow();
  }
});

it("requires exactly one assigned price point for every product", async () => {
  const { submitResponseForUser } = await import("@/lib/server/responses");
  const { survey, assignments } = await multiFixture();
  const ids = Object.values(assignments);
  await expect(submitResponseForUser("student-a", roomName, survey.id, profileA, { [ids[0]]: 1 }, true))
    .rejects.toThrow("배정된 가격 구성이 아닙니다.");
  await expect(submitResponseForUser("student-a", roomName, survey.id, profileA, { [ids[0]]: 1, [ids[1]]: 1, extra: 0 }, true))
    .rejects.toThrow("배정된 가격 구성이 아닙니다.");
});

it("uses current Firestore prices and validates teacher updates without reservation", async () => {
  const { submitResponseForUser, updateTeacherResponse } = await import("@/lib/server/responses");
  const { resolveRoom } = await import("@/lib/server/rooms");
  const { survey, assignmentsA } = await fixture();
  const pricePointId = Object.values(assignmentsA)[0];
  const surveyRef = adminDb.doc(`rooms/${(await resolveRoom(roomName))!.id}/surveys/${survey.id}`);
  const product = survey.products[0];
  await surveyRef.update({ products: [{ ...product, price_points: product.price_points.map((point) => ({
    ...point, price: point.id === pricePointId ? 6_000 : point.price,
  })) }] });
  await expect(submitResponseForUser("student-a", roomName, survey.id, profileA, { [pricePointId]: 1 }, true))
    .rejects.toThrow("예산을 초과했습니다.");
  await surveyRef.update({ products: survey.products });
  await submitResponseForUser("student-a", roomName, survey.id, profileA, { [pricePointId]: 1 }, true);
  await expect(updateTeacherResponse("teacher-a", roomName, survey.id, "student-a", profileA, { [pricePointId]: 100 }))
    .rejects.toThrow("예산을 초과했습니다.");
});

it("isolates room and survey paths and denies non-owner teacher reads", async () => {
  const { listResponsesForUser, submitResponseForUser, updateTeacherResponse, deleteTeacherResponse } = await import("@/lib/server/responses");
  const { saveTeacherSurvey } = await import("@/lib/server/surveys");
  const { survey, assignmentsA } = await fixture();
  await submitResponseForUser("student-a", roomName, survey.id, profileA, { [Object.values(assignmentsA)[0]]: 1 }, true);
  const other = await saveTeacherSurvey("teacher-c", "경제 2반", {
    title: "다른 방", classBudgets: [], products: [{ name: "물", pricePoints: [{ description: "기본", price: 100 }] }],
  });
  await expect(listResponsesForUser({ uid: "teacher-b", isTeacher: true }, roomName, survey.id)).rejects.toThrow("방 관리 권한이 없습니다.");
  await expect(listResponsesForUser({ uid: "teacher-c", isTeacher: true }, "경제 2반", survey.id)).rejects.toThrow("설문을 찾지 못했습니다.");
  await expect(updateTeacherResponse("teacher-c", "경제 2반", other.id, "student-a", profileA, {})).rejects.toThrow("응답을 찾지 못했습니다.");
  await expect(deleteTeacherResponse("teacher-b", roomName, survey.id, "student-a")).rejects.toThrow("방 관리 권한이 없습니다.");
});

it("allows only one concurrent response and writes server timestamps", async () => {
  const { submitResponseForUser } = await import("@/lib/server/responses");
  const { resolveRoom } = await import("@/lib/server/rooms");
  const { survey, assignmentsA } = await fixture();
  const quantity = { [Object.values(assignmentsA)[0]]: 1 };
  const results = await Promise.allSettled(Array.from({ length: 3 }, () =>
    submitResponseForUser("student-a", roomName, survey.id, profileA, quantity, true),
  ));
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  const root = `rooms/${(await resolveRoom(roomName))!.id}/surveys/${survey.id}`;
  const response = await adminDb.doc(`${root}/responses/student-a`).get();
  expect(response.get("createdAt")).toBeInstanceOf(Timestamp);
  expect(response.get("updatedAt")).toBeInstanceOf(Timestamp);
  expect((await adminDb.doc(`${root}/reservations/student-a`).get()).get("consumedAt")).toBeInstanceOf(Timestamp);
});

it("permits only room owner to edit and delete responses", async () => {
  const { submitResponseForUser, updateTeacherResponse, deleteTeacherResponse } = await import("@/lib/server/responses");
  const { survey, assignmentsA } = await fixture();
  const quantities = { [Object.values(assignmentsA)[0]]: 1 };
  await submitResponseForUser("student-a", roomName, survey.id, profileA, quantities, true);
  await expect(updateTeacherResponse("teacher-b", roomName, survey.id, "student-a", profileA, quantities))
    .rejects.toThrow("방 관리 권한이 없습니다.");
  await expect(deleteTeacherResponse("teacher-a", roomName, survey.id, "student-a")).resolves.toBeUndefined();
});
