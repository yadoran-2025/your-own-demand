"use client";

import type { DemandMetric, DemandScope, Product } from "@/lib/types";

type SituationTabsProps = {
  products: Product[];
  selectedProductId?: string;
  onSelect: (productId: string) => void;
};

type DemandScopeToggleProps = {
  includePersonal?: boolean;
  value: DemandScope;
  onChange: (scope: DemandScope) => void;
};

type DemandMetricToggleProps = {
  value: DemandMetric;
  onChange: (metric: DemandMetric) => void;
};

export function SituationTabs({
  products,
  selectedProductId,
  onSelect,
}: SituationTabsProps) {
  return (
    <section className="product-tabs-card">
      <div className="product-tabs">
        {products.map((product, index) => (
          <button
            className="product-tab"
            data-active={product.id === selectedProductId}
            key={product.id}
            onClick={() => onSelect(product.id)}
            type="button"
          >
            <span className="situation-tab-prefix">상황 {index + 1}</span>
            <span>{product.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function DemandScopeToggle({
  includePersonal = false,
  value,
  onChange,
}: DemandScopeToggleProps) {
  return (
    <section className="demand-scope-card" aria-label="수요곡선 표시 기준">
      <div className="demand-scope-toggle">
        {includePersonal ? (
          <button
            className="demand-scope-button"
            data-active={value === "personal"}
            onClick={() => onChange("personal")}
            type="button"
          >
            나의 응답
          </button>
        ) : null}
        <button
          className="demand-scope-button"
          data-active={value === "class"}
          onClick={() => onChange("class")}
          type="button"
        >
          우리 반
        </button>
        <button
          className="demand-scope-button"
          data-active={value === "school"}
          onClick={() => onChange("school")}
          type="button"
        >
          학교 전체
        </button>
      </div>
    </section>
  );
}

export function DemandMetricToggle({ value, onChange }: DemandMetricToggleProps) {
  return (
    <section className="demand-scope-card" aria-label="수요곡선 값 표시 방식">
      <div className="demand-scope-toggle">
        <button
          className="demand-scope-button"
          data-active={value === "total"}
          onClick={() => onChange("total")}
          type="button"
        >
          수요량
        </button>
        <button
          className="demand-scope-button"
          data-active={value === "average"}
          onClick={() => onChange("average")}
          type="button"
        >
          평균
        </button>
      </div>
    </section>
  );
}
