import { expect, it } from "vitest";
import { canAccessTeacherData } from "@/lib/teacher-access";

it("allows local demo and authenticated teachers only", () => {
  expect(canAccessTeacherData({ demoMode: true, isTeacher: false, ready: true })).toBe(true);
  expect(canAccessTeacherData({ demoMode: false, isTeacher: true, ready: true })).toBe(true);
  expect(canAccessTeacherData({ demoMode: false, isTeacher: true, ready: false })).toBe(false);
  expect(canAccessTeacherData({ demoMode: false, isTeacher: false, ready: true })).toBe(false);
});

it("blocks teacher data requests while the room name is empty", () => {
  expect(
    canAccessTeacherData({
      demoMode: false,
      isTeacher: true,
      ready: true,
      roomName: "",
    }),
  ).toBe(false);
  expect(
    canAccessTeacherData({
      demoMode: false,
      isTeacher: true,
      ready: true,
      roomName: "서울 / 경제고 / 3학년",
    }),
  ).toBe(true);
});
