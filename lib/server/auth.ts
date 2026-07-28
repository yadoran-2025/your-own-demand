import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebase/admin";

export async function requireUser(request: Request): Promise<DecodedIdToken> {
  const value = request.headers.get("authorization");
  if (!value?.startsWith("Bearer ")) throw new Error("로그인이 필요합니다.");
  return adminAuth.verifyIdToken(value.slice(7));
}

export async function requireTeacher(request: Request): Promise<DecodedIdToken> {
  const token = await requireUser(request);
  if (token.firebase.sign_in_provider === "anonymous") {
    throw new Error("교사 로그인이 필요합니다.");
  }
  return token;
}
