"use client";

import Link from "next/link";
import { ArrowLeft, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SurveyEditor } from "@/components/SurveyEditor";
import {
  deleteSurvey,
  fetchSurveys,
  hasRemoteDatabase,
  saveSurvey,
  surveyToDraft,
} from "@/lib/data";
import type { Survey } from "@/lib/types";

export default function TeacherSetupPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const selectedSurvey = selectedSurveyId
    ? surveys.find((survey) => survey.id === selectedSurveyId)
    : undefined;

  const editorDraft = useMemo(
    () => (selectedSurvey ? surveyToDraft(selectedSurvey) : undefined),
    [selectedSurvey],
  );

  const loadSurveys = useCallback(async (preferredSurveyId?: string) => {
    setLoading(true);
    try {
      const nextSurveys = await fetchSurveys();
      setSurveys(nextSurveys);
      const nextSurvey =
        nextSurveys.find((survey) => survey.id === preferredSurveyId) ??
        nextSurveys[0];
      setSelectedSurveyId(nextSurvey?.id ?? "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "조사를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSurveys();
  }, [loadSurveys]);

  async function handleSaveSurvey(draft: Parameters<typeof saveSurvey>[0]) {
    const saved = await saveSurvey(draft);
    setMessage("조사가 저장되었습니다.");
    await loadSurveys(saved.id);
  }

  async function handleDeleteSurvey() {
    if (!selectedSurvey) {
      return;
    }

    const confirmed = window.confirm(
      `"${selectedSurvey.title}" 조사를 삭제할까요? 학생 응답도 함께 삭제됩니다.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteSurvey(selectedSurvey.id);
      setMessage("조사가 삭제되었습니다.");
      setSelectedSurveyId("");
      await loadSurveys();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "조사를 삭제하지 못했습니다.");
    }
  }

  return (
    <main className="app-shell px-4 py-5 md:px-8">
      <div className="mx-auto grid max-w-4xl gap-5">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-[var(--brand)]"
              href="/teacher"
            >
              <ArrowLeft size={17} />
              교사 대시보드
            </Link>
            <h1 className="text-3xl font-black">조사 세팅</h1>
            <p className="mt-2 text-[var(--text-muted)]">
              조사 제목, 상품, 가격 정책 설명과 가격을 설정합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="secondary-button"
              onClick={() => void loadSurveys(selectedSurvey?.id)}
              type="button"
            >
              <RefreshCw size={18} />
              새로고침
            </button>
            <button
              className="primary-button"
              onClick={() => {
                setSelectedSurveyId("");
                setMessage("새 조사를 작성합니다. 저장하면 조사 목록에 추가됩니다.");
              }}
              type="button"
            >
              <Plus size={18} />
              새 조사
            </button>
            <button
              className="secondary-button"
              disabled={!selectedSurvey}
              onClick={() => void handleDeleteSurvey()}
              type="button"
            >
              <Trash2 size={18} />
              조사 삭제
            </button>
          </div>
        </header>

        {!hasRemoteDatabase ? (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-sm font-bold text-[var(--text-muted)]">
            Supabase 환경변수가 없어서 localStorage 데모 모드로 동작합니다.
          </p>
        ) : null}

        {message ? <p className="font-bold text-[var(--brand)]">{message}</p> : null}
        {loading ? <p className="font-bold">조사를 불러오는 중입니다.</p> : null}

        <section className="surface rounded-lg p-5">
          <label>
            <span className="field-label">저장된 조사 선택</span>
            <select
              className="input"
              value={selectedSurveyId}
              onChange={(event) => setSelectedSurveyId(event.target.value)}
            >
              {surveys.map((survey) => (
                <option key={survey.id} value={survey.id}>
                  {survey.title}
                </option>
              ))}
            </select>
          </label>
          {!selectedSurvey ? (
            <p className="mt-2 text-sm font-bold text-[var(--brand)]">새 조사 작성 중</p>
          ) : null}
        </section>

        <SurveyEditor
          initialDraft={editorDraft}
          key={selectedSurvey?.id ?? "new-survey"}
          onSave={handleSaveSurvey}
        />
      </div>
    </main>
  );
}


