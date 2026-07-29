import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { purgeExpiredStudentData } = vi.hoisted(() => ({
  purgeExpiredStudentData: vi.fn(),
}));

vi.mock("@/lib/server/retention", () => ({
  purgeExpiredStudentData,
}));

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "test-cron-secret");
  purgeExpiredStudentData.mockResolvedValue({
    cutoff: "2027-01-31T15:00:00.000Z",
    responsesDeleted: 2,
    reservationsDeleted: 2,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

it("rejects a request without the cron bearer secret", async () => {
  const { GET } = await import("@/app/api/cron/purge-student-data/route");
  const response = await GET(
    new Request("http://localhost/api/cron/purge-student-data"),
  );

  expect(response.status).toBe(401);
  expect(purgeExpiredStudentData).not.toHaveBeenCalled();
});

it("fails closed when the cron secret is missing", async () => {
  vi.stubEnv("CRON_SECRET", "");
  const { GET } = await import("@/app/api/cron/purge-student-data/route");
  const response = await GET(
    new Request("http://localhost/api/cron/purge-student-data", {
      headers: { authorization: "Bearer test-cron-secret" },
    }),
  );

  expect(response.status).toBe(401);
  expect(purgeExpiredStudentData).not.toHaveBeenCalled();
});

it("runs the purge for Vercel's authenticated request", async () => {
  const { GET } = await import("@/app/api/cron/purge-student-data/route");
  const response = await GET(
    new Request("http://localhost/api/cron/purge-student-data", {
      headers: { authorization: "Bearer test-cron-secret" },
    }),
  );

  expect(response.status).toBe(200);
  expect(purgeExpiredStudentData).toHaveBeenCalledOnce();
  await expect(response.json()).resolves.toMatchObject({
    responsesDeleted: 2,
    reservationsDeleted: 2,
  });
});
