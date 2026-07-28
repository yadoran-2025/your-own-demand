import { beforeEach, describe, expect, it, vi } from "vitest";

const getIdToken = vi.fn().mockResolvedValue("firebase-token");

vi.mock("@/lib/firebase/client", () => ({
  getClientAuth: () => ({ currentUser: { getIdToken } }),
}));

describe("apiFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("adds the Firebase bearer token and surfaces API messages", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "방을 찾지 못했습니다." }), { status: 404 }),
      );
    const { apiFetch } = await import("@/lib/api-client");

    await expect(apiFetch<{ ok: boolean }>("/api/check")).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: "Bearer firebase-token",
      "Content-Type": "application/json",
    });
    await expect(apiFetch("/api/missing")).rejects.toThrow("방을 찾지 못했습니다.");
  });
});
