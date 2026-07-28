import { createHash, randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { RoomDocument } from "@/lib/firebase/documents";

export function normalizeRoomName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function roomLookupId(value: string) {
  return createHash("sha256").update(normalizeRoomName(value)).digest("hex");
}

export async function ensureTeacherRoom(uid: string, name: string) {
  const normalizedName = normalizeRoomName(name);
  if (!normalizedName) throw new Error("방 이름을 입력해 주세요.");
  const lookupRef = adminDb.doc(`roomNames/${roomLookupId(normalizedName)}`);

  return adminDb.runTransaction(async (transaction) => {
    const lookup = await transaction.get(lookupRef);
    if (lookup.exists) {
      const roomId = lookup.get("roomId") as string;
      const room = await transaction.get(adminDb.doc(`rooms/${roomId}`));
      if (room.get("ownerUid") !== uid) {
        throw new Error("이미 다른 교사가 사용 중인 방 이름입니다.");
      }
      return { roomId, name: room.get("name") as string };
    }
    const roomId = randomUUID();
    transaction.create(adminDb.doc(`rooms/${roomId}`), {
      ownerUid: uid,
      name: normalizedName,
      normalizedName,
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.create(lookupRef, { roomId });
    return { roomId, name: normalizedName };
  });
}

export async function resolveRoom(name: string) {
  const lookup = await adminDb.doc(`roomNames/${roomLookupId(name)}`).get();
  if (!lookup.exists) return null;
  const room = await adminDb.doc(`rooms/${lookup.get("roomId") as string}`).get();
  return room.exists ? { id: room.id, ...(room.data() as RoomDocument) } : null;
}
