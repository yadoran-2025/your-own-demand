"use client";

import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { StudentResponseForm } from "@/components/StudentResponseForm";
import { fetchSurveys, hasRemoteDatabase } from "@/lib/data";
import type { Survey } from "@/lib/types";

export default function StudentPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const nextSurveys = await fetchSurveys();
      setSurveys(nextSurveys);
      setSelectedSurveyId((current) => current || nextSurveys[0]?.id || "");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "조사를 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const selectedSurvey =
    surveys.find((survey) => survey.id === selectedSurveyId) ?? surveys[0];

  if (!loading && !selectedSurvey) {
    return (
      <main className="student-empty-shell">
        <div className="student-empty-icon">?</div>
        <h1>아직 조사가 없어요</h1>
        <p>
          선생님이 조사를 아직 준비 중이에요.
          <br />
          잠시 기다렸다가 새로고침해 보세요.
        </p>
        <div className="student-empty-actions">
          <button className="student-retry-btn" onClick={load} type="button">
            <RefreshCw size={16} />
            새로고침
          </button>
          <Link className="student-ghost-link" href="/teacher">
            교사 화면
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="student-page">
      <div className="student-shell">
        <header className="student-header">
          <Link className="student-back-link" href="/">
            <ArrowLeft size={16} />
            처음으로
          </Link>
          <div className="student-header-title">
            <div className="survey-eyebrow">
              <span className="survey-eyebrow-dot" />
              진행 중인 조사
            </div>
            <h1 className="survey-title">
              {selectedSurvey?.title ?? "학생 응답 제출"}
            </h1>
          </div>
        </header>

        {!hasRemoteDatabase ? (
          <div className="student-notice">
            Supabase 환경변수가 없어서 이 브라우저의 localStorage에 저장됩니다.
          </div>
        ) : null}

        {loading ? <div className="student-notice">조사를 불러오는 중입니다.</div> : null}
        {error ? <div className="student-notice" data-tone="error">{error}</div> : null}

        {selectedSurvey ? (
          <>
            {surveys.length > 1 ? (
              <section className="student-select-section">
                <label>
                  <span className="field-label">조사 선택</span>
                  <select
                    className="input"
                    value={selectedSurvey.id}
                    onChange={(event) => setSelectedSurveyId(event.target.value)}
                  >
                    {surveys.map((survey) => (
                      <option key={survey.id} value={survey.id}>
                        {survey.title}
                      </option>
                    ))}
                  </select>
                </label>
              </section>
            ) : null}
            <StudentResponseForm survey={selectedSurvey} />
          </>
        ) : null}
      </div>
    </main>
  );
}
