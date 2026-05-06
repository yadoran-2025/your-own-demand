"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { SurveyDraft } from "@/lib/types";
import { createDefaultDraft } from "@/lib/data";
import { formatWon } from "@/lib/utils";

type SurveyEditorProps = {
  initialDraft?: SurveyDraft;
  onSave: (draft: SurveyDraft) => Promise<void>;
};

export function SurveyEditor({ initialDraft, onSave }: SurveyEditorProps) {
  const [draft, setDraft] = useState<SurveyDraft>(
    initialDraft ?? createDefaultDraft(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(initialDraft ?? createDefaultDraft());
  }, [initialDraft]);

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
                      [field]: field === "price" ? Number(value) : value,
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
              pricePoints: product.pricePoints.filter((_, innerIndex) => innerIndex !== priceIndex),
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
          : "조사를 저장하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="surface rounded-lg p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="field-label">조사 제목</span>
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

      {error ? <p className="mt-3 text-sm font-bold text-[var(--color-error-text)]">{error}</p> : null}

      <div className="mt-5 grid gap-4">
        {draft.products.map((product, productIndex) => (
          <article
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4"
            key={`${product.id ?? "product"}-${productIndex}`}
          >
            <div className="flex items-center gap-2">
              <label className="flex-1">
                <span className="field-label">상품명</span>
                <input
                  className="input"
                  placeholder="예: 햄버거"
                  value={product.name}
                  onChange={(event) =>
                    updateProductName(productIndex, event.target.value)
                  }
                />
              </label>
              <button
                aria-label="상품 삭제"
                className="icon-button mt-6"
                onClick={() => removeProduct(productIndex)}
                type="button"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="mt-4">
              <span className="field-label">가격 구간</span>
              <div className="grid gap-2">
                <div className="grid grid-cols-[1fr_9rem_2.5rem] gap-2 px-1 text-sm font-black text-[var(--text-muted)]">
                  <span>설명</span>
                  <span>가격</span>
                  <span className="sr-only">삭제</span>
                </div>
                {product.pricePoints.map((pricePoint, priceIndex) => (
                  <div
                    className="grid grid-cols-[1fr_9rem_2.5rem] items-center gap-2"
                    key={`${pricePoint.price}-${priceIndex}`}
                  >
                    <input
                      className="input"
                      placeholder="예: 버거킹 와퍼 할인행사, 3개 묶음"
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
                      className="input text-right"
                      min={1}
                      step={100}
                      type="number"
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
                      className="icon-button"
                      onClick={() => removePrice(productIndex, priceIndex)}
                      type="button"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  className="secondary-button"
                  onClick={() => addPrice(productIndex)}
                  type="button"
                >
                  <Plus size={18} />
                  가격 추가
                </button>
                <span className="text-sm text-[var(--text-muted)]">
                  {product.pricePoints
                    .map((pricePoint) => pricePoint.price)
                    .filter(Boolean)
                    .map(formatWon)
                    .join(" / ")}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>

      <button className="secondary-button mt-4" onClick={addProduct} type="button">
        <Plus size={18} />
        상품 추가
      </button>
    </section>
  );
}


