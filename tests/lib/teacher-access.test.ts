import { expect, it } from "vitest";
import { canAccessTeacherData } from "@/lib/teacher-access";

it("allows local demo and authenticated teachers only", () => {
  expect(canAccessTeacherData({ demoMode: true, isTeacher: false, ready: true })).toBe(true);
  expect(canAccessTeacherData({ demoMode: false, isTeacher: true, ready: true })).toBe(true);
  expect(canAccessTeacherData({ demoMode: false, isTeacher: true, ready: false })).toBe(false);
  expect(canAccessTeacherData({ demoMode: false, isTeacher: false, ready: true })).toBe(false);
});
