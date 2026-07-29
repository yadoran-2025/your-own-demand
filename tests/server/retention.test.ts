import { beforeEach, expect, it, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { clearFirebaseTestData } from "./firebase-test-env";

vi.mock("server-only", () => ({}));

beforeEach(clearFirebaseTestData);

it("deletes only responses and reservations older than February 1 KST", async () => {
  const oldTime = Timestamp.fromDate(new Date("2027-01-31T14:59:59.999Z"));
  const currentTime = Timestamp.fromDate(new Date("2027-01-31T15:00:00.000Z"));
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

  const { purgeExpiredStudentData } = await import("@/lib/server/retention");
  const result = await purgeExpiredStudentData(
    new Date("2027-02-01T00:30:00+09:00"),
  );

  expect(result).toEqual({
    cutoff: "2027-01-31T15:00:00.000Z",
    responsesDeleted: 1,
    reservationsDeleted: 1,
  });
  expect((await adminDb.doc(`${root}/responses/old`).get()).exists).toBe(false);
  expect((await adminDb.doc(`${root}/responses/current`).get()).exists).toBe(true);
  expect((await adminDb.doc(`${root}/reservations/old`).get()).exists).toBe(false);
  expect((await adminDb.doc(`${root}/reservations/current`).get()).exists).toBe(true);

  await expect(
    purgeExpiredStudentData(new Date("2027-02-01T00:30:00+09:00")),
  ).resolves.toMatchObject({
    responsesDeleted: 0,
    reservationsDeleted: 0,
  });
});
