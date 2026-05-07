"use client";

import Link from "next/link";
import { BarChart3, ClipboardList, Clock, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  StatusBadge,
  TeacherPageHeader,
  TeacherShell,
} from "@/components/TeacherShell";
import { fetchResponses, fetchSurveys, hasRemoteDatabase } from "@/lib/data";
import type { StudentResponse, Survey } from "@/lib/types";

function formatRelativeTime(value: string) {
  const created = new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round((Date.now() - created) / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  return `${Math.round(diffHours / 24)}일 전`;
}

export default function TeacherPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<StudentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const activeSurvey = surveys[0];

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const nextSurveys = await fetchSurveys();
      setSurveys(nextSurveys);

      if (nextSurveys[0]) {
        setResponses(await fetchResponses(nextSurveys[0].id));
      } else {
        setResponses([]);
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "대시보드를 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const classCount = useMemo(
    () =>
      new Set(
        responses.map(
          (response) => `${response.grade}-${response.class_number}`,
        ),
      ).size,
    [responses],
  );

  const todayResponses = useMemo(() => {
    const today = new Date().toDateString();
    return responses.filter(
      (response) => new Date(response.created_at).toDateString() === today,
    ).length;
  }, [responses]);

  const productCount = activeSurvey?.products.length ?? 0;
  const lastResponse = responses[0];

  return (
    <TeacherShell active="dashboard">
      <TeacherPageHeader
        description="조사를 준비하고 실시간 응답 결과를 확인하세요."
        title="교사 대시보드"
      />

      {!hasRemoteDatabase ? (
        <div className="teacher-alert" data-tone="warn">
          Supabase 환경변수가 없어서 localStorage 데모 모드로 동작합니다.
        </div>
      ) : null}
      {message ? <div className="teacher-alert">{message}</div> : null}

      <section className="active-survey-bar">
        <div className="active-survey-left">
          <span className="active-survey-dot" />
          <div>
            <h2>{activeSurvey?.title ?? "아직 활성 조사가 없습니다"}</h2>
            <p>
              {activeSurvey
                ? `${productCount}개 상황 · ${
                    lastResponse
                      ? `마지막 응답 ${formatRelativeTime(lastResponse.created_at)}`
                      : "응답 대기 중"
                  }`
                : "조사 세팅에서 첫 조사를 저장해 주세요."}
            </p>
          </div>
        </div>
        <div className="teacher-inline-actions">
          <Link className="secondary-button compact-button" href="/teacher/setup">
            세팅 수정
          </Link>
          <Link className="primary-button compact-button" href="/teacher/results">
            <BarChart3 size={16} />
            결과 보기
          </Link>
        </div>
      </section>

      <section className="teacher-stat-grid" aria-label="대시보드 요약">
        <article className="teacher-stat-card">
          <span>총 응답 수</span>
          <strong>{responses.length}</strong>
          <p>오늘 +{todayResponses}명 응답</p>
        </article>
        <article className="teacher-stat-card">
          <span>참여 학급</span>
          <strong>{classCount}</strong>
          <p>{classCount ? "응답 기준 집계" : "아직 응답 없음"}</p>
        </article>
        <article className="teacher-stat-card">
          <span>저장된 조사</span>
          <strong>{surveys.length}</strong>
          <p>{activeSurvey ? "활성 1개" : "새 조사 필요"}</p>
        </article>
      </section>

      <section className="teacher-action-grid">
        <Link className="teacher-action-card" href="/teacher/setup">
          <span className="teacher-action-icon">
            <ClipboardList size={24} />
          </span>
          <h2>조사 세팅</h2>
          <p>조사 제목, 상황과 상품 가격, 상황별 가격 구성을 추가하고 수정합니다.</p>
          <strong>세팅하러 가기</strong>
        </Link>
        <Link className="teacher-action-card" href="/teacher/results">
          <span className="teacher-action-icon">
            <BarChart3 size={24} />
          </span>
          <h2>결과 확인</h2>
          <p>학생 응답을 수요곡선으로 보고 학년과 반 기준으로 비교합니다.</p>
          <strong>결과 보러 가기</strong>
        </Link>
      </section>

      <section className="teacher-card">
        <div className="teacher-card-body">
          <div className="teacher-section-title">
            <h2>최근 응답 활동</h2>
            {loading ? <StatusBadge>불러오는 중</StatusBadge> : null}
          </div>
          <div className="activity-list">
            {responses.slice(0, 4).map((response) => (
              <div className="activity-row" key={response.id}>
                <span className="activity-dot" />
                <span>{formatRelativeTime(response.created_at)}</span>
                <strong>
                  {response.grade}학년 {response.class_number}반{" "}
                  {response.student_name || "학생"} 응답
                </strong>
                <StatusBadge tone="green">
                  <Users size={12} />
                  1
                </StatusBadge>
              </div>
            ))}
            {!responses.length ? (
              <div className="empty-state compact-empty">
                <Clock size={22} />
                <p>아직 학생 응답이 없습니다.</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </TeacherShell>
  );
}
