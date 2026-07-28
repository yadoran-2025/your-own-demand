process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_PROJECT_ID = "inflation-2e38b";

export async function clearFirebaseTestData() {
  const { adminDb } = await import("@/lib/firebase/admin");
  await Promise.all([
    adminDb.recursiveDelete(adminDb.collection("roomNames")),
    adminDb.recursiveDelete(adminDb.collection("rooms")),
  ]);
}
