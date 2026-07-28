import "server-only";

import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID ?? "inflation-2e38b";
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

if (!emulator && (!process.env.FIREBASE_CLIENT_EMAIL || !privateKey)) {
  throw new Error("Firebase Admin environment variables are missing.");
}

const app = getApps().length
  ? getApp()
  : initializeApp(
      emulator
        ? { projectId }
        : {
            credential: cert({
              projectId,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
              privateKey: privateKey!,
            }),
          },
    );

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
