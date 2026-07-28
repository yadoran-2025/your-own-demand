import { jsonError, jsonOk } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
  try {
    const [{ requireTeacher }, { deleteTeacherSurvey }] = await Promise.all([
      import("@/lib/server/auth"),
      import("@/lib/server/surveys"),
    ]);
    const teacher = await requireTeacher(request);
    const { surveyId } = await params;
    await deleteTeacherSurvey(teacher.uid, new URL(request.url).searchParams.get("room") ?? "", surveyId);
    return jsonOk({});
  } catch (error) {
    return jsonError(error);
  }
}
