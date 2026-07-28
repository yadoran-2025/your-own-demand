import { beforeEach, expect, it, vi } from "vitest";
import type { SurveyDraft } from "@/lib/types";
import { clearFirebaseTestData } from "./firebase-test-env";

vi.mock("server-only", () => ({}));

beforeEach(clearFirebaseTestData);

const validDraft: SurveyDraft = {
  title: "수요 조사",
  classBudgets: [],
  products: [{
    name: "빵",
    pricePoints: [{ description: "한 개", price: 1000 }],
  }],
};

it("creates a survey with embedded products and sorted price points", async () => {
  const { saveTeacherSurvey } = await import("@/lib/server/surveys");
  const saved = await saveTeacherSurvey("teacher-a", "경제 1반", {
    title: "수요 조사",
    classBudgets: [{ grade: 1, class_number: 2, budget: 10000 }],
    products: [{
      name: "빵",
      pricePoints: [
        { description: "비쌈", price: 2000 },
        { description: "저렴", price: 1000 },
      ],
    }],
  });
  expect(saved.products[0].price_points.map((point) => point.price)).toEqual([2000, 1000]);
  expect(saved.teacher_pin).toBe("경제 1반");
});

it("rejects invalid prices and another teacher's update", async () => {
  const { saveTeacherSurvey } = await import("@/lib/server/surveys");
  await expect(saveTeacherSurvey("teacher-a", "경제 1반", {
    title: "오류",
    classBudgets: [],
    products: [{ name: "빵", pricePoints: [{ description: "", price: 0 }] }],
  })).rejects.toThrow("상황과 가격 구성을 1개 이상 입력해 주세요.");
  const survey = await saveTeacherSurvey("teacher-a", "경제 1반", validDraft);
  await expect(saveTeacherSurvey("teacher-b", "경제 1반", {
    ...validDraft,
    id: survey.id,
  })).rejects.toThrow("방 관리 권한이 없습니다.");
});
