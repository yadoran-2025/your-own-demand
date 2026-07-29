import type { QuantityMap, StudentProfile } from "@/lib/types";
import { jsonError, jsonOk } from "@/lib/server/http";

type SubmitBody = { roomName: string; surveyId: string; profile: StudentProfile; quantities: QuantityMap; ageConfirmed: boolean };

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const [{ requireUser, requireTeacher }, { listResponsesForUser }] = await Promise.all([
      import("@/lib/server/auth"), import("@/lib/server/responses"),
    ]);
    const token = await requireUser(request);
    const isTeacher = token.firebase?.sign_in_provider != null && token.firebase.sign_in_provider !== "anonymous";
    if (isTeacher) await requireTeacher(request);
    const query = new URL(request.url).searchParams;
    return jsonOk(await listResponsesForUser({ uid: token.uid, isTeacher }, query.get("room") ?? "", query.get("surveyId") ?? "", query.get("reveal")));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const [{ requireUser }, { submitResponseForUser }] = await Promise.all([
      import("@/lib/server/auth"), import("@/lib/server/responses"),
    ]);
    const token = await requireUser(request);
    const body = await request.json() as SubmitBody;
    return jsonOk({ id: await submitResponseForUser(token.uid, body?.roomName, body?.surveyId, body?.profile, body?.quantities, body?.ageConfirmed) }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
