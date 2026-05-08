"use client";

import { supabase } from "./supabase";
import type {
  ClassBudget,
  Product,
  QuantityMap,
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
  price_points: DbPricePoint[];
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
          { description: "소형 빵 1개", price: 2000 },
          { description: "소형 빵 2개 묶음", price: 4000 },
          { description: "샌드위치와 음료 세트", price: 8000 },
          { description: "프리미엄 브런치 세트", price: 12000 },
        ],
      },
      {
        name: "체육대회가 끝나고 목이 마른데 편의점 앞 냉장고에 차가운 음료가 보인다.",
        pricePoints: [
          { description: "소형 캔", price: 1000 },
          { description: "중형 페트병", price: 1800 },
          { description: "대형 페트병", price: 3000 },
        ],
      },
      {
        name: "점심시간이 짧은 날, 학교 매점에 바로 먹을 수 있는 간식이 놓여 있다.",
        pricePoints: [
          { description: "삼각김밥 1개", price: 1200 },
          { description: "김밥과 음료 구성", price: 3500 },
          { description: "도시락 세트", price: 6500 },
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
        description: pricePoint.description,
        price: pricePoint.price,
      })),
    })),
  };
}

export async function fetchSurveys(roomName?: string): Promise<Survey[]> {
  const normalizedRoomName = roomName?.trim();

  if (!supabase) {
    const surveys = readLocal<DbSurvey[]>(SURVEYS_KEY, []).map(normalizeSurvey);
    return normalizedRoomName
      ? surveys.filter((survey) => survey.teacher_pin === normalizedRoomName)
      : surveys;
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

export async function saveSurvey(draft: SurveyDraft, roomName?: string): Promise<Survey> {
  const normalizedRoomName = roomName?.trim();

  if (!normalizedRoomName) {
    throw new Error("방 이름을 먼저 입력해 주세요.");
  }

  const cleanProducts = draft.products
    .map((product) => ({
      name: product.name.trim(),
      pricePoints: product.pricePoints
        .map((pricePoint) => ({
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
    const surveyId = draft.id ?? makeId("survey");
    const survey: Survey = {
      id: surveyId,
      title: draft.title.trim() || "경제 수요설문",
      teacher_pin: normalizedRoomName,
      created_at:
        surveys.find((item) => item.id === surveyId)?.created_at ??
        new Date().toISOString(),
      class_budgets: cleanClassBudgets,
      products: cleanProducts.map((product, productIndex) => {
        const productId = makeId("product");
        return {
          id: productId,
          survey_id: surveyId,
          name: product.name,
          sort_order: productIndex,
          price_points: product.pricePoints.map((pricePoint, priceIndex) => ({
            id: makeId("price"),
            product_id: productId,
            description: pricePoint.description,
            price: pricePoint.price,
            sort_order: priceIndex,
          })),
        };
      }),
    };

    writeLocal(
      SURVEYS_KEY,
      [survey, ...surveys.filter((item) => item.id !== surveyId)],
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

  if (draft.id) {
    await supabase.from("responses").delete().eq("survey_id", surveyId);
    await supabase.from("survey_class_budgets").delete().eq("survey_id", surveyId);
    await supabase.from("products").delete().eq("survey_id", surveyId);
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

  const productRows = cleanProducts.map((product, index) => ({
    survey_id: surveyId,
    name: product.name,
    sort_order: index,
  }));

  const { data: insertedProducts, error: productError } = await supabase
    .from("products")
    .insert(productRows)
    .select("id,survey_id,name,sort_order");

  if (productError) {
    throw productError;
  }

  const priceRows = (insertedProducts as Pick<Product, "id">[]).flatMap(
    (product, index) =>
      cleanProducts[index].pricePoints.map((pricePoint, priceIndex) => ({
        product_id: product.id,
        description: pricePoint.description,
        price: pricePoint.price,
        sort_order: priceIndex,
      })),
  );

  const { error: priceError } = await supabase.from("price_points").insert(priceRows);

  if (priceError) {
    throw priceError;
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

export async function fetchResponses(surveyId: string): Promise<StudentResponse[]> {
  if (!supabase) {
    return readLocal<StudentResponse[]>(RESPONSES_KEY, []).filter(
      (response) => response.survey_id === surveyId,
    );
  }

  const { data, error } = await supabase
    .from("responses")
    .select(
      "id,survey_id,grade,class_number,student_number,student_name,created_at,response_items(id,response_id,product_id,price_point_id,quantity)",
    )
    .eq("survey_id", surveyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as DbResponse[];
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

  const { data: response, error: responseError } = await supabase
    .from("responses")
    .insert({
      survey_id: survey.id,
      grade: profile.grade,
      class_number: profile.class_number,
      student_number: profile.student_number,
      student_name: profile.student_name,
    })
    .select("id")
    .single();

  if (responseError) {
    throw responseError;
  }

  const { error: itemError } = await supabase.from("response_items").insert(
    items.map((item) => ({
      response_id: response.id,
      ...item,
    })),
  );

  if (itemError) {
    throw itemError;
  }
}

