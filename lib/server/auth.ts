import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebase/admin";
import { HttpError } from "@/lib/server/http";

export async function requireUser(request: Request): Promise<DecodedIdToken> {
  const value = request.headers.get("authorization");
  if (!value?.startsWith("Bearer ")) {
    throw new HttpError(401, "로그인이 필요합니다.");
  }
  try {
    return await adminAuth.verifyIdToken(value.slice(7));
  } catch {
    throw new HttpError(401, "유효한 로그인이 필요합니다.");
  }
}

export async function requireTeacher(request: Request): Promise<DecodedIdToken> {
  const token = await requireUser(request);
  const provider = token.firebase?.sign_in_provider;
  if (!provider || provider === "anonymous") {
    throw new HttpError(403, "교사 권한이 필요합니다.");
  }
  return token;
}
