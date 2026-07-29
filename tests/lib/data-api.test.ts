import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-client", () => ({ apiFetch: vi.fn() }));

const survey = {
  id: "survey-1",
  title: "설문",
  created_at: "2026-01-01T00:00:00.000Z",
  class_budgets: [],
  products: [
    {
      id: "product-1",
      survey_id: "survey-1",
      name: "상품",
      sort_order: 0,
      price_points: [
        {
          id: "price-1",
          product_id: "product-1",
          description: "가격",
          price: 1000,
          sort_order: 0,
        },
      ],
    },
  ],
};

const profile = {
  grade: 1,
  class_number: 2,
  student_number: 3,
  student_name: "학생",
};

describe("data API adapter", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "project");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("passes room name when deleting a survey", async () => {
    const { apiFetch } = await import("@/lib/api-client");
    const { deleteSurvey } = await import("@/lib/data");
    await deleteSurvey("survey-1", "경제 1반");
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/surveys/survey-1?room=%EA%B2%BD%EC%A0%9C%201%EB%B0%98",
      { method: "DELETE" },
    );
  });

  it("uses route payloads and unwraps route results", async () => {
    const { apiFetch } = await import("@/lib/api-client");
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ assignments: { "product-1": "price-1" } })
      .mockResolvedValueOnce({ id: "student-1" });
    const { reserveAssignments, submitResponse } = await import("@/lib/data");

    await expect(reserveAssignments(survey, profile, "경제 1반", true)).resolves.toEqual({
      "product-1": "price-1",
    });
    await expect(
      submitResponse(survey, profile, { "price-1": 2 }, "경제 1반", true),
    ).resolves.toBe("student-1");
    expect(apiFetch).toHaveBeenNthCalledWith(1, "/api/assignments/reserve", {
      method: "POST",
      body: JSON.stringify({
        roomName: "경제 1반",
        surveyId: "survey-1",
        profile: { ...profile, student_number: 1 },
        ageConfirmed: true,
      }),
    });
    expect(apiFetch).toHaveBeenNthCalledWith(2, "/api/responses", {
      method: "POST",
      body: JSON.stringify({
        roomName: "경제 1반",
        surveyId: "survey-1",
        profile,
        quantities: { "price-1": 2 },
        ageConfirmed: true,
      }),
    });
  });

  it("initializes an existing remote room with one API request", async () => {
    const { apiFetch } = await import("@/lib/api-client");
    vi.mocked(apiFetch).mockResolvedValueOnce([survey]);
    const { ensureRoomHasDefaultSurveys } = await import("@/lib/data");

    await expect(
      ensureRoomHasDefaultSurveys(" 경제 1반 "),
    ).resolves.toEqual([survey]);

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith("/api/rooms/ensure", {
      method: "POST",
      body: JSON.stringify({ name: "경제 1반" }),
    });
  });

  it("creates one default only when the ensured remote room is empty", async () => {
    const { apiFetch } = await import("@/lib/api-client");
    vi.mocked(apiFetch)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(survey);
    const { ensureRoomHasDefaultSurveys } = await import("@/lib/data");

    await expect(
      ensureRoomHasDefaultSurveys("경제 1반"),
    ).resolves.toEqual([survey]);

    expect(apiFetch).toHaveBeenCalledTimes(2);
    const [savePath, saveInit] = vi.mocked(apiFetch).mock.calls[1];
    expect(savePath).toBe("/api/surveys");
    expect(saveInit).toMatchObject({ method: "POST" });
    expect(JSON.parse(saveInit?.body as string)).toMatchObject({
      roomName: "경제 1반",
      draft: {
        title: "2026 경제 수요설문",
        classBudgets: [],
        products: expect.any(Array),
      },
    });
  });

  it("uses teacher-scoped survey and response mutations", async () => {
    const { apiFetch } = await import("@/lib/api-client");
    vi.mocked(apiFetch)
      .mockResolvedValueOnce([survey])
      .mockResolvedValueOnce(survey)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    const {
      ensureRoomHasDefaultSurveys,
      saveSurvey,
      updateStudentResponse,
      deleteStudentResponse,
    } = await import("@/lib/data");

    await ensureRoomHasDefaultSurveys("경제 1반");
    await saveSurvey({ title: "설문", classBudgets: [], products: [{ name: "상품", pricePoints: [{ description: "가격", price: 1000 }] }] }, "경제 1반");
    await updateStudentResponse("survey-1", "response-1", profile, { "price-1": 2 }, "경제 1반");
    await deleteStudentResponse("survey-1", "response-1", "경제 1반");

    expect(apiFetch).toHaveBeenNthCalledWith(1, "/api/rooms/ensure", {
      method: "POST",
      body: JSON.stringify({ name: "경제 1반" }),
    });
    expect(apiFetch).toHaveBeenNthCalledWith(2, "/api/surveys", {
      method: "POST",
      body: JSON.stringify({
        roomName: "경제 1반",
        draft: { title: "설문", classBudgets: [], products: [{ name: "상품", pricePoints: [{ description: "가격", price: 1000 }] }] },
      }),
    });
    expect(apiFetch).toHaveBeenNthCalledWith(3, "/api/responses/response-1", {
      method: "PATCH",
      body: JSON.stringify({ roomName: "경제 1반", surveyId: "survey-1", profile, quantities: { "price-1": 2 } }),
    });
    expect(apiFetch).toHaveBeenNthCalledWith(
      4,
      "/api/responses/response-1?room=%EA%B2%BD%EC%A0%9C%201%EB%B0%98&surveyId=survey-1",
      { method: "DELETE" },
    );
  });

  it("scopes survey and response routes, including a student reveal", async () => {
    const { apiFetch } = await import("@/lib/api-client");
    vi.mocked(apiFetch).mockResolvedValue([]);
    const { fetchResponses, fetchSurveys } = await import("@/lib/data");

    await fetchSurveys("경제 1반", true);
    await fetchResponses("survey/1", false, "경제 1반", "response/1");

    expect(apiFetch).toHaveBeenNthCalledWith(
      1,
      "/api/surveys?room=%EA%B2%BD%EC%A0%9C%201%EB%B0%98",
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      2,
      "/api/responses?room=%EA%B2%BD%EC%A0%9C%201%EB%B0%98&surveyId=survey%2F1&reveal=response%2F1",
    );
  });

  it("redacts other-class identities in local student results", async () => {
    const values = new Map<string, string>();
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "");
    vi.stubGlobal("window", {
      localStorage: {
        get length() {
          return values.size;
        },
        getItem: (key: string) => values.get(key) ?? null,
        key: (index: number) => Array.from(values.keys())[index] ?? null,
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
    values.set(
      "demand-app-responses",
      JSON.stringify([
        { ...profile, id: "student-a", survey_id: "survey-1", created_at: "2026-07-29T00:00:00.000Z", response_items: [] },
        { ...profile, student_name: "같은반", id: "student-b", survey_id: "survey-1", created_at: "2026-07-29T00:00:00.000Z", response_items: [] },
        { ...profile, class_number: 3, student_name: "다른반", id: "student-c", survey_id: "survey-1", created_at: "2026-07-29T00:00:00.000Z", response_items: [] },
        { ...profile, student_number: 4, id: "student-d", survey_id: "survey-1", created_at: "2026-07-29T00:00:00.000Z", response_items: [] },
      ]),
    );
    values.set(
      "demand-app-student-submission:room:survey-1",
      JSON.stringify({
        profile,
        response_id: "student-a",
        submitted_at: "2026-07-29T00:00:00.000Z",
      }),
    );

    const { buildAssignmentStorageKey } = await import("@/lib/assignments");
    const { fetchResponses, reserveAssignments } = await import("@/lib/data");
    const responses = await fetchResponses("survey-1", false, "room", "student-c");

    expect(responses.find((response) => response.student_name === "같은반")).toBeDefined();
    expect(responses.some((response) => response.student_name === "다른반")).toBe(false);
    expect(responses.every((response) => response.student_number === 0)).toBe(true);

    values.set(
      "demand-app-student-submission:room:survey-1",
      JSON.stringify({
        profile,
        response_id: "student-d",
        submitted_at: "2026-07-29T00:00:00.000Z",
      }),
    );
    const swappedResponses = await fetchResponses("survey-1", false, "room", "student-d");
    expect(swappedResponses.some((response) => response.student_name === "같은반")).toBe(false);
    expect(swappedResponses.every((response) => response.student_number === 0)).toBe(true);

    await reserveAssignments(survey, profile, "room", true);
    expect(JSON.parse(values.get(buildAssignmentStorageKey("survey-1", profile)) ?? "{}")).toMatchObject({
      assignments: { "product-1": "price-1" },
      stored_at: expect.any(String),
    });
  });
});
