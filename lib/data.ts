"use client";

import { apiFetch } from "./api-client";
import {
  buildAssignmentSeed,
  buildAssignmentStorageKey,
  buildBalancedAssignments,
  hasCompleteAssignments,
  isAssignmentMap,
  type AssignmentMap,
} from "./assignments";
import { readStoredStudentSubmission } from "./studentResultProfile";
import type {
  ClassBudget,
  QuantityMap,
  StudentProfile,
  StudentResponse,
  Survey,
  SurveyDraft,
} from "./types";
import { makeId } from "./utils";
import { isBeforeAnnualCutoff } from "./retention";

const SURVEYS_KEY = "demand-app-surveys";
const RESPONSES_KEY = "demand-app-responses";

type DbPricePoint = {
  id: string;
  product_id: string;
  description: string | null;
  price: number;
  sort_order: number;
};

type DbProduct = {
  id: string;
  survey_id: string;
  name: string;
  sort_order: number;
  price_points?: DbPricePoint[] | null;
};

type DbClassBudget = ClassBudget & {
  id: string;
  survey_id: string;
};

type DbSurvey = {
  id: string;
  title: string;
  teacher_pin: string | null;
  created_at: string;
  class_budgets?: DbClassBudget[] | null;
  products: DbProduct[];
};

export const hasRemoteDatabase = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
);

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

function writeLocal<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function redactOtherClassRespondents(
  responses: StudentResponse[],
  viewer: StudentProfile | null,
  ownResponseId?: string | null,
) {
  const ownResponse = ownResponseId
    ? responses.find((response) => response.id === ownResponseId)
    : null;
  const verifiedViewer = Boolean(
    viewer &&
      ownResponse &&
      ownResponse.grade === viewer.grade &&
      ownResponse.class_number === viewer.class_number &&
      ownResponse.student_number === viewer.student_number &&
      ownResponse.student_name === viewer.student_name,
  );
  const usedIds = new Set(responses.map((response) => response.id));
  return responses.map((response, index) => {
    let id = `redacted-${index}`;
    if (!verifiedViewer || response.id !== ownResponseId) {
      for (let suffix = index; usedIds.has(id); suffix += 1) id = `redacted-${suffix + 1}`;
      usedIds.add(id);
    } else {
      id = response.id;
    }
    const sameClass = Boolean(verifiedViewer && viewer &&
      response.grade === viewer.grade &&
      response.class_number === viewer.class_number);
    return {
      ...response,
      id,
      student_name: sameClass ? response.student_name : "",
      student_number: 0,
      response_items: response.response_items.map((item) => ({ ...item, response_id: id })),
    };
  });
}

function readStoredAssignments(raw: string | null, now = new Date()) {
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    if (
      !parsed?.assignments ||
      !isAssignmentMap(parsed.assignments) ||
      typeof parsed.stored_at !== "string" ||
      !Number.isFinite(new Date(parsed.stored_at).getTime()) ||
      isBeforeAnnualCutoff(parsed.stored_at, now)
    ) {
      return null;
    }
    return parsed.assignments as AssignmentMap;
  } catch {
    return null;
  }
}

function readCurrentLocalResponses() {
  const responses = readLocal<StudentResponse[]>(RESPONSES_KEY, []);
  const current = responses.filter((response) =>
    !isBeforeAnnualCutoff(response.created_at, new Date()),
  );
  if (current.length !== responses.length) writeLocal(RESPONSES_KEY, current);
  return current;
}

