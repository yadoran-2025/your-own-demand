import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { Product, ResponseItem, StudentProfile, StudentResponse } from "@/lib/types";
import { resolveRoom } from "@/lib/server/rooms";
import { requireEligibleAge } from "@/lib/server/student-policy";

export type QuantityMap = Record<string, number>;

function requireSegment(value: unknown, message: string): asserts value is string {
  if (typeof value !== "string" || !value.trim() || value.includes("/")) throw new Error(message);
}

function requireText(value: unknown, message: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new Error(message);
}

function validateProfile(profile: StudentProfile): void {
  if (!profile || !Number.isInteger(profile.grade) || profile.grade < 1 ||
    !Number.isInteger(profile.class_number) || profile.class_number < 1 ||
    !Number.isInteger(profile.student_number) || profile.student_number < 1 ||
    typeof profile.student_name !== "string" || !profile.student_name.trim()) {
    throw new Error("학생 정보를 확인해 주세요.");
  }
}

function validateProducts(value: unknown): asserts value is Product[] {
  if (!Array.isArray(value) || !value.length || value.some((product) =>
    !product?.id || !Array.isArray(product.price_points) || !product.price_points.length,
  )) throw new Error("설문 가격 구성을 찾지 못했습니다.");
}

function validateQuantities(products: Product[], quantities: unknown, assignments?: unknown): ResponseItem[] {
  if (!quantities || Array.isArray(quantities) || Object.getPrototypeOf(quantities) !== Object.prototype) {
    throw new Error("배정된 가격 구성이 아닙니다.");
  }
  const values = quantities as Record<string, unknown>;
  const assignmentMap = assignments as Record<string, unknown> | undefined;
  if (assignments && (!assignmentMap || Array.isArray(assignmentMap) || Object.getPrototypeOf(assignmentMap) !== Object.prototype)) {
    throw new Error("배정된 가격 구성이 아닙니다.");
  }
  const expected = products.map((product) => {
    const assigned = assignmentMap?.[product.id];
    const pricePointId = typeof assigned === "string" ? assigned : undefined;
    if (assignments && (typeof pricePointId !== "string" || !product.price_points.some((point) => point.id === pricePointId))) {
      throw new Error("배정된 가격 구성이 아닙니다.");
    }
    return { product, pricePointId: pricePointId ?? product.price_points[0].id };
  });
  const allowed = new Set(expected.map(({ pricePointId }) => pricePointId));
  if (Object.keys(values).length !== expected.length || Object.keys(values).some((id) => !allowed.has(id))) {
    throw new Error("배정된 가격 구성이 아닙니다.");
  }
  return expected.map(({ product, pricePointId }) => {
    const quantity = values[pricePointId];
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 0 || quantity > 100) throw new Error("수량을 확인해 주세요.");
    return {
      id: pricePointId,
      response_id: "",
      product_id: product.id,
      price_point_id: pricePointId,
      quantity,
    };
  });
}

function validateBudget(products: Product[], profile: StudentProfile, items: ResponseItem[], budgets: unknown): void {
  if (!Array.isArray(budgets)) throw new Error("설문 예산을 찾지 못했습니다.");
  const budget = budgets.find((item) => item?.grade === profile.grade && item?.class_number === profile.class_number)?.budget;
  if (budget == null) return;
  if (!Number.isFinite(budget)) throw new Error("설문 예산을 찾지 못했습니다.");
  const prices = new Map(products.flatMap((product) => product.price_points.map((point) => [point.id, point.price])));
  if (items.reduce((sum, item) => sum + (prices.get(item.price_point_id) ?? Number.NaN) * item.quantity, 0) > budget) {
    throw new Error("예산을 초과했습니다.");
  }
}

function responseFromSnapshot(snapshot: FirebaseFirestore.QueryDocumentSnapshot): StudentResponse {
  const data = snapshot.data();
  const createdAt = data.createdAt as Timestamp | undefined;
  return {
    id: snapshot.id,
    survey_id: snapshot.ref.parent.parent!.id,
    grade: data.grade,
    class_number: data.classNumber,
    student_number: data.studentNumber,
    student_name: data.studentName,
    created_at: createdAt?.toDate().toISOString() ?? new Date(0).toISOString(),
    response_items: (data.items ?? []) as ResponseItem[],
  };
}

async function surveyRoot(roomName: string, surveyId: string) {
  requireText(roomName, "방 이름을 입력해 주세요.");
  requireSegment(surveyId, "설문을 찾지 못했습니다.");
  const room = await resolveRoom(roomName);
  if (!room) throw new Error("방을 찾지 못했습니다.");
  return { room, surveyRef: adminDb.doc(`rooms/${room.id}/surveys/${surveyId}`) };
}

