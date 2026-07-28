import { beforeEach, describe, expect, it, vi } from "vitest";

const getIdToken = vi.fn().mockResolvedValue("firebase-token");
const auth = {
  currentUser: { getIdToken },
};

vi.mock("@/lib/firebase/client", () => ({
  getClientAuth: () => auth,
}));

describe("apiFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    auth.currentUser = { getIdToken };
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
    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer firebase-token");
    expect(headers.get("Content-Type")).toBe("application/json");
    await expect(apiFetch("/api/missing")).rejects.toThrow("방을 찾지 못했습니다.");
  });

  it("preserves Headers input but cannot be given a spoofed authorization", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const { apiFetch } = await import("@/lib/api-client");
    await apiFetch("/api/check", {
      headers: new Headers({
        Authorization: "Bearer attacker-token",
        "X-Request-ID": "request-1",
      }),
    });
    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer firebase-token");
    expect(headers.get("X-Request-ID")).toBe("request-1");
  });

  it("rejects before fetch when no Firebase user exists", async () => {
    auth.currentUser = null as never;
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const { apiFetch } = await import("@/lib/api-client");
    await expect(apiFetch("/api/check")).rejects.toThrow("로그인이 필요합니다.");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
