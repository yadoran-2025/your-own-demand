"use client";

import { Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createDefaultDraft } from "@/lib/data";
import type { SurveyDraft } from "@/lib/types";
import { formatWon } from "@/lib/utils";

type SurveyEditorProps = {
  initialDraft?: SurveyDraft;
  onSave: (draft: SurveyDraft) => Promise<void>;
};

function normalizeDraft(draft?: SurveyDraft) {
  const fallback = createDefaultDraft();
  const nextDraft = draft ?? fallback;

  return {
    ...nextDraft,
    classBudgets: nextDraft.classBudgets ?? [],
  };
}

export function SurveyEditor({ initialDraft, onSave }: SurveyEditorProps) {
  const [draft, setDraft] = useState<SurveyDraft>(
    normalizeDraft(initialDraft),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(normalizeDraft(initialDraft));
  }, [initialDraft]);

  function updateClassBudget(
    budgetIndex: number,
    field: "grade" | "class_number" | "budget",
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      classBudgets: current.classBudgets.map((classBudget, index) =>
        index === budgetIndex
          ? {
              ...classBudget,
              [field]: Number(value.replace(/[^\d]/g, "")),
            }
          : classBudget,
      ),
    }));
  }

  function addClassBudget() {
    setDraft((current) => ({
      ...current,
      classBudgets: [
        ...current.classBudgets,
        {
          grade: 3,
          class_number: 1,
          budget: 20000,
        },
      ],
    }));
  }

  function removeClassBudget(index: number) {
    setDraft((current) => ({
      ...current,
      classBudgets: current.classBudgets.filter(
        (_, budgetIndex) => budgetIndex !== index,
      ),
    }));
  }

  function updateProductName(index: number, name: string) {
    setDraft((current) => ({
      ...current,
      products: current.products.map((product, productIndex) =>
        productIndex === index ? { ...product, name } : product,
      ),
    }));
  }

  function updatePricePoint(
    productIndex: number,
    priceIndex: number,
    field: "description" | "price",
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      products: current.products.map((product, index) =>
        index === productIndex
          ? {
              ...product,
              pricePoints: product.pricePoints.map((pricePoint, innerIndex) =>
                innerIndex === priceIndex
                  ? {
                      ...pricePoint,
                      [field]:
                        field === "price"
                          ? Number(value.replace(/[^\d]/g, ""))
                          : value,
                    }
                  : pricePoint,
              ),
            }
          : product,
      ),
    }));
  }

  function addProduct() {
    setDraft((current) => ({
      ...current,
      products: [
        ...current.products,
        {
          name: "",
          pricePoints: [
            { description: "", price: 1000 },
            { description: "", price: 2000 },
            { description: "", price: 3000 },
          ],
        },
      ],
    }));
  }

  function removeProduct(index: number) {
    setDraft((current) => ({
      ...current,
      products: current.products.filter((_, productIndex) => productIndex !== index),
    }));
  }

  function addPrice(productIndex: number) {
    setDraft((current) => ({
      ...current,
      products: current.products.map((product, index) =>
        index === productIndex
          ? {
              ...product,
              pricePoints: [
                ...product.pricePoints,
                { description: "", price: 0 },
              ],
            }
          : product,
      ),
    }));
  }

  function removePrice(productIndex: number, priceIndex: number) {
    setDraft((current) => ({
      ...current,
      products: current.products.map((product, index) =>
        index === productIndex
          ? {
              ...product,
              pricePoints: product.pricePoints.filter(
                (_, innerIndex) => innerIndex !== priceIndex,
              ),
            }
          : product,
      ),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await onSave(draft);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "설문을 저장하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="survey-editor">
      <div className="editor-title-row">
        <label>
          <span className="field-label">설문 제목</span>
          <input
            className="input"
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
          />
        </label>
        <button className="primary-button" disabled={saving} onClick={handleSave}>
          <Save size={18} />
          {saving ? "저장 중" : "저장"}
        </button>
      </div>

      {error ? <div className="teacher-alert" data-tone="error">{error}</div> : null}

      <section className="class-budget-card">
        <div className="class-budget-header">
          <div>
            <h3>학급별 예산</h3>
            <p>학생은 자기 학년·반에 설정된 예산 안에서 모든 상황에 돈을 나눠 씁니다.</p>
          </div>
          <button
            className="secondary-button compact-button"
            onClick={addClassBudget}
            type="button"
          >
            <Plus size={16} />
            예산 추가
          </button>
        </div>

        {draft.classBudgets.length ? (
          <div className="class-budget-list">
            <div className="class-budget-row class-budget-row-head">
              <span>학년</span>
              <span>반</span>
              <span>예산</span>
              <span className="sr-only">삭제</span>
            </div>
            {draft.classBudgets.map((classBudget, budgetIndex) => (
              <div
                className="class-budget-row"
                key={`${budgetIndex}-${classBudget.grade}-${classBudget.class_number}`}
              >
                <input
                  className="input compact-input"
                  inputMode="numeric"
                  min={1}
                  type="text"
                  value={Number.isNaN(classBudget.grade) ? "" : classBudget.grade}
                  onChange={(event) =>
                    updateClassBudget(budgetIndex, "grade", event.target.value)
                  }
                />
                <input
                  className="input compact-input"
                  inputMode="numeric"
                  min={1}
                  type="text"
                  value={
                    Number.isNaN(classBudget.class_number)
                      ? ""
                      : classBudget.class_number
                  }
                  onChange={(event) =>
                    updateClassBudget(
                      budgetIndex,
                      "class_number",
                      event.target.value,
                    )
                  }
                />
                <label>
                  <input
                    className="input compact-input price-input-num"
                    inputMode="numeric"
                    min={1}
                    type="text"
                    value={
                      Number.isNaN(classBudget.budget) ? "" : classBudget.budget
                    }
                    onChange={(event) =>
                      updateClassBudget(budgetIndex, "budget", event.target.value)
                    }
                  />
                  <span>{classBudget.budget ? formatWon(classBudget.budget) : ""}</span>
                </label>
                <button
                  aria-label="예산 삭제"
                  className="icon-button small-icon-button"
                  onClick={() => removeClassBudget(budgetIndex)}
                  type="button"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="class-budget-empty">
            예산을 추가하지 않으면 모든 학급이 제한 없이 제출할 수 있습니다.
          </div>
        )}
      </section>

      <div className="product-list">
        {draft.products.map((product, productIndex) => (
          <article
            className="product-card"
            key={`${product.id ?? "product"}-${productIndex}`}
          >
            <div className="product-card-header">
              <span className="product-num">상황 {productIndex + 1}</span>
              <label>
                <span className="field-label">상황과 상품 가격</span>
                <input
                  className="input compact-input"
                  placeholder="예: 아침을 먹지 않고 나왔는데 뚜레쥬르에서 갓 구운 빵의 향이 난다."
                  value={product.name}
                  onChange={(event) =>
                    updateProductName(productIndex, event.target.value)
                  }
                />
              </label>
              <button
                aria-label="상황 삭제"
                className="icon-button product-delete-button"
                onClick={() => removeProduct(productIndex)}
                type="button"
              >
                <Trash2 size={17} />
              </button>
            </div>

            <div className="price-table-wrap">
              <div className="price-table-head">
                <span>상황별 가격 구성</span>
                <span>가격</span>
                <span className="sr-only">삭제</span>
              </div>
              {product.pricePoints.map((pricePoint, priceIndex) => (
                <div
                  className="price-table-row"
                  key={`${productIndex}-${priceIndex}`}
                >
                  <input
                    className="input compact-input"
                    placeholder="예: 낱개 1개, 세트 구성, 할인 이벤트"
                    value={pricePoint.description}
                    onChange={(event) =>
                      updatePricePoint(
                        productIndex,
                        priceIndex,
                        "description",
                        event.target.value,
                      )
                    }
                  />
                  <input
                    className="input compact-input price-input-num"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    type="text"
                    value={Number.isNaN(pricePoint.price) ? "" : pricePoint.price}
                    onChange={(event) =>
                      updatePricePoint(
                        productIndex,
                        priceIndex,
                        "price",
                        event.target.value,
                      )
                    }
                  />
                  <button
                    aria-label="가격 삭제"
                    className="icon-button small-icon-button"
                    onClick={() => removePrice(productIndex, priceIndex)}
                    type="button"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="product-card-footer">
              <button
                className="secondary-button compact-button"
                onClick={() => addPrice(productIndex)}
                type="button"
              >
                <Plus size={16} />
                가격 추가
              </button>
              <span>
                {product.pricePoints
                  .map((pricePoint) => pricePoint.price)
                  .filter(Boolean)
                  .map(formatWon)
                  .join(" / ")}
              </span>
            </div>
          </article>
        ))}
      </div>

      <button className="secondary-button add-product-button" onClick={addProduct} type="button">
        <Plus size={18} />
        상황 추가
      </button>
    </div>
  );
}


