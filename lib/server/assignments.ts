import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { Product, StudentProfile } from "@/lib/types";
import { resolveRoom } from "@/lib/server/rooms";

type AssignmentState = { nextByProduct: Record<string, number> };

const RESERVATION_DURATION_MS = 30 * 60 * 1000;

function requirePathSegment(value: unknown, message: string): asserts value is string {
  if (typeof value !== "string" || !value.trim() || value.includes("/")) throw new Error(message);
}

function requireText(value: unknown, message: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new Error(message);
}

function validateProfile(profile: StudentProfile): void {
  if (!Number.isInteger(profile?.grade) || profile.grade < 1 ||
    !Number.isInteger(profile?.class_number) || profile.class_number < 1 ||
    !Number.isInteger(profile?.student_number) || profile.student_number < 1 ||
    typeof profile?.student_name !== "string" || !profile.student_name.trim()) {
    throw new Error("학생 정보를 확인해 주세요.");
  }
}

function validateProducts(products: unknown): asserts products is Product[] {
  if (!Array.isArray(products) || !products.length || products.some((product) =>
    !product?.id || !Array.isArray(product.price_points) || !product.price_points.length,
  )) {
    throw new Error("설문 가격 구성을 찾지 못했습니다.");
  }
}

export async function reserveAssignmentsForUser(
  uid: string,
  roomName: string,
  surveyId: string,
  profile: StudentProfile,
): Promise<Record<string, string>> {
  requirePathSegment(uid, "로그인이 필요합니다.");
  requireText(roomName, "방 이름을 입력해 주세요.");
  requirePathSegment(surveyId, "설문을 찾지 못했습니다.");
  validateProfile(profile);

  const room = await resolveRoom(roomName);
  if (!room) throw new Error("방을 찾지 못했습니다.");

  const surveyRef = adminDb.doc(`rooms/${room.id}/surveys/${surveyId}`);
  const reservationRef = surveyRef.collection("reservations").doc(uid);
  const stateRef = surveyRef.collection("assignmentStates").doc(`${profile.grade}-${profile.class_number}`);

  return adminDb.runTransaction(async (transaction) => {
    const [surveySnapshot, reservationSnapshot, stateSnapshot] = await Promise.all([
      transaction.get(surveyRef),
      transaction.get(reservationRef),
      transaction.get(stateRef),
    ]);
    if (!surveySnapshot.exists) throw new Error("설문을 찾지 못했습니다.");

    const existing = reservationSnapshot.data();
    if (existing && existing.consumedAt == null && existing.expiresAt instanceof Timestamp && existing.expiresAt.toMillis() > Date.now() &&
      existing.assignments && typeof existing.assignments === "object") {
      return existing.assignments as Record<string, string>;
    }

    const products = surveySnapshot.get("products");
    validateProducts(products);
    const state = (stateSnapshot.data() as AssignmentState | undefined) ?? { nextByProduct: {} };
    const nextByProduct = { ...(state.nextByProduct ?? {}) };
    const assignments: Record<string, string> = {};
    for (const product of [...products].sort((left, right) => left.sort_order - right.sort_order)) {
      const points = [...product.price_points].sort((left, right) => left.sort_order - right.sort_order);
      const next = Number.isSafeInteger(nextByProduct[product.id]) && nextByProduct[product.id] >= 0
        ? nextByProduct[product.id]
        : 0;
      assignments[product.id] = points[next % points.length].id;
      nextByProduct[product.id] = next + 1;
    }

    transaction.set(stateRef, { nextByProduct });
    transaction.set(reservationRef, {
      submitterUid: uid,
      grade: profile.grade,
      classNumber: profile.class_number,
      studentNumber: profile.student_number,
      studentName: profile.student_name.trim(),
      assignments,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + RESERVATION_DURATION_MS),
      consumedAt: null,
    });
    return assignments;
  });
}
