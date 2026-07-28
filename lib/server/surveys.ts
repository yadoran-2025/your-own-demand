import { randomUUID } from "node:crypto";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { Product, ResponseItem, Survey, SurveyDraft } from "@/lib/types";
import { ensureTeacherRoom, resolveRoom } from "@/lib/server/rooms";

export function cleanSurveyDraft(draft: SurveyDraft): SurveyDraft {
  const products = draft.products.map((product) => ({
    ...product,
    name: product.name.trim(),
    pricePoints: product.pricePoints
      .map((point) => ({
        ...point,
        description: point.description.trim(),
        price: Math.round(Number(point.price)),
      }))
      .filter((point) => point.price > 0),
  })).filter((product) => product.name && product.pricePoints.length);
  if (!products.length) throw new Error("상황과 가격 구성을 1개 이상 입력해 주세요.");
  return {
    ...draft,
    title: draft.title.trim() || "경제 수요설문",
    classBudgets: draft.classBudgets.filter((item) =>
      Number.isInteger(item.grade) &&
      item.grade > 0 &&
      Number.isInteger(item.class_number) &&
      item.class_number > 0 &&
      Number.isFinite(item.budget) &&
      item.budget > 0,
    ),
    products,
  };
}

function toSurvey(id: string, data: Record<string, unknown>, teacherPin: string): Survey {
  return {
    id,
    title: data.title as string,
    teacher_pin: teacherPin,
    created_at: (data.createdAt as Timestamp).toDate().toISOString(),
    class_budgets: data.classBudgets as Survey["class_budgets"],
    products: data.products as Product[],
  };
}

export async function listSurveys(roomName: string): Promise<Survey[]> {
  const room = await resolveRoom(roomName);
  if (!room) throw new Error("방을 찾지 못했습니다.");
  const snapshots = await adminDb.collection(`rooms/${room.id}/surveys`).orderBy("createdAt", "desc").get();
  return snapshots.docs.map((snapshot) => toSurvey(snapshot.id, snapshot.data(), room.name));
}

export async function saveTeacherSurvey(uid: string, roomName: string, draft: SurveyDraft): Promise<Survey> {
  let room = await resolveRoom(roomName);
  if (!room) {
    await ensureTeacherRoom(uid, roomName);
    room = await resolveRoom(roomName);
  }
  if (!room) throw new Error("방을 찾지 못했습니다.");
  if (room.ownerUid !== uid) throw new Error("방 관리 권한이 없습니다.");

  const clean = cleanSurveyDraft(draft);
  const surveyId = clean.id ?? randomUUID();
  const products = clean.products.map((product, productIndex) => {
    const productId = product.id ?? randomUUID();
    return {
      id: productId,
      survey_id: surveyId,
      name: product.name,
      sort_order: productIndex,
      price_points: product.pricePoints.map((point, pointIndex) => ({
        id: point.id ?? randomUUID(),
        product_id: productId,
        description: point.description,
        price: point.price,
        sort_order: pointIndex,
      })),
    };
  });
  const surveyRef = adminDb.doc(`rooms/${room.id}/surveys/${surveyId}`);
  const existing = await surveyRef.get();
  const surveyData = {
    title: clean.title,
    classBudgets: clean.classBudgets,
    products,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (existing.exists) {
    await surveyRef.update(surveyData);
  } else {
    await surveyRef.create({ ...surveyData, createdAt: FieldValue.serverTimestamp() });
  }

  if (existing.exists) {
    const productIds = new Set(products.map((product) => product.id));
    const pricePointIds = new Set(products.flatMap((product) => product.price_points.map((point) => point.id)));
    const responses = await surveyRef.collection("responses").get();
    const writer = adminDb.bulkWriter();
    for (const response of responses.docs) {
      const items = (response.get("items") as ResponseItem[] | undefined) ?? [];
      const kept = items.filter((item) => productIds.has(item.product_id) && pricePointIds.has(item.price_point_id));
      if (kept.length !== items.length) {
        writer.update(response.ref, { items: kept, updatedAt: FieldValue.serverTimestamp() });
      }
    }
    await writer.close();
  }

  return toSurvey(surveyId, (await surveyRef.get()).data()!, room.name);
}

export async function deleteTeacherSurvey(uid: string, roomName: string, surveyId: string): Promise<void> {
  const room = await resolveRoom(roomName);
  if (!room) throw new Error("방을 찾지 못했습니다.");
  if (room.ownerUid !== uid) throw new Error("방 관리 권한이 없습니다.");
  const surveyRef = adminDb.doc(`rooms/${room.id}/surveys/${surveyId}`);
  await adminDb.recursiveDelete(surveyRef);
}
