"use client";

import type {
  PricePoint,
  Product,
  StudentProfile,
  StudentResponse,
  Survey,
} from "./types";

export type AssignmentMap = Record<string, string>;

export type AssignedPricePoint = {
  product: Product;
  pricePoint: PricePoint;
};

function stableHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function buildAssignmentSeed(surveyId: string, profile: StudentProfile) {
  return [
    surveyId,
    profile.grade,
    profile.class_number,
    profile.student_number,
  ].join(":");
}

export function buildAssignmentStorageKey(
  surveyId: string,
  profile: StudentProfile,
) {
  return `demand-app-assignments:${buildAssignmentSeed(surveyId, profile)}`;
}

export function buildBalancedAssignments(
  survey: Survey,
  responses: StudentResponse[],
  profileSeed: string,
): AssignmentMap {
  return survey.products.reduce<AssignmentMap>((assignments, product) => {
    if (!product.price_points.length) {
      return assignments;
    }

    const counts = new Map(
      product.price_points.map((pricePoint) => [pricePoint.id, 0]),
    );

    responses.forEach((response) => {
      response.response_items.forEach((item) => {
        if (item.product_id !== product.id || !counts.has(item.price_point_id)) {
          return;
        }

        counts.set(item.price_point_id, (counts.get(item.price_point_id) ?? 0) + 1);
      });
    });

    const minimumCount = Math.min(
      ...product.price_points.map((pricePoint) => counts.get(pricePoint.id) ?? 0),
    );

    const selected = product.price_points
      .filter((pricePoint) => (counts.get(pricePoint.id) ?? 0) === minimumCount)
      .sort((left, right) => {
        const leftHash = stableHash(`${profileSeed}:${product.id}:${left.id}`);
        const rightHash = stableHash(`${profileSeed}:${product.id}:${right.id}`);
        return leftHash - rightHash || left.sort_order - right.sort_order;
      })[0];

    if (selected) {
      assignments[product.id] = selected.id;
    }

    return assignments;
  }, {});
}

export function resolveAssignedPricePoints(
  survey: Survey,
  assignments: AssignmentMap,
): AssignedPricePoint[] {
  return survey.products.flatMap((product) => {
    const assignedId = assignments[product.id];
    const pricePoint = product.price_points.find((item) => item.id === assignedId);

    return pricePoint ? [{ product, pricePoint }] : [];
  });
}

export function hasCompleteAssignments(survey: Survey, assignments: AssignmentMap) {
  return survey.products.every((product) =>
    product.price_points.some((pricePoint) => pricePoint.id === assignments[product.id]),
  );
}
