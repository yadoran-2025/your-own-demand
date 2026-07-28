import { beforeEach, expect, it, vi } from "vitest";

const { verifyIdToken } = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: { verifyIdToken },
}));

beforeEach(() => verifyIdToken.mockReset());

function bearerRequest() {
  return new Request("http://localhost/api/test", {
    headers: { Authorization: "Bearer test-token" },
  });
}

it("classifies a rejected Firebase token as 401", async () => {
  verifyIdToken.mockRejectedValueOnce(new Error("auth/id-token-expired"));
  const { requireUser } = await import("@/lib/server/auth");
  await expect(requireUser(bearerRequest())).rejects.toMatchObject({
    message: "유효한 로그인이 필요합니다.",
    status: 401,
  });
});

it.each([
  { firebase: { sign_in_provider: "anonymous" }, uid: "student" },
  { firebase: {}, uid: "missing-provider" },
])("classifies a non-teacher token as 403: %j", async (token) => {
  verifyIdToken.mockResolvedValue(token);
  const { requireTeacher } = await import("@/lib/server/auth");
  await expect(requireTeacher(bearerRequest())).rejects.toMatchObject({
    message: "교사 권한이 필요합니다.",
    status: 403,
  });
});

it("accepts a verified non-anonymous teacher", async () => {
  const teacher = {
    firebase: { sign_in_provider: "google.com" },
    uid: "teacher",
  };
  verifyIdToken.mockResolvedValue(teacher);
  const { requireTeacher } = await import("@/lib/server/auth");
  await expect(requireTeacher(bearerRequest())).resolves.toBe(teacher);
});

it("uses an explicit HttpError status in the JSON response", async () => {
  const { HttpError, jsonError } = await import("@/lib/server/http");
  const response = jsonError(new HttpError(403, "교사 권한이 필요합니다."));
  expect(response.status).toBe(403);
  await expect(response.json()).resolves.toEqual({
    error: "교사 권한이 필요합니다.",
  });
});
