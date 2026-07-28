"use client";

import { BarChart3, Check, Minus, Send, WalletCards } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  hasCompleteAssignments,
  resolveAssignedPricePoints,
  type AssignedPricePoint,
  type AssignmentMap,
} from "@/lib/assignments";
import { reserveAssignments, submitResponse } from "@/lib/data";
import {
  buildStudentResultHref,
  STUDENT_RESULT_PROFILE_KEY,
  writeStoredStudentSubmission,
} from "@/lib/studentResultProfile";
import type {
  QuantityMap,
  StudentProfile,
  Survey,
} from "@/lib/types";
import { formatWon } from "@/lib/utils";

type StudentResponseFormProps = {
  survey: Survey;
  onSubmitted?: () => void;
  resultHref?: string;
  roomName?: string;
};

type SubmittedSummary = {
  profile: StudentProfile;
  quantities: QuantityMap;
  assignments: AssignmentMap;
};

export function StudentResponseForm({
  resultHref,
  roomName,
  survey,
  onSubmitted,
}: StudentResponseFormProps) {
  const [profile, setProfile] = useState<StudentProfile>({
    grade: 3,
    class_number: 1,
    student_number: 1,
    student_name: "",
  });
  const [assignments, setAssignments] = useState<AssignmentMap>({});
  const [quantities, setQuantities] = useState<QuantityMap>({});
  const [status, setStatus] = useState("");
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSummary, setSubmittedSummary] =
    useState<SubmittedSummary | null>(null);

  useEffect(() => {
    setAssignments({});
    setQuantities({});
    setStatus("");
  }, [survey.id]);

  const assignedRows = useMemo(
    () => resolveAssignedPricePoints(survey, assignments),
    [survey, assignments],
  );
  const hasAssignments = hasCompleteAssignments(survey, assignments);
  const hasValidProfile =
    profile.student_name.trim().length > 0 &&
    [profile.grade, profile.class_number].every(
      (value) => Number.isInteger(value) && value > 0,
    );

  const answeredCount = assignedRows.filter(({ pricePoint }) =>
    Object.prototype.hasOwnProperty.call(quantities, pricePoint.id),
  ).length;
  const totalCount = assignedRows.length;
  const progress = totalCount ? Math.round((answeredCount / totalCount) * 100) : 0;
  const matchedBudget = useMemo(
    () =>
      (survey.class_budgets ?? []).find(
        (classBudget) =>
          classBudget.grade === profile.grade &&
          classBudget.class_number === profile.class_number,
      ),
    [profile.class_number, profile.grade, survey.class_budgets],
  );
  const spentAmount = useMemo(
    () =>
      assignedRows.reduce(
        (sum, { pricePoint }) =>
          sum + pricePoint.price * (quantities[pricePoint.id] ?? 0),
        0,
      ),
    [assignedRows, quantities],
  );
  const remainingAmount = matchedBudget
    ? matchedBudget.budget - spentAmount
    : null;
  const isOverBudget =
    typeof remainingAmount === "number" && remainingAmount < 0;
  const budgetMessage = isOverBudget
    ? `예산을 ${formatWon(Math.abs(remainingAmount))} 초과했습니다. 수량을 줄여 주세요.`
    : "";

  function updateProfile(nextProfile: StudentProfile) {
    setProfile(nextProfile);
    setAssignments({});
    setQuantities({});
    setStatus("");
  }

  async function handleReserveAssignments() {
    if (!hasValidProfile) {
      setStatus("학년, 반, 이름을 먼저 입력해 주세요.");
      return;
    }

    setLoadingAssignments(true);
    setStatus("");

    try {
      const cleanProfile = {
        ...profile,
        student_number: 1,
        student_name: profile.student_name.trim(),
      };
      const nextAssignments = await reserveAssignments(survey, cleanProfile, roomName);

      if (!hasCompleteAssignments(survey, nextAssignments)) {
        throw new Error("가격 배정을 완료하지 못했습니다. 새로고침 후 다시 시도해 주세요.");
      }

      setProfile(cleanProfile);
      setAssignments(nextAssignments);
      setQuantities((current) => {
        const assignedIds = new Set(Object.values(nextAssignments));
        return Object.fromEntries(
          Object.entries(current).filter(([pricePointId]) =>
            assignedIds.has(pricePointId),
          ),
        );
      });
      setStatus("");
    } catch (error) {
      setAssignments({});
      setQuantities({});
      setStatus(
        error instanceof Error
          ? error.message
          : "가격 배정 중 오류가 발생했습니다.",
      );
    } finally {
      setLoadingAssignments(false);
    }
  }

  function clampQuantity(value: number) {
    return Math.min(100, Math.max(0, Math.round(value)));
  }

  function setQuantity(pricePointId: string, value: string) {
    const numeric = Number(value);
    setStatus("");
    setQuantities((current) => ({
      ...current,
      [pricePointId]: Number.isFinite(numeric) ? clampQuantity(numeric) : 0,
    }));
  }

  function stepQuantity(pricePointId: string, delta: number) {
    setStatus("");
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
      [profile.grade, profile.class_number].some(
        (value) => !Number.isInteger(value) || value <= 0,
      )
    ) {
      return "학년과 반은 1 이상의 정수로 입력해 주세요.";
    }

    if (!hasAssignments || !assignedRows.length) {
      return "가격 배정을 먼저 받아 주세요.";
    }

    const missing = assignedRows.some(
      ({ pricePoint }) =>
        !Object.prototype.hasOwnProperty.call(quantities, pricePoint.id),
    );

    if (missing) {
      return "모든 상황에 대한 구매량을 입력해 주세요.";
    }

    const invalid = assignedRows.some(({ pricePoint }) => {
      const value = quantities[pricePoint.id] ?? 0;
      return !Number.isInteger(value) || value < 0 || value > 100;
    });

    if (invalid) {
      return "구매량은 0부터 100까지의 정수만 입력할 수 있습니다.";
    }

    if (isOverBudget) {
      return budgetMessage;
    }

    return "";
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
        student_number: 1,
        student_name: profile.student_name.trim(),
      };
      const assignedQuantities = Object.fromEntries(
        assignedRows.map(({ pricePoint }) => [
          pricePoint.id,
          quantities[pricePoint.id] ?? 0,
        ]),
      );

      const responseId = await submitResponse(
        survey,
        trimmedProfile,
        assignedQuantities,
        roomName,
      );
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          STUDENT_RESULT_PROFILE_KEY,
          JSON.stringify(trimmedProfile),
        );
      }
      if (roomName) {
        writeStoredStudentSubmission(
          roomName,
          survey.id,
          trimmedProfile,
          typeof responseId === "string" ? responseId : undefined,
        );
      }
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

        <div className="receipt-card">
          <div className="receipt-title">제출 내역</div>
          <div className="receipt-row">
            <span className="receipt-key">설문</span>
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

        <p className="student-result-callout">
          활동지를 먼저 작성하세요.
          <br />
          그 후에, 버튼을 눌러 결과를 확인하세요.
        </p>

        <Link
          className="student-retry-btn"
          href={buildStudentResultHref(
            resultHref ?? "/student/results",
            submittedSummary.profile,
          )}
        >
          <BarChart3 size={16} />
          결과 분석하기
        </Link>
      </section>
    );
  }

  return (
    <form className="student-form" onSubmit={handleSubmit}>
      <section className="info-section">
        <div className="section-label">학생 정보</div>
        <p className="privacy-inline-notice">
          이름 대신 선생님이 안내한 별명을 사용할 수 있어요. 연락처, 주소,
          계정 정보처럼 수업과 관계없는 개인정보는 입력하지 마세요.
        </p>
        <div className="info-grid">
          <label>
            <span className="field-label">학년</span>
            <input
              className="input"
              min={1}
              type="number"
              value={profile.grade}
              onChange={(event) =>
                updateProfile({
                  ...profile,
                  grade: Number(event.target.value),
                })
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
                updateProfile({
                  ...profile,
                  class_number: Number(event.target.value),
                })
              }
            />
          </label>
          <label className="name-field">
            <span className="field-label">이름 / 수업용 별명</span>
            <input
              className="input name-input"
              placeholder="예: 김민지"
              value={profile.student_name}
              onChange={(event) =>
                updateProfile({
                  ...profile,
                  student_name: event.target.value,
                })
              }
            />
          </label>
        </div>
      </section>

      <section className="student-product-section">
        <div className="student-product-header">
          <div className="student-product-icon">?</div>
          <h2>{hasAssignments ? "가격 배정 완료" : "가격 배정받기"}</h2>
        </div>
        <div className="student-price-card" data-filled={hasAssignments}>
          <p>
            학생 정보를 입력한 뒤 가격을 배정받으면 상황별 구매량을 입력할 수 있습니다.
          </p>
          <button
            className="primary-button compact-button"
            disabled={!hasValidProfile || loadingAssignments || submitting}
            onClick={handleReserveAssignments}
            type="button"
          >
            {loadingAssignments
              ? "배정 중"
              : hasAssignments
                ? "다시 배정 확인"
                : "가격 배정받기"}
          </button>
        </div>
      </section>

      <section className="student-budget-card" data-over={isOverBudget}>
        <div className="student-budget-head">
          <div>
            <span>나의 예산</span>
            <strong>
              {matchedBudget ? formatWon(matchedBudget.budget) : "예산 미설정"}
            </strong>
            {matchedBudget ? (
              <p className="student-budget-note">
                남겨도 되지만, 넘기면 안 됩니다.
              </p>
            ) : null}
          </div>
          <span className="student-budget-class">
            {profile.grade}학년 {profile.class_number}반
          </span>
        </div>
        {matchedBudget ? (
          <>
            <div className="student-budget-meter">
              <span
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((spentAmount / matchedBudget.budget) * 100),
                  )}%`,
                }}
              />
            </div>
            <div className="student-budget-stats">
              <div>
                <span>사용한 금액</span>
                <strong>{formatWon(spentAmount)}</strong>
              </div>
              <div>
                <span>{isOverBudget ? "초과 금액" : "남은 금액"}</span>
                <strong>
                  {formatWon(Math.abs(remainingAmount ?? matchedBudget.budget))}
                </strong>
              </div>
            </div>
          </>
        ) : (
          <p>이 학급에는 예산이 설정되지 않아 제한 없이 제출할 수 있습니다.</p>
        )}
      </section>

      {hasAssignments
        ? assignedRows.map(({ product, pricePoint }, productIndex) => (
            <AssignedProductCard
              key={product.id}
              product={product}
              pricePoint={pricePoint}
              productIndex={productIndex}
              quantity={quantities[pricePoint.id]}
              onSetQuantity={setQuantity}
              onStepQuantity={stepQuantity}
            />
          ))
        : null}

      {status || budgetMessage ? (
        <div
          className="student-status"
          data-error={(status || budgetMessage) !== "응답을 제출했습니다."}
        >
          {status || budgetMessage}
        </div>
      ) : null}

      <div className="submit-bar">
        <div className="submit-bar-inner">
          <div className="progress-wrap">
            <div className="progress-label">
              {!hasAssignments
                ? "가격 배정 대기"
                : answeredCount === totalCount
                  ? "모든 상황 입력 완료"
                  : `${answeredCount} / ${totalCount} 상황 입력`}
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <button
            className="submit-btn"
            disabled={!hasAssignments || submitting || isOverBudget}
          >
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
