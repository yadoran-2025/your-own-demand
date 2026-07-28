import { beforeEach, expect, it, vi } from "vitest";
import { clearFirebaseTestData } from "./firebase-test-env";

vi.mock("server-only", () => ({}));

beforeEach(clearFirebaseTestData);

it("normalizes equivalent room names to one lookup id", async () => {
  const { normalizeRoomName, roomLookupId } = await import("@/lib/server/rooms");
  expect(normalizeRoomName("  경제   1반 ")).toBe("경제 1반");
  expect(roomLookupId("경제   1반")).toBe(roomLookupId(" 경제 1반 "));
});

it("creates one owner-bound room and rejects a second owner", async () => {
  const { ensureTeacherRoom } = await import("@/lib/server/rooms");
  const first = await ensureTeacherRoom("teacher-a", "경제 1반");
  await expect(ensureTeacherRoom("teacher-b", "경제 1반")).rejects.toThrow(
    "이미 다른 교사가 사용 중인 방 이름입니다.",
  );
  await expect(ensureTeacherRoom("teacher-a", "경제 1반")).resolves.toEqual(first);
});
