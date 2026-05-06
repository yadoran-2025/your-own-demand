"use client";

import { Send } from "lucide-react";
import { useMemo, useState } from "react";
import { submitResponse } from "@/lib/data";
import type { QuantityMap, StudentProfile, Survey } from "@/lib/types";
import { formatWon } from "@/lib/utils";

type StudentResponseFormProps = {
  survey: Survey;
  onSubmitted?: () => void;
};

export function StudentResponseForm({
  survey,
  onSubmitted,
}: StudentResponseFormProps) {
  const [profile, setProfile] = useState<StudentProfile>({
    grade: 3,
    class_number: 1,
    student_number: 1,
    student_name: "",
  });
  const [quantities, setQuantities] = useState<QuantityMap>({});
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allPricePoints = useMemo(
    () => survey.products.flatMap((product) => product.price_points),
    [survey],
  );

  function setQuantity(pricePointId: string, value: string) {
    const numeric = Number(value);
    setQuantities((current) => ({
      ...current,
      [pricePointId]: Number.isFinite(numeric) ? numeric : 0,
    }));
  }

  function validate() {
    if (!profile.student_name.trim()) {
      return "이름 또는 닉네임을 입력해 주세요.";
    }

    if (
      [profile.grade, profile.class_number].some(
        (value) => !Number.isInteger(value) || value <= 0,
      )
    ) {
      return "학년과 반은 1 이상의 정수로 입력해 주세요.";
    }

    const invalid = allPricePoints.some((pricePoint) => {
      const value = quantities[pricePoint.id] ?? 0;
      return !Number.isInteger(value) || value < 0 || value > 100;
    });

    return invalid ? "구매량은 0부터 100까지의 정수만 입력할 수 있습니다." : "";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationMessage = validate();
    setStatus(validationMessage);

    if (validationMessage) {
      return;
    }

    setSubmitting(true);
    try {
      await submitResponse(survey, {
        ...profile,
        student_name: profile.student_name.trim(),
      }, quantities);
      setStatus("응답이 제출되었습니다.");
      setQuantities({});
      onSubmitted?.();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "응답 제출 중 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <section className="surface rounded-lg p-5">
        <h2 className="text-xl font-black">학생 정보</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ["grade", "학년"],
            ["class_number", "반"],
          ].map(([key, label]) => (
            <label key={key}>
              <span className="field-label">{label}</span>
              <input
                className="input"
                min={1}
                type="number"
                value={profile[key as keyof StudentProfile]}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    [key]: Number(event.target.value),
                  }))
                }
              />
            </label>
          ))}
          <label>
            <span className="field-label">이름 또는 닉네임</span>
            <input
              className="input"
              value={profile.student_name}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  student_name: event.target.value,
                }))
              }
            />
          </label>
        </div>
      </section>

      {survey.products.map((product) => (
        <section className="surface rounded-lg p-5" key={product.id}>
          <h2 className="text-xl font-black">{product.name}</h2>
          <div className="mt-4 grid gap-3">
            {product.price_points.map((pricePoint) => (
              <label
                className="grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4"
                key={pricePoint.id}
              >
                <span className="grid gap-2">
                  <span className="text-sm font-black text-[var(--brand)]">가격 조건</span>
                  <strong className="block text-lg leading-7">
                    {pricePoint.description || "가격 조건"}
                  </strong>
                </span>
                <span className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="text-base font-black">
                    가격이 {formatWon(pricePoint.price)}이라면?
                  </span>
                  <input
                    className="input quantity-input"
                    inputMode="numeric"
                    max={100}
                    min={0}
                    step={1}
                    type="number"
                    value={quantities[pricePoint.id] ?? ""}
                    onChange={(event) =>
                      setQuantity(pricePoint.id, event.target.value)
                    }
                  />
                  <span className="font-black">개를 산다.</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      ))}

      {status ? <p className="font-bold text-[var(--brand)]">{status}</p> : null}

      <button className="primary-button w-full sm:w-auto" disabled={submitting}>
        <Send size={19} />
        {submitting ? "제출 중" : "응답 제출"}
      </button>
    </form>
  );
}


