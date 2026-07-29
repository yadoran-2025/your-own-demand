import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { latestFebruaryFirstCutoff } from "@/lib/retention";

async function deleteBefore(
  collectionId: "responses" | "reservations",
  cutoff: Timestamp,
) {
  const snapshots = await adminDb
    .collectionGroup(collectionId)
    .where("createdAt", "<", cutoff)
    .get();
  const writer = adminDb.bulkWriter();
  for (const snapshot of snapshots.docs) {
    writer.delete(snapshot.ref);
  }
  await writer.close();
  return snapshots.size;
}

export async function purgeExpiredStudentData(now = new Date()) {
  const cutoffDate = latestFebruaryFirstCutoff(now);
  const cutoff = Timestamp.fromDate(cutoffDate);
  const [responsesDeleted, reservationsDeleted] = await Promise.all([
    deleteBefore("responses", cutoff),
    deleteBefore("reservations", cutoff),
  ]);

  return {
    cutoff: cutoffDate.toISOString(),
    responsesDeleted,
    reservationsDeleted,
  };
}
