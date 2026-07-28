import { beforeEach, expect, it, vi } from "vitest";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
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

it("generates IDs and returns an ISO creation timestamp", async () => {
  const { saveTeacherSurvey } = await import("@/lib/server/surveys");
  const serverTimestamp = vi.spyOn(FieldValue, "serverTimestamp");
  try {
    const saved = await saveTeacherSurvey("teacher-a", "경제 1반", validDraft);
    expect(serverTimestamp).toHaveBeenCalledTimes(3);
    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(saved.products[0].id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(saved.products[0].price_points[0].id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(saved.created_at).toBe(new Date(saved.created_at).toISOString());
  } finally {
    serverTimestamp.mockRestore();
  }
});

it("lists only requested room surveys in newest-first creation order", async () => {
  const [{ ensureTeacherRoom, resolveRoom }, { listSurveys }] = await Promise.all([
    import("@/lib/server/rooms"),
    import("@/lib/server/surveys"),
  ]);
  const firstRoom = await ensureTeacherRoom("teacher-a", "경제 1반");
  const secondRoom = await ensureTeacherRoom("teacher-b", "경제 2반");
  await adminDb.doc(`rooms/${firstRoom.roomId}/surveys/old`).set({
    title: "이전",
    classBudgets: [],
    products: [],
    createdAt: Timestamp.fromMillis(1),
    updatedAt: Timestamp.fromMillis(1),
  });
  await adminDb.doc(`rooms/${firstRoom.roomId}/surveys/new`).set({
    title: "최근",
    classBudgets: [],
    products: [],
    createdAt: Timestamp.fromMillis(2),
    updatedAt: Timestamp.fromMillis(2),
  });
  await adminDb.doc(`rooms/${secondRoom.roomId}/surveys/other`).set({
    title: "다른 방",
    classBudgets: [],
    products: [],
    createdAt: Timestamp.fromMillis(3),
    updatedAt: Timestamp.fromMillis(3),
  });
  expect((await resolveRoom("경제 1반"))?.id).toBe(firstRoom.roomId);
  expect((await listSurveys("경제 1반")).map((survey) => survey.title)).toEqual(["최근", "이전"]);
});

it("deletes an owner survey and all nested response data", async () => {
  const [{ saveTeacherSurvey, deleteTeacherSurvey }, { resolveRoom }] = await Promise.all([
    import("@/lib/server/surveys"),
    import("@/lib/server/rooms"),
  ]);
  const survey = await saveTeacherSurvey("teacher-a", "경제 1반", validDraft);
  const room = await resolveRoom("경제 1반");
  const response = adminDb.doc(`rooms/${room!.id}/surveys/${survey.id}/responses/student-a`);
  await response.set({ items: [] });
  await response.collection("nested").doc("value").set({ value: true });
  await deleteTeacherSurvey("teacher-a", "경제 1반", survey.id);
  await expect(adminDb.doc(`rooms/${room!.id}/surveys/${survey.id}`).get()).resolves.toMatchObject({ exists: false });
  await expect(response.get()).resolves.toMatchObject({ exists: false });
  await expect(response.collection("nested").doc("value").get()).resolves.toMatchObject({ exists: false });
});

it("removes response items invalidated by a saved survey update before returning", async () => {
  const [{ saveTeacherSurvey }, { resolveRoom }] = await Promise.all([
    import("@/lib/server/surveys"),
    import("@/lib/server/rooms"),
  ]);
  const saved = await saveTeacherSurvey("teacher-a", "경제 1반", {
    title: "수요 조사",
    classBudgets: [],
    products: [
      { name: "빵", pricePoints: [{ description: "한 개", price: 1000 }] },
      { name: "우유", pricePoints: [{ description: "한 병", price: 2000 }] },
    ],
  });
  const keptProduct = saved.products[0];
  const removedProduct = saved.products[1];
  const responseRef = adminDb.doc(`rooms/${(await resolveRoom("경제 1반"))!.id}/surveys/${saved.id}/responses/student-a`);
  await responseRef.set({
    items: [
      { id: "keep", response_id: "student-a", product_id: keptProduct.id, price_point_id: keptProduct.price_points[0].id, quantity: 1 },
      { id: "remove-product", response_id: "student-a", product_id: removedProduct.id, price_point_id: removedProduct.price_points[0].id, quantity: 1 },
      { id: "remove-price", response_id: "student-a", product_id: keptProduct.id, price_point_id: "removed-price", quantity: 1 },
    ],
  });
  const updated = await saveTeacherSurvey("teacher-a", "경제 1반", {
    id: saved.id,
    title: saved.title,
    classBudgets: [],
    products: [{
      id: keptProduct.id,
      name: keptProduct.name,
      pricePoints: [{
        id: keptProduct.price_points[0].id,
        description: keptProduct.price_points[0].description,
        price: keptProduct.price_points[0].price,
      }],
    }],
  });
  expect(updated.created_at).toBe(saved.created_at);
  expect((await responseRef.get()).get("items")).toEqual([{
    id: "keep",
    response_id: "student-a",
    product_id: keptProduct.id,
    price_point_id: keptProduct.price_points[0].id,
    quantity: 1,
  }]);
});
