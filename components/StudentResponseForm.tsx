"use client";

import { Check, Minus, RefreshCw, Send, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  buildAssignmentSeed,
  buildAssignmentStorageKey,
  buildBalancedAssignments,
  hasCompleteAssignments,
  resolveAssignedPricePoints,
  type AssignmentMap,
  type AssignedPricePoint,
} from "@/lib/assignments";
import { fetchResponses, submitResponse } from "@/lib/data";
import type {
  QuantityMap,
  StudentProfile,
  StudentResponse,
  Survey,
} from "@/lib/types";
import { formatWon } from "@/lib/utils";

type StudentResponseFormProps = {
  survey: Survey;
  onSubmitted?: () => void;
};

type SubmittedSummary = {
  profile: StudentProfile;
  quantities: QuantityMap;
  assignments: AssignmentMap;
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
  const [responses, setResponses] = useState<StudentResponse[]>([]);
  const [assignments, setAssignments] = useState<AssignmentMap>({});
  const [quantities, setQuantities] = useState<QuantityMap>({});
  const [status, setStatus] = useState("");
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSummary, setSubmittedSummary] = useState<SubmittedSummary | null>(
    null,
  );

  useEffect(() => {
    let alive = true;
    setLoadingAssignments(true);

    fetchResponses(survey.id)
      .then((items) => {
        if (alive) {
          setResponses(items);
        }
      })
      .catch(() => {
        if (alive) {
          setResponses([]);
        }
      })
      .finally(() => {
        if (alive) {
          setLoadingAssignments(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [survey.id]);

  useEffect(() => {
    if (loadingAssignments) {
      return;
    }

    const storageKey = buildAssignmentStorageKey(survey.id, profile);
    const seed = buildAssignmentSeed(survey.id, profile);
    const stored =
      typeof window === "undefined" ? null : window.localStorage.getItem(storageKey);
    let nextAssignments = stored ? (JSON.parse(stored) as AssignmentMap) : null;

    if (!nextAssignments || !hasCompleteAssignments(survey, nextAssignments)) {
      nextAssignments = buildBalancedAssignments(survey, responses, seed);
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(nextAssignments));
    }

    setAssignments(nextAssignments);
    setQuantities((current) => {
      const assignedIds = new Set(Object.values(nextAssignments));
      return Object.fromEntries(
        Object.entries(current).filter(([pricePointId]) =>
          assignedIds.has(pricePointId),
        ),
      );
    });
  }, [loadingAssignments, profile, responses, survey]);

  const assignedRows = useMemo(
    () => resolveAssignedPricePoints(survey, assignments),
    [survey, assignments],
  );

  const answeredCount = assignedRows.filter(({ pricePoint }) =>
    Object.prototype.hasOwnProperty.call(quantities, pricePoint.id),
  ).length;
  const totalCount = assignedRows.length;
  const progress = totalCount ? Math.round((answeredCount / totalCount) * 100) : 0;

  function clampQuantity(value: number) {
    return Math.min(100, Math.max(0, Math.round(value)));
  }

  function setQuantity(pricePointId: string, value: string) {
    const numeric = Number(value);
    setQuantities((current) => ({
      ...current,
      [pricePointId]: Number.isFinite(numeric) ? clampQuantity(numeric) : 0,
    }));
  }

  function stepQuantity(pricePointId: string, delta: number) {
    setQuantities((current) => {
      const nextValue = clampQuantity((current[pricePointId] ?? 0) + delta);
      return {
        ...current,
        [pricePointId]: nextValue,
      };
    });
  }

  function validate() {
    if (!profile.student_name.trim()) {
      return "이름 또는 닉네임을 입력해 주세요.";
    }

    if (
      [profile.grade, profile.class_number, profile.student_number].some(
        (value) => !Number.isInteger(value) || value <= 0,
      )
    ) {
      return "학년, 반, 번호는 1 이상의 정수로 입력해 주세요.";
    }

    if (!assignedRows.length) {
      return "응답할 상황별 가격 구성이 없습니다.";
    }

    const missing = assignedRows.some(
      ({ pricePoint }) =>
        !Object.prototype.hasOwnProperty.call(quantities, pricePoint.id),
    );

    if (missing) {
      return "모든 상황에 대해 구매량을 입력해 주세요.";
    }

    const invalid = assignedRows.some(({ pricePoint }) => {
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
      const trimmedProfile = {
        ...profile,
        student_name: profile.student_name.trim(),
      };
      const assignedQuantities = Object.fromEntries(
        assignedRows.map(({ pricePoint }) => [
          pricePoint.id,
          quantities[pricePoint.id] ?? 0,
        ]),
      );

      await submitResponse(survey, trimmedProfile, assignedQuantities);
      setSubmittedSummary({
        profile: trimmedProfile,
        quantities: assignedQuantities,
        assignments,
      });
      setStatus("응답을 제출했습니다.");
      setQuantities({});
      onSubmitted?.();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "응답 제출 중 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedSummary) {
    const receiptRows = resolveAssignedPricePoints(
      survey,
      submittedSummary.assignments,
    ).map(({ product, pricePoint }) => ({
      key: product.name,
      price: formatWon(pricePoint.price),
      description: pricePoint.description || "상황별 가격 구성",
      value: `${submittedSummary.quantities[pricePoint.id] ?? 0}개`,
    }));

    return (
      <section className="student-success-shell">
        <div className="success-icon">
          <Check size={38} />
        </div>
        <h2>응답 완료!</h2>
        <p>
          수요 조사에 참여해 줘서 고마워요.
          <br />
          선생님이 곧 결과를 함께 확인할 거예요.
        </p>

        <div className="receipt-card">
          <div className="receipt-title">제출 내역</div>
          <div className="receipt-row">
            <span className="receipt-key">조사</span>
            <span className="receipt-val">{survey.title}</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-key">학생</span>
            <span className="receipt-val">
              {submittedSummary.profile.grade}학년{" "}
              {submittedSummary.profile.class_number}반 ·{" "}
              {submittedSummary.profile.student_name}
            </span>
          </div>
          {receiptRows.map((row) => (
            <div className="receipt-row" key={`${row.key}-${row.price}`}>
              <span className="receipt-key">
                {row.key} · {row.description} · {row.price}
              </span>
              <span className="receipt-val">{row.value}</span>
            </div>
          ))}
        </div>

        <button
          className="student-retry-btn"
          onClick={() => {
            setSubmittedSummary(null);
            setStatus("");
          }}
          type="button"
        >
          <RefreshCw size={16} />
          다시 응답하기
        </button>
      </section>
    );
  }

  return (
    <form className="student-form" onSubmit={handleSubmit}>
      <section className="info-section">
        <div className="section-label">내 정보</div>
        <div className="info-grid">
          <label>
            <span className="field-label">학년</span>
            <input
              className="input"
              min={1}
              type="number"
              value={profile.grade}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  grade: Number(event.target.value),
                }))
              }
            />
          </label>
          <label>
            <span className="field-label">반</span>
            <input
              className="input"
              min={1}
              type="number"
              value={profile.class_number}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  class_number: Number(event.target.value),
                }))
              }
            />
          </label>
          <label>
            <span className="field-label">번호</span>
            <input
              className="input"
              min={1}
              type="number"
              value={profile.student_number}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  student_number: Number(event.target.value),
                }))
              }
            />
          </label>
          <label className="name-field">
            <span className="field-label">이름 / 닉네임</span>
            <input
              className="input name-input"
              placeholder="예: 김민지"
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

      {loadingAssignments ? (
        <section className="student-product-section">
          <div className="student-product-header">
            <h2>상황별 가격 구성을 불러오는 중</h2>
          </div>
        </section>
      ) : null}

      {assignedRows.map(({ product, pricePoint }, productIndex) => (
        <AssignedProductCard
          key={product.id}
          product={product}
          pricePoint={pricePoint}
          productIndex={productIndex}
          quantity={quantities[pricePoint.id]}
          onSetQuantity={setQuantity}
          onStepQuantity={stepQuantity}
        />
      ))}

      {status ? (
        <div className="student-status" data-error={status !== "응답을 제출했습니다."}>
          {status}
        </div>
      ) : null}

      <div className="submit-bar">
        <div className="submit-bar-inner">
          <div className="progress-wrap">
            <div className="progress-label">
              {answeredCount === totalCount
                ? "모든 상황 입력 완료"
                : `${answeredCount} / ${totalCount} 상황 입력`}
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <button className="submit-btn" disabled={submitting}>
            <Send size={17} />
            {submitting ? "제출 중" : "제출"}
          </button>
        </div>
      </div>
    </form>
  );
}

