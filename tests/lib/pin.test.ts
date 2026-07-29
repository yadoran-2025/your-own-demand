import { expect, it } from "vitest";
import { buildStudentPath, resolveSurveyId } from "@/lib/pin";

it("builds a survey-specific student path without changing room-only links", () => {
  expect(buildStudentPath("서울 / 통합사회고 / 3학년 / 1반")).toBe(
    "/student?room=%EC%84%9C%EC%9A%B8%20%2F%20%ED%86%B5%ED%95%A9%EC%82%AC%ED%9A%8C%EA%B3%A0%20%2F%203%ED%95%99%EB%85%84%20%2F%201%EB%B0%98",
  );
  expect(buildStudentPath("경제 1반", "survey/2")).toBe(
    "/student?room=%EA%B2%BD%EC%A0%9C%201%EB%B0%98&survey=survey%2F2",
  );
});

it("hydrates a requested survey before current and default selections", () => {
  expect(resolveSurveyId(["survey-1", "survey-2"], "survey-2", "survey-1"))
    .toBe("survey-2");
  expect(resolveSurveyId(["survey-1", "survey-2"], "missing", "survey-2"))
    .toBe("survey-2");
  expect(resolveSurveyId(["survey-1"], "missing")).toBe("survey-1");
});
