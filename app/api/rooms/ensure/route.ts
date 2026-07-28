import { jsonError, jsonOk } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const [{ requireTeacher }, { ensureTeacherRoom }] = await Promise.all([
      import("@/lib/server/auth"),
      import("@/lib/server/rooms"),
    ]);
    const teacher = await requireTeacher(request);
    const { name } = (await request.json()) as { name: string };
    return jsonOk(await ensureTeacherRoom(teacher.uid, name), 201);
  } catch (error) {
    return jsonError(error);
  }
}