type AssignedProductCardProps = AssignedPricePoint & {
  productIndex: number;
  quantity: number | undefined;
  onSetQuantity: (pricePointId: string, value: string) => void;
  onStepQuantity: (pricePointId: string, delta: number) => void;
};

function AssignedProductCard({
  product,
  pricePoint,
  productIndex,
  quantity,
  onSetQuantity,
  onStepQuantity,
}: AssignedProductCardProps) {
  const answered = typeof quantity === "number";
  const filled = answered && quantity > 0;

  return (
    <section className="student-product-section">
      <div className="student-product-header">
        <div className="student-product-icon">
          {String(productIndex + 1).padStart(2, "0")}
        </div>
        <h2>{product.name}</h2>
        <span>배정된 가격 구성</span>
      </div>

      <div className="student-price-card" data-filled={filled}>
        <div className="student-price-desc">
          {pricePoint.description || "상황별 가격 구성"}
        </div>
        <p>
          가격이{" "}
          <span className="student-price-pill">
            <WalletCards size={13} />
            {formatWon(pricePoint.price)}
          </span>
          이라면 얼마나 살래?
        </p>
        <div className="quantity-row">
          <div className="stepper">
            <button
              className="stepper-btn"
              onClick={() => onStepQuantity(pricePoint.id, -1)}
              type="button"
            >
              <Minus size={18} />
            </button>
            <input
              className="stepper-val"
              inputMode="numeric"
              max={100}
              min={0}
              step={1}
              type="number"
              value={answered ? quantity : ""}
              onChange={(event) => onSetQuantity(pricePoint.id, event.target.value)}
            />
            <button
              className="stepper-btn"
              onClick={() => onStepQuantity(pricePoint.id, 1)}
              type="button"
            >
              +
            </button>
          </div>
          <span className="stepper-hint">개 (0~100)</span>
        </div>
      </div>
    </section>
  );
}
