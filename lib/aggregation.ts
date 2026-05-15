import type {
  BudgetDemandGroup,
  ClassBudget,
  DemandPoint,
  FilterState,
  PricePoint,
  Product,
  StudentResponse,
} from "./types";

const bins = [
  { label: "0개", min: 0, max: 0 },
  { label: "1개", min: 1, max: 1 },
  { label: "2개", min: 2, max: 2 },
  { label: "3개", min: 3, max: 3 },
  { label: "4개 이상", min: 4, max: Number.POSITIVE_INFINITY },
];

function matchesFilter(response: StudentResponse, filter: FilterState) {
  const gradeOk = filter.grade === "all" || response.grade === Number(filter.grade);
  const classOk =
    filter.classNumber === "all" ||
    response.class_number === Number(filter.classNumber);

  return gradeOk && classOk;
}

function quantitiesFor(
  responses: StudentResponse[],
  product: Product,
  pricePoint: PricePoint,
) {
  return responses
    .map((response) =>
      response.response_items.find(
        (item) =>
          item.product_id === product.id && item.price_point_id === pricePoint.id,
      ),
    )
    .filter(Boolean)
    .map((item) => item!.quantity);
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2),
  );
}

function total(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0);
}

function distribution(values: number[]) {
  return bins.map((bin) => ({
    label: bin.label,
    count: values.filter((value) => value >= bin.min && value <= bin.max).length,
  }));
}

function respondentsFor(
  responses: StudentResponse[],
  product: Product,
  pricePoint: PricePoint,
) {
  return responses
    .map((response) => {
      const item = response.response_items.find(
        (responseItem) =>
          responseItem.product_id === product.id &&
          responseItem.price_point_id === pricePoint.id,
      );

      if (!item) {
        return null;
      }

      return {
        grade: response.grade,
        classNumber: response.class_number,
        studentName: response.student_name,
        quantity: item.quantity,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.quantity - a!.quantity || a!.classNumber - b!.classNumber)
    .map((row) => row!);
}

function buildDemandPoints(
  product: Product,
  targetResponses: StudentResponse[],
  overallResponses: StudentResponse[],
): DemandPoint[] {
  return [...product.price_points]
    .sort((a, b) => a.sort_order - b.sort_order || a.price - b.price)
    .map((pricePoint) => {
      const classValues = quantitiesFor(targetResponses, product, pricePoint);
      const overallValues = quantitiesFor(overallResponses, product, pricePoint);
      const classRespondents = respondentsFor(targetResponses, product, pricePoint);
      const overallRespondents = respondentsFor(overallResponses, product, pricePoint);

      return {
        price: pricePoint.price,
        pricePointId: pricePoint.id,
        classTotal: total(classValues),
        overallTotal: total(overallValues),
        classAverage: average(classValues),
        overallAverage: average(overallValues),
        classCount: classValues.length,
        overallCount: overallValues.length,
        classDistribution: distribution(classValues),
        overallDistribution: distribution(overallValues),
        classRespondents,
        overallRespondents,
      };
    });
}

export function buildDemandData(
  product: Product,
  responses: StudentResponse[],
  filter: FilterState,
): DemandPoint[] {
  const filteredResponses = responses.filter((response) =>
    matchesFilter(response, filter),
  );

  return buildDemandPoints(product, filteredResponses, responses);
}

function classKey(grade: number, classNumber: number) {
  return `${grade}-${classNumber}`;
}

function budgetGroupId(budget: number) {
  return `budget-${budget}`;
}

function formatBudgetLabel(budget: number | null) {
  return budget === null ? "예산 미설정" : `${budget.toLocaleString("ko-KR")}원`;
}

function sortClasses(
  classes: Array<{ grade: number; class_number: number }>,
) {
  return [...classes].sort(
    (a, b) => a.grade - b.grade || a.class_number - b.class_number,
  );
}

function findBudgetForResponse(
  response: StudentResponse,
  budgetByClass: Map<string, ClassBudget>,
) {
  return budgetByClass.get(classKey(response.grade, response.class_number));
}

export function buildBudgetDemandGroups(
  classBudgets: ClassBudget[],
  responses: StudentResponse[],
): BudgetDemandGroup[] {
  const budgetByClass = new Map<string, ClassBudget>();
  const groupsById = new Map<string, BudgetDemandGroup>();

  for (const classBudget of classBudgets) {
    budgetByClass.set(
      classKey(classBudget.grade, classBudget.class_number),
      classBudget,
    );

    const id = budgetGroupId(classBudget.budget);
    const group = groupsById.get(id) ?? {
      id,
      budget: classBudget.budget,
      label: formatBudgetLabel(classBudget.budget),
      classes: [],
      responses: [],
    };

    group.classes.push({
      grade: classBudget.grade,
      class_number: classBudget.class_number,
    });
    groupsById.set(id, group);
  }

  const unbudgetedClasses = new Map<string, { grade: number; class_number: number }>();

  for (const response of responses) {
    const classBudget = findBudgetForResponse(response, budgetByClass);

    if (classBudget) {
      groupsById.get(budgetGroupId(classBudget.budget))?.responses.push(response);
      continue;
    }

    unbudgetedClasses.set(classKey(response.grade, response.class_number), {
      grade: response.grade,
      class_number: response.class_number,
    });

    const group = groupsById.get("unbudgeted") ?? {
      id: "unbudgeted",
      budget: null,
      label: formatBudgetLabel(null),
      classes: [],
      responses: [],
    };

    group.responses.push(response);
    groupsById.set("unbudgeted", group);
  }

  const unbudgetedGroup = groupsById.get("unbudgeted");
  if (unbudgetedGroup) {
    unbudgetedGroup.classes = Array.from(unbudgetedClasses.values());
  }

  return Array.from(groupsById.values())
    .map((group) => ({
      ...group,
      classes: sortClasses(group.classes),
    }))
    .sort((a, b) => {
      if (a.budget === null) return 1;
      if (b.budget === null) return -1;
      return a.budget - b.budget;
    });
}

export function buildBudgetDemandData(
  product: Product,
  group: BudgetDemandGroup,
  responses: StudentResponse[],
) {
  return buildDemandPoints(product, group.responses, responses);
}

export function getAvailableGrades(responses: StudentResponse[]) {
  return Array.from(new Set(responses.map((response) => response.grade))).sort(
    (a, b) => a - b,
  );
}

export function getAvailableClasses(responses: StudentResponse[], grade: string) {
  return Array.from(
    new Set(
      responses
        .filter((response) => grade === "all" || response.grade === Number(grade))
        .map((response) => response.class_number),
    ),
  ).sort((a, b) => a - b);
}
