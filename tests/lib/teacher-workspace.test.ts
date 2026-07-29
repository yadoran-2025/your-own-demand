import { expect, it } from "vitest";
import {
  addClass,
  createRoomKey,
  removeClass,
  validateSchoolDetails,
} from "@/lib/teacher-workspace";

const workspace = {
  region: "서울",
  school: "통합사회고",
  grade: "3학년",
  classes: [],
};

it("builds a room key from school details and class", () => {
  expect(createRoomKey(workspace, "1반")).toBe("서울 / 통합사회고 / 3학년 / 1반");
});

it("requires region, school, and grade", () => {
  expect(validateSchoolDetails({ ...workspace, region: "" })).toBe("지역을 입력해주세요.");
  expect(validateSchoolDetails({ ...workspace, school: "" })).toBe("학교를 입력해주세요.");
  expect(validateSchoolDetails({ ...workspace, grade: "" })).toBe("학년을 입력해주세요.");
  expect(validateSchoolDetails(workspace)).toBe("");
});

it("rejects blank and duplicate class names", () => {
  expect(addClass(["1반"], " ")).toEqual({ classes: ["1반"], error: "학급을 입력해주세요." });
  expect(addClass(["1반"], "1반")).toEqual({ classes: ["1반"], error: "이미 등록된 학급입니다." });
});

it("removes only requested class", () => {
  expect(removeClass(["1반", "2반", "3반"], "2반")).toEqual(["1반", "3반"]);
});