export async function submitResponseForUser(uid: string, roomName: string, surveyId: string, profile: StudentProfile, quantities: QuantityMap, ageConfirmed: boolean): Promise<string> {
  requireSegment(uid, "로그인이 필요합니다.");
  requireText(roomName, "방 이름을 입력해 주세요.");
  requireSegment(surveyId, "설문을 찾지 못했습니다.");
  requireEligibleAge(ageConfirmed);
  validateProfile(profile);
  const { surveyRef } = await surveyRoot(roomName, surveyId);
  const reservationRef = surveyRef.collection("reservations").doc(uid);
  const responseRef = surveyRef.collection("responses").doc(uid);
  return adminDb.runTransaction(async (transaction) => {
    const [surveySnapshot, reservationSnapshot, responseSnapshot] = await Promise.all([
      transaction.get(surveyRef), transaction.get(reservationRef), transaction.get(responseRef),
    ]);
    if (!surveySnapshot.exists) throw new Error("설문을 찾지 못했습니다.");
    if (responseSnapshot.exists) throw new Error("이미 응답했습니다.");
    const reservation = reservationSnapshot.data();
    if (!reservation || reservation.consumedAt != null || !(reservation.expiresAt instanceof Timestamp) || reservation.expiresAt.toMillis() <= Date.now()) {
      throw new Error("배정 시간이 만료되었습니다.");
    }
    if (reservation.submitterUid !== uid || reservation.grade !== profile.grade || reservation.classNumber !== profile.class_number ||
      reservation.studentNumber !== profile.student_number || reservation.studentName !== profile.student_name.trim()) {
      throw new Error("학생 정보를 확인해 주세요.");
    }
    const products = surveySnapshot.get("products");
    validateProducts(products);
    const items = validateQuantities(products, quantities, reservation.assignments).map((item) => ({ ...item, response_id: uid }));
    validateBudget(products, profile, items, surveySnapshot.get("classBudgets"));
    transaction.create(responseRef, {
      submitterUid: uid,
      grade: profile.grade,
      classNumber: profile.class_number,
      studentNumber: profile.student_number,
      studentName: profile.student_name.trim(),
      items,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(reservationRef, { consumedAt: FieldValue.serverTimestamp() });
    return uid;
  });
}

export async function listResponsesForUser(actor: { uid: string; isTeacher: boolean }, roomName: string, surveyId: string, revealResponseId?: string | null): Promise<StudentResponse[]> {
  requireSegment(actor?.uid, "로그인이 필요합니다.");
  if (revealResponseId) requireSegment(revealResponseId, "응답을 찾지 못했습니다.");
  const { room, surveyRef } = await surveyRoot(roomName, surveyId);
  if (actor.isTeacher && room.ownerUid !== actor.uid) throw new Error("방 관리 권한이 없습니다.");
  const survey = await surveyRef.get();
  if (!survey.exists) throw new Error("설문을 찾지 못했습니다.");
  const snapshots = await surveyRef.collection("responses").orderBy("createdAt", "desc").get();
  const usedIds = new Set(snapshots.docs.map((snapshot) => snapshot.id));
  return snapshots.docs.map((snapshot, index) => {
    const response = responseFromSnapshot(snapshot);
    if (!actor.isTeacher && !(snapshot.id === revealResponseId && snapshot.get("submitterUid") === actor.uid)) {
      let id = `redacted-${index}`;
      for (let suffix = index; usedIds.has(id); suffix += 1) id = `redacted-${suffix + 1}`;
      usedIds.add(id);
      return {
        ...response,
        id,
        student_name: "",
        student_number: 0,
        response_items: response.response_items.map((item) => ({ ...item, response_id: id })),
      };
    }
    return response;
  });
}

export async function updateTeacherResponse(teacherUid: string, roomName: string, surveyId: string, responseId: string, profile: StudentProfile, quantities: QuantityMap): Promise<void> {
  requireSegment(teacherUid, "교사 권한이 필요합니다.");
  requireSegment(responseId, "응답을 찾지 못했습니다.");
  validateProfile(profile);
  const { room, surveyRef } = await surveyRoot(roomName, surveyId);
  if (room.ownerUid !== teacherUid) throw new Error("방 관리 권한이 없습니다.");
  const responseRef = surveyRef.collection("responses").doc(responseId);
  await adminDb.runTransaction(async (transaction) => {
    const [surveySnapshot, responseSnapshot] = await Promise.all([transaction.get(surveyRef), transaction.get(responseRef)]);
    if (!surveySnapshot.exists || !responseSnapshot.exists) throw new Error("응답을 찾지 못했습니다.");
    const products = surveySnapshot.get("products");
    validateProducts(products);
    const current = (responseSnapshot.get("items") as ResponseItem[] | undefined) ?? [];
    const assignments = Object.fromEntries(current.map((item) => [item.product_id, item.price_point_id]));
    const items = validateQuantities(products, quantities, assignments).map((item) => ({ ...item, response_id: responseId }));
    validateBudget(products, profile, items, surveySnapshot.get("classBudgets"));
    transaction.update(responseRef, {
      grade: profile.grade,
      classNumber: profile.class_number,
      studentNumber: profile.student_number,
      studentName: profile.student_name.trim(),
      items,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function deleteTeacherResponse(teacherUid: string, roomName: string, surveyId: string, responseId: string): Promise<void> {
  requireSegment(teacherUid, "교사 권한이 필요합니다.");
  requireSegment(responseId, "응답을 찾지 못했습니다.");
  const { room, surveyRef } = await surveyRoot(roomName, surveyId);
  if (room.ownerUid !== teacherUid) throw new Error("방 관리 권한이 없습니다.");
  const responseRef = surveyRef.collection("responses").doc(responseId);
  await adminDb.runTransaction(async (transaction) => {
    const [surveySnapshot, responseSnapshot] = await Promise.all([transaction.get(surveyRef), transaction.get(responseRef)]);
    if (!surveySnapshot.exists || !responseSnapshot.exists) throw new Error("응답을 찾지 못했습니다.");
    transaction.delete(responseRef);
  });
}