function normalizeSurvey(survey: DbSurvey): Survey {
  return {
    ...survey,
    class_budgets: normalizeClassBudgets(survey.class_budgets ?? []),
    products: [...(survey.products ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((product) => ({
        ...product,
        price_points: [...(product.price_points ?? [])]
          .sort((a, b) => a.sort_order - b.sort_order || a.price - b.price)
          .map((pricePoint) => ({
            ...pricePoint,
            description: pricePoint.description ?? "",
          })),
      })),
  };
}

function normalizeClassBudgets(classBudgets: ClassBudget[]) {
  const budgetMap = new Map<string, ClassBudget>();

  for (const classBudget of classBudgets) {
    const grade = Number(classBudget.grade);
    const classNumber = Number(classBudget.class_number);
    const budget = Number(classBudget.budget);

    if (
      !Number.isInteger(grade) ||
      grade <= 0 ||
      !Number.isInteger(classNumber) ||
      classNumber <= 0 ||
      !Number.isFinite(budget) ||
      budget <= 0
    ) {
      continue;
    }

    budgetMap.set(`${grade}-${classNumber}`, {
      grade,
      class_number: classNumber,
      budget: Math.round(budget),
    });
  }

  return Array.from(budgetMap.values()).sort(
    (a, b) => a.grade - b.grade || a.class_number - b.class_number,
  );
}

function findClassBudget(survey: Survey, profile: StudentProfile) {
  return (survey.class_budgets ?? []).find(
    (classBudget) =>
      classBudget.grade === profile.grade &&
      classBudget.class_number === profile.class_number,
  );
}

function calculateSpentAmount(survey: Survey, quantities: QuantityMap) {
  const priceById = new Map(
    survey.products.flatMap((product) =>
      product.price_points.map((pricePoint) => [pricePoint.id, pricePoint.price]),
    ),
  );

  return Object.entries(quantities).reduce((sum, [pricePointId, quantity]) => {
    const price = priceById.get(pricePointId) ?? 0;
    return sum + price * (Number(quantity) || 0);
  }, 0);
}

export function createDefaultDraft(): SurveyDraft {
  return {
    title: "2026 경제 수요설문",
    classBudgets: [],
    products: [
      {
        name: "아침을 먹지 않고 나왔는데 뚜레쥬르에서 갓 구운 빵의 향이 난다.",
        pricePoints: [
          { description: "사장님이 미쳤어요, 빵 한 개당 500원", price: 500 },
          { description: "빵 1+1 이벤트로, 개당 가격이 1000원", price: 1000 },
          { description: "갓 구운 빵이 개당 2000원", price: 2000 },
          { description: "밀가루 가격 실화..? 빵 한 개당 가격이", price: 4000 },
        ],
      },
      {
        name: "학교 끝나고 달달한 게 땡기는데 보인 메가커피,",
        pricePoints: [
          { description: "신메뉴 출시 이벤트, 팥빙수가 1000원!", price: 1000 },
          { description: "고객 감사 이벤트, 팥빙수가 2300원!", price: 2300 },
          { description: "팥빙수 하나에 4300원", price: 4300 },
          { description: "팥 가격이 비싸져서 7000원", price: 7000 },
        ],
      },
      {
        name: "학원이 끝나고 너무 배가 고픈데 발견한 kfc",
        pricePoints: [
          { description: "사장님이 미쳤어요, 한 조각 990원!", price: 990 },
          { description: "9시 이후 진행되는 1+1 이벤트. 한 조각 1500원", price: 1500 },
          { description: "뭐야, 치킨나이트 끝났어? 한 조각 3300원", price: 3300 },
          { description: "닭 수급 불안정으로 한 조각 4700원", price: 4700 },
        ],
      },
    ],
  };
}

export function surveyToDraft(survey: Survey): SurveyDraft {
  return {
    id: survey.id,
    title: survey.title,
    classBudgets: survey.class_budgets ?? [],
    products: survey.products.map((product) => ({
      id: product.id,
      name: product.name,
      pricePoints: product.price_points.map((pricePoint) => ({
        id: pricePoint.id,
        description: pricePoint.description,
        price: pricePoint.price,
      })),
    })),
  };
}

export async function fetchSurveys(roomName?: string, slim = false): Promise<Survey[]> {
  const normalizedRoomName = roomName?.trim();

  if (!hasRemoteDatabase) {
    const surveys = readLocal<DbSurvey[]>(SURVEYS_KEY, []).map(normalizeSurvey);
    return normalizedRoomName
      ? surveys.filter((survey) => survey.teacher_pin === normalizedRoomName)
      : surveys;
  }

  const surveys = await apiFetch<Survey[]>(
    `/api/surveys${normalizedRoomName ? `?room=${encodeURIComponent(normalizedRoomName)}` : ""}`,
  );
  return slim
    ? surveys.map((survey) => ({
        ...survey,
        products: survey.products.map((product) => ({ ...product, price_points: [] })),
      }))
    : surveys;
}

export async function ensureRoomHasDefaultSurveys(roomName?: string): Promise<Survey[]> {
  const normalizedRoomName = roomName?.trim();

  if (!normalizedRoomName) {
    return [];
  }

  if (hasRemoteDatabase) {
    await apiFetch("/api/rooms/ensure", {
      method: "POST",
      body: JSON.stringify({ name: normalizedRoomName }),
    });
  }

  const existingSurveys = await fetchSurveys(normalizedRoomName);

  if (existingSurveys.length) {
    return existingSurveys;
  }

  return [await saveSurvey(createDefaultDraft(), normalizedRoomName)];
}

export async function saveSurvey(draft: SurveyDraft, roomName?: string): Promise<Survey> {
  const normalizedRoomName = roomName?.trim();

  if (!normalizedRoomName) {
    throw new Error("방 이름을 먼저 입력해 주세요.");
  }

  const cleanProducts = draft.products
    .map((product) => ({
      id: product.id,
      name: product.name.trim(),
      pricePoints: product.pricePoints
        .map((pricePoint) => ({
          id: pricePoint.id,
          description: pricePoint.description.trim(),
          price: Number(pricePoint.price),
        }))
        .filter((pricePoint) => Number.isFinite(pricePoint.price) && pricePoint.price > 0),
    }))
    .filter((product) => product.name && product.pricePoints.length);

  if (!cleanProducts.length) {
    throw new Error("상황과 가격 구성을 1개 이상 입력해 주세요.");
  }

  const cleanClassBudgets = normalizeClassBudgets(draft.classBudgets ?? []);

  if (!hasRemoteDatabase) {
    const surveys = readLocal<Survey[]>(SURVEYS_KEY, []);
    const responses = readLocal<StudentResponse[]>(RESPONSES_KEY, []);
    const surveyId = draft.id ?? makeId("survey");
    const previousSurvey = surveys.find((item) => item.id === surveyId);
    const survey: Survey = {
      id: surveyId,
      title: draft.title.trim() || "경제 수요설문",
      teacher_pin: normalizedRoomName,
      created_at:
        previousSurvey?.created_at ?? new Date().toISOString(),
      class_budgets: cleanClassBudgets,
      products: cleanProducts.map((product, productIndex) => {
        const productId = product.id ?? makeId("product");
        return {
          id: productId,
          survey_id: surveyId,
          name: product.name,
          sort_order: productIndex,
          price_points: product.pricePoints.map((pricePoint, priceIndex) => ({
            id: pricePoint.id ?? makeId("price"),
            product_id: productId,
            description: pricePoint.description,
            price: pricePoint.price,
            sort_order: priceIndex,
          })),
        };
      }),
    };
    const productIds = new Set(survey.products.map((product) => product.id));
    const pricePointIds = new Set(
      survey.products.flatMap((product) =>
        product.price_points.map((pricePoint) => pricePoint.id),
      ),
    );

    writeLocal(
      SURVEYS_KEY,
      [survey, ...surveys.filter((item) => item.id !== surveyId)],
    );
    writeLocal(
      RESPONSES_KEY,
      responses.map((response) =>
        response.survey_id === surveyId
          ? {
              ...response,
              response_items: response.response_items.filter(
                (item) =>
                  productIds.has(item.product_id) &&
                  pricePointIds.has(item.price_point_id),
              ),
            }
          : response,
      ),
    );
    return survey;
  }

  return apiFetch<Survey>("/api/surveys", {
    method: draft.id ? "PATCH" : "POST",
    body: JSON.stringify({ roomName: normalizedRoomName, draft }),
  });
}

export async function deleteSurvey(surveyId: string, roomName?: string): Promise<void> {
  if (!hasRemoteDatabase) {
    const surveys = readLocal<Survey[]>(SURVEYS_KEY, []);
    const responses = readLocal<StudentResponse[]>(RESPONSES_KEY, []);

    writeLocal(
      SURVEYS_KEY,
      surveys.filter((survey) => survey.id !== surveyId),
    );
    writeLocal(
      RESPONSES_KEY,
      responses.filter((response) => response.survey_id !== surveyId),
    );
    return;
  }

  const normalizedRoomName = roomName?.trim();
  if (!normalizedRoomName) throw new Error("방 이름을 먼저 입력해 주세요.");
  await apiFetch(`/api/surveys/${encodeURIComponent(surveyId)}?room=${encodeURIComponent(normalizedRoomName)}`, {
    method: "DELETE",
  });
}

export async function updateStudentResponse(
  surveyId: string,
  responseId: string,
  profile: StudentProfile,
  quantitiesByItemId: QuantityMap,
  roomName?: string,
) {
  const cleanProfile = {
    grade: Math.max(1, Math.round(Number(profile.grade))),
    class_number: Math.max(1, Math.round(Number(profile.class_number))),
    student_number: Math.max(1, Math.round(Number(profile.student_number))),
    student_name: profile.student_name.trim(),
  };

  if (!cleanProfile.student_name) {
    throw new Error("학생 이름을 입력해 주세요.");
  }

  const cleanQuantities = Object.fromEntries(
    Object.entries(quantitiesByItemId).map(([itemId, quantity]) => [
      itemId,
      Math.min(100, Math.max(0, Math.round(Number(quantity) || 0))),
    ]),
  );

  if (!hasRemoteDatabase) {
    const responses = readLocal<StudentResponse[]>(RESPONSES_KEY, []);
    writeLocal(
      RESPONSES_KEY,
      responses.map((response) =>
        response.id === responseId && response.survey_id === surveyId
          ? {
              ...response,
              ...cleanProfile,
              response_items: response.response_items.map((item) => ({
                ...item,
                quantity: cleanQuantities[item.id] ?? item.quantity,
              })),
            }
          : response,
      ),
    );
    return;
  }

  const normalizedRoomName = roomName?.trim();
  if (!normalizedRoomName) {
    throw new Error("방 이름을 먼저 입력해 주세요.");
  }

  await apiFetch(`/api/responses/${encodeURIComponent(responseId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      roomName: normalizedRoomName,
      surveyId,
      profile: cleanProfile,
      quantities: cleanQuantities,
    }),
  });
}

export async function deleteStudentResponse(
  surveyId: string,
  responseId: string,
  roomName?: string,
) {
  if (!hasRemoteDatabase) {
    const responses = readLocal<StudentResponse[]>(RESPONSES_KEY, []);
    writeLocal(
      RESPONSES_KEY,
      responses.filter(
        (response) => response.id !== responseId || response.survey_id !== surveyId,
      ),
    );
    return;
  }

  const normalizedRoomName = roomName?.trim();
  if (!normalizedRoomName) {
    throw new Error("방 이름을 먼저 입력해 주세요.");
  }

  await apiFetch(`/api/responses/${encodeURIComponent(responseId)}?room=${encodeURIComponent(normalizedRoomName)}&surveyId=${encodeURIComponent(surveyId)}`, {
    method: "DELETE",
  });
}

export async function fetchResponses(
  surveyId: string,
  slim = false,
  roomName?: string,
  revealResponseId?: string | null,
): Promise<StudentResponse[]> {
  if (!hasRemoteDatabase) {
    const storedSubmission = roomName
      ? readStoredStudentSubmission(roomName, surveyId)
      : null;
    const all = (revealResponseId
      ? redactOtherClassRespondents(
          readCurrentLocalResponses(),
          storedSubmission?.profile ?? null,
          storedSubmission?.responseId,
        )
      : readCurrentLocalResponses()).filter(
      (response) => response.survey_id === surveyId,
    );
    return slim ? all.map((r) => ({ ...r, response_items: [] })) : all;
  }

  const normalizedRoomName = roomName?.trim();
  if (!normalizedRoomName) {
    throw new Error("방 이름을 먼저 입력해 주세요.");
  }

  const reveal = revealResponseId ? `&reveal=${encodeURIComponent(revealResponseId)}` : "";
  const responses = await apiFetch<StudentResponse[]>(
    `/api/responses?room=${encodeURIComponent(normalizedRoomName)}&surveyId=${encodeURIComponent(surveyId)}${reveal}`,
  );
  return slim ? responses.map((response) => ({ ...response, response_items: [] })) : responses;
}

function normalizeAssignmentProfile(profile: StudentProfile): StudentProfile {
  return {
    grade: Math.max(1, Math.round(Number(profile.grade))),
    class_number: Math.max(1, Math.round(Number(profile.class_number))),
    student_number: 1,
    student_name: profile.student_name.trim(),
  };
}

export async function reserveAssignments(
  survey: Survey,
  profile: StudentProfile,
  roomName: string | undefined,
  ageConfirmed: boolean,
): Promise<AssignmentMap> {
  const cleanProfile = normalizeAssignmentProfile(profile);

  if (!cleanProfile.student_name) {
    throw new Error("학생 이름을 입력해 주세요.");
  }

  if (!hasRemoteDatabase) {
    if (ageConfirmed !== true) {
      throw new Error("만 14세 미만은 이 서비스를 이용할 수 없습니다.");
    }
    const storageKey = buildAssignmentStorageKey(survey.id, cleanProfile);
    const storedAssignments = readStoredAssignments(
      typeof window === "undefined" ? null : window.localStorage.getItem(storageKey),
    );

    if (storedAssignments && hasCompleteAssignments(survey, storedAssignments)) {
      return storedAssignments;
    }

    const responses = readLocal<StudentResponse[]>(RESPONSES_KEY, []).filter(
      (response) =>
        response.survey_id === survey.id &&
        response.grade === cleanProfile.grade &&
        response.class_number === cleanProfile.class_number,
    );
    const nextAssignments = buildBalancedAssignments(
      survey,
      responses,
      buildAssignmentSeed(survey.id, cleanProfile),
    );

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ assignments: nextAssignments, stored_at: new Date().toISOString() }),
      );
    }

    return nextAssignments;
  }

  const normalizedRoomName = roomName?.trim();
  if (!normalizedRoomName) throw new Error("방 이름을 먼저 입력해 주세요.");
  const { assignments } = await apiFetch<{ assignments: AssignmentMap }>("/api/assignments/reserve", {
    method: "POST",
    body: JSON.stringify({ roomName: normalizedRoomName, surveyId: survey.id, profile: cleanProfile, ageConfirmed }),
  });
  return assignments;
}

export async function submitResponse(
  survey: Survey,
  profile: StudentProfile,
  quantities: QuantityMap,
  roomName: string | undefined,
  ageConfirmed: boolean,
): Promise<string> {
  if (!hasRemoteDatabase && ageConfirmed !== true) {
    throw new Error("만 14세 미만은 이 서비스를 이용할 수 없습니다.");
  }

  const hasAssignedQuantity = (pricePointId: string) =>
    Object.prototype.hasOwnProperty.call(quantities, pricePointId);

  const items = survey.products.flatMap((product) =>
    product.price_points
      .filter((pricePoint) => hasAssignedQuantity(pricePoint.id))
      .map((pricePoint) => ({
        product_id: product.id,
        price_point_id: pricePoint.id,
        quantity: quantities[pricePoint.id] ?? 0,
      })),
  );

  if (!items.length) {
    throw new Error("응답할 상황별 가격 구성이 없습니다.");
  }

  const classBudget = findClassBudget(survey, profile);

  if (classBudget) {
    const spentAmount = calculateSpentAmount(survey, quantities);

    if (spentAmount > classBudget.budget) {
      throw new Error(
        `예산을 ${(spentAmount - classBudget.budget).toLocaleString("ko-KR")}원 초과했습니다.`,
      );
    }
  }

  if (!hasRemoteDatabase) {
    const responseId = makeId("response");
    const stored = readLocal<StudentResponse[]>(RESPONSES_KEY, []);
    const response: StudentResponse = {
      id: responseId,
      survey_id: survey.id,
      created_at: new Date().toISOString(),
      ...profile,
      response_items: items.map((item) => ({
        id: makeId("item"),
        response_id: responseId,
        ...item,
      })),
    };

    writeLocal(RESPONSES_KEY, [response, ...stored]);
    return response.id;
  }

  const normalizedRoomName = roomName?.trim();
  if (!normalizedRoomName) throw new Error("방 이름을 먼저 입력해 주세요.");
  const { id } = await apiFetch<{ id: string }>("/api/responses", {
    method: "POST",
    body: JSON.stringify({
      roomName: normalizedRoomName,
      surveyId: survey.id,
      profile,
      quantities,
      ageConfirmed,
    }),
  });
  return id;
}
