"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { buildStudentPath } from "@/lib/roomName";

type TeacherShellProps = {
  active:
    | "dashboard"
    | "setup"
    | "responses"
    | "results"
    | "budget-results"
    | "guide";
  children: ReactNode;
  roomName?: string;
};

const navItems = [
  { id: "dashboard", href: "/teacher", label: "대시보드" },
  { id: "setup", href: "/teacher/setup", label: "설문 세팅" },
  { id: "responses", href: "/teacher/responses", label: "응답 관리" },
  { id: "results", href: "/teacher/results", label: "결과 확인" },
  { id: "budget-results", href: "/teacher/budget-results", label: "예산별 결과" },
  { id: "guide", href: "/teacher/guide", label: "활용 안내" },
] as const;

const REVIEW_VISIT_THRESHOLD = 5;
const DEFAULT_REVIEW_URL = "https://blog.naver.com/yadoransw/224282983636";
const REVIEW_URL = process.env.NEXT_PUBLIC_TEACHER_REVIEW_URL ?? DEFAULT_REVIEW_URL;
const REVIEW_VISIT_COUNT_KEY = "demand-app-teacher-review-visit-count";
const REVIEW_DISMISSED_KEY = "demand-app-teacher-review-dismissed";
const REVIEW_SNOOZED_KEY = "demand-app-teacher-review-snoozed";
const NEXT_LESSON_URL = "https://blog.naver.com/yadoransw/224298756242";
const NEXT_LESSON_DISMISSED_KEY = "demand-app-teacher-next-lesson-dismissed";
const NEXT_LESSON_SNOOZED_KEY = "demand-app-teacher-next-lesson-snoozed";

export function TeacherShell({ active, children, roomName = "" }: TeacherShellProps) {
  const [isReviewPromptVisible, setIsReviewPromptVisible] = useState(false);

  return (
    <div className="teacher-shell">
      <nav className="teacher-top-tabs" aria-label="교사용 빠른 이동">
        {navItems.map((item) => (
          <Link
            className="teacher-top-tab"
            data-active={active === item.id}
            href={item.href}
            key={item.id}
          >
            {item.label}
          </Link>
        ))}
        <span className="teacher-top-tab-divider" />
        <Link className="teacher-top-tab-student" href={buildStudentPath(roomName)}>
          학생 화면 →
        </Link>
      </nav>
      <main className={`teacher-main ${active === "guide" ? "teacher-main-guide" : ""}`}>
        {children}
      </main>
      {isReviewPromptVisible ? null : <TeacherNextLessonCard />}
      <TeacherReviewPrompt onVisibilityChange={setIsReviewPromptVisible} />
    </div>
  );
}

function TeacherNextLessonCard() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const isDismissed = window.localStorage.getItem(NEXT_LESSON_DISMISSED_KEY) === "true";
    const isSnoozed = window.sessionStorage.getItem(NEXT_LESSON_SNOOZED_KEY) === "true";

    if (!isDismissed && !isSnoozed) {
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) {
    return null;
  }

  const closeForSession = () => {
    window.sessionStorage.setItem(NEXT_LESSON_SNOOZED_KEY, "true");
    setIsVisible(false);
  };

  const dismissPermanently = () => {
    window.localStorage.setItem(NEXT_LESSON_DISMISSED_KEY, "true");
    setIsVisible(false);
  };

  return (
    <aside className="teacher-next-lesson-card" aria-label="다음 수업 추천">
      <button
        aria-label="다음 수업 추천 닫기"
        className="teacher-next-lesson-close"
        onClick={closeForSession}
        type="button"
      >
        ×
      </button>
      <p className="teacher-eyebrow">수업 확장 아이디어</p>
      <h2>다음 수업에는 이 활동 어떠세요?</h2>
      <p>수요곡선 활동 다음에 이어가기 좋은 수업안을 준비했어요.</p>
      <div className="teacher-next-lesson-actions">
        <a
          className="primary-button compact-button"
          href={NEXT_LESSON_URL}
          rel="noreferrer"
          target="_blank"
        >
          활동 보기
        </a>
        <button className="teacher-review-dismiss" onClick={dismissPermanently} type="button">
          다시 보지 않기
        </button>
      </div>
    </aside>
  );
}

function TeacherReviewPrompt({
  onVisibilityChange,
}: {
  onVisibilityChange: (isVisible: boolean) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const hasTrackedVisit = useRef(false);

  useEffect(() => {
    onVisibilityChange(isVisible);
  }, [isVisible, onVisibilityChange]);

  useEffect(() => {
    if (hasTrackedVisit.current || typeof window === "undefined") {
      return;
    }

    hasTrackedVisit.current = true;

    const isDismissed = window.localStorage.getItem(REVIEW_DISMISSED_KEY) === "true";
    const isSnoozed = window.sessionStorage.getItem(REVIEW_SNOOZED_KEY) === "true";

    if (isDismissed || isSnoozed) {
      return;
    }

    const previousVisitCount = Number(
      window.localStorage.getItem(REVIEW_VISIT_COUNT_KEY) ?? "0",
    );
    const nextVisitCount = Number.isFinite(previousVisitCount)
      ? previousVisitCount + 1
      : 1;

    window.localStorage.setItem(REVIEW_VISIT_COUNT_KEY, String(nextVisitCount));

    if (nextVisitCount >= REVIEW_VISIT_THRESHOLD) {
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) {
    return null;
  }

  const closeForSession = () => {
    window.sessionStorage.setItem(REVIEW_SNOOZED_KEY, "true");
    setIsVisible(false);
  };

  const dismissPermanently = () => {
    window.localStorage.setItem(REVIEW_DISMISSED_KEY, "true");
    setIsVisible(false);
  };

  const handleReviewClick = () => {
    window.localStorage.setItem(REVIEW_DISMISSED_KEY, "true");
  };

  return (
    <div className="teacher-review-backdrop" role="presentation">
      <section
        aria-labelledby="teacher-review-title"
        aria-modal="true"
        className="teacher-review-dialog"
        role="dialog"
      >
        <p className="teacher-eyebrow">짧은 후기 요청</p>
        <h2 id="teacher-review-title">이 수업 도구가 유용하셨나요?</h2>
        <p>
          아래 링크를 방문하여 후기를 남겨주세요. 남겨주신 의견은 수업 도구를 더
          다듬는 데 큰 도움이 됩니다.
        </p>
        <div className="teacher-review-actions">
          {REVIEW_URL ? (
            <a
              className="primary-button compact-button"
              href={REVIEW_URL}
              onClick={handleReviewClick}
              rel="noreferrer"
              target="_blank"
            >
              후기 남기기
            </a>
          ) : (
            <button className="primary-button compact-button" disabled type="button">
              후기 링크 준비 중
            </button>
          )}
          <button className="secondary-button compact-button" onClick={closeForSession} type="button">
            나중에
          </button>
          <button className="teacher-review-dismiss" onClick={dismissPermanently} type="button">
            다시 보지 않기
          </button>
        </div>
      </section>
    </div>
  );
}

type TeacherPageHeaderProps = {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
};

export function TeacherPageHeader({
  title,
  description,
  eyebrow,
  actions,
}: TeacherPageHeaderProps) {
  return (
    <header className="teacher-page-header">
      <div>
        {eyebrow ? <p className="teacher-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="teacher-header-actions">{actions}</div> : null}
    </header>
  );
}

export function StatusBadge({
  tone = "blue",
  children,
}: {
  tone?: "blue" | "green" | "warn";
  children: ReactNode;
}) {
  return (
    <span className="status-badge" data-tone={tone}>
      {children}
    </span>
  );
}
