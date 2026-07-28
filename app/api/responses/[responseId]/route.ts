import type { QuantityMap, StudentProfile } from "@/lib/types";
import { jsonError, jsonOk } from "@/lib/server/http";

type UpdateBody = { roomName: string; surveyId: string; profile: StudentProfile; quantities: QuantityMap };

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ responseId: string }> }) {
  try {
    const [{ requireTeacher }, { updateTeacherResponse }] = await Promise.all([
      import("@/lib/server/auth"), import("@/lib/server/responses"),
    ]);
    const teacher = await requireTeacher(request);
    const body = await request.json() as UpdateBody;
    await updateTeacherResponse(teacher.uid, body?.roomName, body?.surveyId, (await params).responseId, body?.profile, body?.quantities);
    return jsonOk({});
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ responseId: string }> }) {
  try {
    const [{ requireTeacher }, { deleteTeacherResponse }] = await Promise.all([
      import("@/lib/server/auth"), import("@/lib/server/responses"),
    ]);
    const teacher = await requireTeacher(request);
    const query = new URL(request.url).searchParams;
    await deleteTeacherResponse(teacher.uid, query.get("room") ?? "", query.get("surveyId") ?? "", (await params).responseId);
    return jsonOk({});
  } catch (error) {
    return jsonError(error);
  }
}
