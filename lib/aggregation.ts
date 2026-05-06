import type {
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

function distribution(values: number[]) {
  return bins.map((bin) => ({
    label: bin.label,
    count: values.filter((value) => value >= bin.min && value <= bin.max).length,
  }));
}

export function buildDemandData(
  product: Product,
  responses: StudentResponse[],
  filter: FilterState,
): DemandPoint[] {
  const filteredResponses = responses.filter((response) =>
    matchesFilter(response, filter),
  );

  return [...product.price_points]
    .sort((a, b) => a.sort_order - b.sort_order || a.price - b.price)
    .map((pricePoint) => {
      const classValues = quantitiesFor(filteredResponses, product, pricePoint);
      const overallValues = quantitiesFor(responses, product, pricePoint);

      return {
        price: pricePoint.price,
        pricePointId: pricePoint.id,
        classAverage: average(classValues),
        overallAverage: average(overallValues),
        classCount: classValues.length,
        overallCount: overallValues.length,
        classDistribution: distribution(classValues),
        overallDistribution: distribution(overallValues),
      };
    });
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
