"use client";

import type { DemandScope, Product } from "@/lib/types";

type SituationTabsProps = {
  products: Product[];
  selectedProductId?: string;
  onSelect: (productId: string) => void;
};

type DemandScopeToggleProps = {
  value: DemandScope;
  onChange: (scope: DemandScope) => void;
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

export function DemandScopeToggle({ value, onChange }: DemandScopeToggleProps) {
  return (
    <section className="demand-scope-card" aria-label="수요곡선 표시 기준">
      <div className="demand-scope-toggle">
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
