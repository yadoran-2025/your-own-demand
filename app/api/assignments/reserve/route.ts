import type { StudentProfile } from "@/lib/types";
import { jsonError, jsonOk } from "@/lib/server/http";

type ReserveBody = {
  roomName: string;
  surveyId: string;
  profile: StudentProfile;
  ageConfirmed: boolean;
};

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const [{ requireUser }, { reserveAssignmentsForUser }] = await Promise.all([
      import("@/lib/server/auth"),
      import("@/lib/server/assignments"),
    ]);
    const token = await requireUser(request);
    const body = await request.json() as ReserveBody;
    const assignments = await reserveAssignmentsForUser(token.uid, body?.roomName, body?.surveyId, body?.profile, body?.ageConfirmed);
    return jsonOk({ assignments });
  } catch (error) {
    return jsonError(error);
  }
}
