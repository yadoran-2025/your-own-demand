import type { SurveyDraft } from "@/lib/types";
import { jsonError, jsonOk } from "@/lib/server/http";

type SurveyWriteBody = { roomName: string; draft: SurveyDraft };

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const [{ requireUser }, { listSurveys }] = await Promise.all([
      import("@/lib/server/auth"),
      import("@/lib/server/surveys"),
    ]);
    await requireUser(request);
    return jsonOk(await listSurveys(new URL(request.url).searchParams.get("room") ?? ""));
  } catch (error) {
    return jsonError(error);
  }
}

async function save(request: Request, status = 200) {
  try {
    const [{ requireTeacher }, { saveTeacherSurvey }] = await Promise.all([
      import("@/lib/server/auth"),
      import("@/lib/server/surveys"),
    ]);
    const teacher = await requireTeacher(request);
    const { roomName, draft } = await request.json() as SurveyWriteBody;
    return jsonOk(await saveTeacherSurvey(teacher.uid, roomName, draft), status);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  return save(request, 201);
}

export async function PATCH(request: Request) {
  return save(request);
}
