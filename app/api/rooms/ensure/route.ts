import { jsonError, jsonOk } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const [
      { requireTeacher },
      { ensureTeacherRoom },
      { listSurveys },
    ] = await Promise.all([
      import("@/lib/server/auth"),
      import("@/lib/server/rooms"),
      import("@/lib/server/surveys"),
    ]);
    const teacher = await requireTeacher(request);
    const { name } = (await request.json()) as { name: string };
    const room = await ensureTeacherRoom(teacher.uid, name);
    return jsonOk(await listSurveys(room.name), 201);
  } catch (error) {
    return jsonError(error);
  }
}
