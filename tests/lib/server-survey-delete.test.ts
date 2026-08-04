import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const surveyRef = { path: "rooms/room-1/surveys/survey-1" };
  return {
    doc: vi.fn(() => surveyRef),
    recursiveDelete: vi.fn(async () => {}),
    resolveRoom: vi.fn(async () => ({ id: "room-1", ownerUid: "teacher-1" })),
    surveyRef,
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({
  adminDb: { doc: mocks.doc, recursiveDelete: mocks.recursiveDelete },
}));
vi.mock("@/lib/server/rooms", () => ({
  ensureTeacherRoom: vi.fn(),
  resolveRoom: mocks.resolveRoom,
}));

it("recursively deletes only the selected survey and its nested responses", async () => {
  const { deleteTeacherSurvey } = await import("@/lib/server/surveys");

  await deleteTeacherSurvey("teacher-1", "수원 / 잠원중 / 3학년", "survey-1");

  expect(mocks.doc).toHaveBeenCalledWith("rooms/room-1/surveys/survey-1");
  expect(mocks.recursiveDelete).toHaveBeenCalledWith(mocks.surveyRef);
});
