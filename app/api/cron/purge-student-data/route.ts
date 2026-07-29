import { jsonOk } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }

  const { purgeExpiredStudentData } = await import("@/lib/server/retention");
  return jsonOk(await purgeExpiredStudentData());
}
