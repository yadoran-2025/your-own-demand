"use client";

import { supabase } from "./supabase";
import {
  buildAssignmentSeed,
  buildAssignmentStorageKey,
  buildBalancedAssignments,
  hasCompleteAssignments,
  type AssignmentMap,
} from "./assignments";
import type {
  ClassBudget,
  QuantityMap,
  ReservedAssignment,
  StudentProfile,
  StudentResponse,
  Survey,
  SurveyDraft,
} from "./types";
import { makeId } from "./utils";

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

type DbResponse = {
  id: string;
  survey_id: string;
  grade: number;
  class_number: number;
  student_number: number;
  student_name: string;
  created_at: string;
  response_items: Array<{
    id: string;
    response_id: string;
    product_id: string;
    price_point_id: string;
    quantity: number;
  }>;
};

type DbResponseRpc = Omit<DbResponse, "response_items"> & {
  response_items?: DbResponse["response_items"] | string | null;
};

type ReservedAssignmentRow = ReservedAssignment;

export const hasRemoteDatabase = Boolean(supabase);

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

  if (!supabase) {
    const surveys = readLocal<DbSurvey[]>(SURVEYS_KEY, []).map(normalizeSurvey);
    return normalizedRoomName
      ? surveys.filter((survey) => survey.teacher_pin === normalizedRoomName)
      : surveys;
  }

  if (slim) {
    let query = supabase
      .from("surveys")
      .select("id,title,teacher_pin,created_at,products(id,survey_id,name,sort_order)")
      .order("created_at", { ascending: false });

    if (normalizedRoomName) {
      query = query.eq("teacher_pin", normalizedRoomName);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return ((data ?? []) as DbSurvey[]).map(normalizeSurvey);
  }

  let query = supabase
    .from("surveys")
    .select(
      "id,title,teacher_pin,created_at,class_budgets:survey_class_budgets(id,survey_id,grade,class_number,budget),products(id,survey_id,name,sort_order,price_points(id,product_id,description,price,sort_order))",
    )
    .order("created_at", { ascending: false });

  if (normalizedRoomName) {
    query = query.eq("teacher_pin", normalizedRoomName);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return ((data ?? []) as DbSurvey[]).map(normalizeSurvey);
}

export async function ensureRoomHasDefaultSurveys(roomName?: string): Promise<Survey[]> {
  const normalizedRoomName = roomName?.trim();

  if (!normalizedRoomName) {
    return [];
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

  if (!supabase) {
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

  const surveyPayload = {
    title: draft.title.trim() || "경제 수요설문",
    teacher_pin: normalizedRoomName,
  };

  const { data: surveyData, error: surveyError } = draft.id
    ? await supabase
        .from("surveys")
        .update(surveyPayload)
        .eq("id", draft.id)
        .eq("teacher_pin", normalizedRoomName)
        .select("id,title,teacher_pin,created_at")
        .single()
    : await supabase
        .from("surveys")
        .insert(surveyPayload)
        .select("id,title,teacher_pin,created_at")
        .single();

  if (surveyError) {
    throw surveyError;
  }

  const surveyId = surveyData.id as string;

  const previousSurvey = draft.id
    ? (await fetchSurveys(normalizedRoomName)).find((survey) => survey.id === surveyId)
    : undefined;

  const { error: deleteBudgetError } = await supabase
    .from("survey_class_budgets")
    .delete()
    .eq("survey_id", surveyId);

  if (deleteBudgetError) {
    throw deleteBudgetError;
  }

  if (cleanClassBudgets.length) {
    const { error: budgetError } = await supabase
      .from("survey_class_budgets")
      .insert(
        cleanClassBudgets.map((classBudget) => ({
          survey_id: surveyId,
          grade: classBudget.grade,
          class_number: classBudget.class_number,
          budget: classBudget.budget,
        })),
      );

    if (budgetError) {
      throw budgetError;
    }
  }

  const previousProductIds = new Set(
    previousSurvey?.products.map((product) => product.id) ?? [],
  );
  const keptProductIds = new Set<string>();

  for (const [productIndex, product] of cleanProducts.entries()) {
    let productId = product.id;

    if (productId && previousProductIds.has(productId)) {
      const { error } = await supabase
        .from("products")
        .update({
          name: product.name,
          sort_order: productIndex,
        })
        .eq("id", productId)
        .eq("survey_id", surveyId);

      if (error) {
        throw error;
      }
    } else {
      const { data, error } = await supabase
        .from("products")
        .insert({
          survey_id: surveyId,
          name: product.name,
          sort_order: productIndex,
        })
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      productId = data.id as string;
    }

    keptProductIds.add(productId);

    const previousProduct = previousSurvey?.products.find(
      (item) => item.id === productId,
    );
    const previousPricePointIds = new Set(
      previousProduct?.price_points.map((pricePoint) => pricePoint.id) ?? [],
    );
    const keptPricePointIds = new Set<string>();

    for (const [priceIndex, pricePoint] of product.pricePoints.entries()) {
      if (pricePoint.id && previousPricePointIds.has(pricePoint.id)) {
        const { error } = await supabase
          .from("price_points")
          .update({
            description: pricePoint.description,
            price: pricePoint.price,
            sort_order: priceIndex,
          })
          .eq("id", pricePoint.id)
          .eq("product_id", productId);

        if (error) {
          throw error;
        }

        keptPricePointIds.add(pricePoint.id);
      } else {
        const { data, error } = await supabase
          .from("price_points")
          .insert({
            product_id: productId,
            description: pricePoint.description,
            price: pricePoint.price,
            sort_order: priceIndex,
          })
          .select("id")
          .single();

        if (error) {
          throw error;
        }

        keptPricePointIds.add(data.id as string);
      }
    }

    const removedPricePointIds = [...previousPricePointIds].filter(
      (pricePointId) => !keptPricePointIds.has(pricePointId),
    );

    if (removedPricePointIds.length) {
      const { error } = await supabase
        .from("price_points")
        .delete()
        .in("id", removedPricePointIds);

      if (error) {
        throw error;
      }
    }
  }

  const removedProductIds = [...previousProductIds].filter(
    (productId) => !keptProductIds.has(productId),
  );

  if (removedProductIds.length) {
    const { error } = await supabase
      .from("products")
      .delete()
      .in("id", removedProductIds);

    if (error) {
      throw error;
    }
  }

  return (await fetchSurveys(normalizedRoomName)).find((survey) => survey.id === surveyId)!;
}

export async function deleteSurvey(surveyId: string) {
  if (!supabase) {
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

  const { error } = await supabase.from("surveys").delete().eq("id", surveyId);

  if (error) {
    throw error;
  }
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

  if (!supabase) {
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

  const { error } = await supabase.rpc("update_room_student_response", {
    quantity_rows: Object.entries(cleanQuantities).map(([item_id, quantity]) => ({
      item_id,
      quantity,
    })),
    target_class_number: cleanProfile.class_number,
    target_grade: cleanProfile.grade,
    target_response_id: responseId,
    target_room_name: normalizedRoomName,
    target_student_name: cleanProfile.student_name,
    target_student_number: cleanProfile.student_number,
    target_survey_id: surveyId,
  });

  if (error) {
    throw error;
  }
}

export async function deleteStudentResponse(
  surveyId: string,
  responseId: string,
  roomName?: string,
) {
  if (!supabase) {
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

  const { error } = await supabase.rpc("delete_room_student_response", {
    target_response_id: responseId,
    target_room_name: normalizedRoomName,
    target_survey_id: surveyId,
  });

  if (error) {
    throw error;
  }
}

function normalizeResponseItems(items: DbResponseRpc["response_items"]) {
  if (!items) {
    return [];
  }

  if (typeof items === "string") {
    return JSON.parse(items) as DbResponse["response_items"];
  }

  return items;
}

export async function fetchResponses(
  surveyId: string,
  slim = false,
  roomName?: string,
  revealResponseId?: string | null,
): Promise<StudentResponse[]> {
  if (!supabase) {
    const all = readLocal<StudentResponse[]>(RESPONSES_KEY, []).filter(
      (response) => response.survey_id === surveyId,
    );
    return slim ? all.map((r) => ({ ...r, response_items: [] })) : all;
  }

  const normalizedRoomName = roomName?.trim();
  if (!normalizedRoomName) {
    throw new Error("방 이름을 먼저 입력해 주세요.");
  }

  const { data, error } = await supabase.rpc("fetch_room_responses", {
    include_response_items: !slim,
    reveal_response_id: revealResponseId ?? null,
    target_room_name: normalizedRoomName,
    target_survey_id: surveyId,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as DbResponseRpc[]).map((response) => ({
    ...response,
    response_items: slim ? [] : normalizeResponseItems(response.response_items),
  }));
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
): Promise<AssignmentMap> {
  const cleanProfile = normalizeAssignmentProfile(profile);

  if (!cleanProfile.student_name) {
    throw new Error("학생 이름을 입력해 주세요.");
  }

  if (!supabase) {
    const storageKey = buildAssignmentStorageKey(survey.id, cleanProfile);
    const stored =
      typeof window === "undefined" ? null : window.localStorage.getItem(storageKey);
    const storedAssignments = stored ? (JSON.parse(stored) as AssignmentMap) : null;

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
      window.localStorage.setItem(storageKey, JSON.stringify(nextAssignments));
    }

    return nextAssignments;
  }

  const { data, error } = await supabase.rpc("reserve_balanced_assignments", {
    target_class_number: cleanProfile.class_number,
    target_grade: cleanProfile.grade,
    target_student_name: cleanProfile.student_name,
    target_survey_id: survey.id,
  });

  if (error) {
    throw error;
  }

  return Object.fromEntries(
    ((data ?? []) as ReservedAssignmentRow[]).map((row) => [
      row.product_id,
      row.price_point_id,
    ]),
  );
}

export async function consumeAssignmentReservations(
  surveyId: string,
  profile: StudentProfile,
) {
  if (!supabase) {
    return;
  }

  const cleanProfile = normalizeAssignmentProfile(profile);

  const { error } = await supabase.rpc("consume_assignment_reservations", {
    target_class_number: cleanProfile.class_number,
    target_grade: cleanProfile.grade,
    target_student_name: cleanProfile.student_name,
    target_survey_id: surveyId,
  });

  if (error) {
    throw error;
  }
}

export async function submitResponse(
  survey: Survey,
  profile: StudentProfile,
  quantities: QuantityMap,
) {
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

  if (!supabase) {
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
    return response;
  }

  const { data: responseId, error: submitError } = await supabase.rpc("submit_student_response", {
    item_rows: items,
    target_class_number: profile.class_number,
    target_grade: profile.grade,
    target_student_name: profile.student_name,
    target_student_number: profile.student_number,
    target_survey_id: survey.id,
  });

  if (submitError) {
    throw submitError;
  }

  try {
    await consumeAssignmentReservations(survey.id, profile);
  } catch (error) {
    console.warn("Failed to consume assignment reservations", error);
  }
  return responseId as string;
}
