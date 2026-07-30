import { beforeEach, expect, it, vi } from "vitest";

const { ensureTeacherRoom, listSurveys, requireTeacher } = vi.hoisted(() => ({
  ensureTeacherRoom: vi.fn(),
  listSurveys: vi.fn(),
  requireTeacher: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({ requireTeacher }));
vi.mock("@/lib/server/rooms", () => ({ ensureTeacherRoom }));
vi.mock("@/lib/server/surveys", () => ({ listSurveys }));

beforeEach(() => {
  vi.clearAllMocks();
  requireTeacher.mockResolvedValue({ uid: "teacher-a" });
  ensureTeacherRoom.mockResolvedValue({
    roomId: "room-1",
    name: "경제 1반",
  });
  listSurveys.mockResolvedValue([
    {
      id: "survey-1",
      title: "저장된 설문",
      teacher_pin: "경제 1반",
      created_at: "2026-07-30T00:00:00.000Z",
      class_budgets: [],
      products: [],
    },
  ]);
});

it("ensures teacher ownership and returns the room's surveys", async () => {
  const { POST } = await import("@/app/api/rooms/ensure/route");
  const response = await POST(new Request("http://localhost/api/rooms/ensure", {
    method: "POST",
    headers: { Authorization: "Bearer token" },
    body: JSON.stringify({ name: " 경제 1반 " }),
  }));

  expect(response.status).toBe(201);
  expect(requireTeacher).toHaveBeenCalledTimes(1);
  expect(ensureTeacherRoom).toHaveBeenCalledWith("teacher-a", " 경제 1반 ");
  expect(listSurveys).toHaveBeenCalledWith("경제 1반", "room-1");
  await expect(response.json()).resolves.toEqual([
    expect.objectContaining({ id: "survey-1", title: "저장된 설문" }),
  ]);
});

it("does not load surveys when the room belongs to another teacher", async () => {
  ensureTeacherRoom.mockRejectedValue(
    new Error("이미 다른 교사가 사용 중인 방 이름입니다."),
  );
  const { POST } = await import("@/app/api/rooms/ensure/route");
  const response = await POST(new Request("http://localhost/api/rooms/ensure", {
    method: "POST",
    headers: { Authorization: "Bearer token" },
    body: JSON.stringify({ name: "경제 1반" }),
  }));

  expect(response.status).toBe(403);
  expect(listSurveys).not.toHaveBeenCalled();
  await expect(response.json()).resolves.toEqual({
    error: "이미 다른 교사가 사용 중인 방 이름입니다.",
  });
});
