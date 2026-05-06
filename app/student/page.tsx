"use client";

import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchSurveys, hasRemoteDatabase } from "@/lib/data";
import type { Survey } from "@/lib/types";
import { StudentResponseForm } from "@/components/StudentResponseForm";

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

  return (
    <main className="app-shell px-4 py-5 md:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-[var(--brand)]"
              href="/"
            >
              <ArrowLeft size={17} />
              처음으로
            </Link>
            <h1 className="text-3xl font-black">학생 응답 제출</h1>
            <p className="mt-2 text-[var(--text-muted)]">
              각 가격에서 내가 살 것 같은 개수를 0부터 100까지 입력하세요.
            </p>
          </div>
          <button className="secondary-button" onClick={load} type="button">
            <RefreshCw size={18} />
            새로고침
          </button>
        </header>

        {!hasRemoteDatabase ? (
          <p className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-sm font-bold text-[var(--text-muted)]">
            Supabase 환경변수가 없어서 이 브라우저의 localStorage에 저장됩니다.
          </p>
        ) : null}

        {loading ? <p className="font-bold">조사를 불러오는 중입니다.</p> : null}
        {error ? <p className="font-bold text-[var(--color-error-text)]">{error}</p> : null}

        {!loading && !selectedSurvey ? (
          <section className="surface rounded-lg p-5">
            <h2 className="text-xl font-black">아직 조사가 없습니다.</h2>
            <p className="mt-2 text-[var(--text-muted)]">
              교사 대시보드에서 조사와 가격 구간을 먼저 저장해 주세요.
            </p>
            <Link className="primary-button mt-4" href="/teacher">
              교사 대시보드로 이동
            </Link>
          </section>
        ) : null}

        {selectedSurvey ? (
          <div className="grid gap-5">
            <section className="surface rounded-lg p-5">
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
            <StudentResponseForm survey={selectedSurvey} />
          </div>
        ) : null}
      </div>
    </main>
  );
}


