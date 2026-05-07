"use client";

import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  StatusBadge,
  TeacherPageHeader,
  TeacherShell,
} from "@/components/TeacherShell";
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
    <TeacherShell active="setup">
      <TeacherPageHeader
        actions={
          <>
            <button
              className="secondary-button compact-button"
              onClick={() => void loadSurveys(selectedSurvey?.id)}
              type="button"
            >
              <RefreshCw size={16} />
              새로고침
            </button>
            <button
              className="primary-button compact-button"
              onClick={() => {
                setSelectedSurveyId("");
                setMessage("새 조사를 작성합니다. 저장하면 조사 목록에 추가됩니다.");
              }}
              type="button"
            >
              <Plus size={16} />
              새 조사
            </button>
          </>
        }
        description="상황과 상품 가격, 상황별 가격 구성을 관리하고 조사를 저장하세요."
        eyebrow="대시보드 / 조사 세팅"
        title="조사 세팅"
      />

      {!hasRemoteDatabase ? (
        <div className="teacher-alert" data-tone="warn">
          Supabase 환경변수가 없어서 localStorage 데모 모드로 동작합니다.
        </div>
      ) : null}
      {message ? <div className="teacher-alert">{message}</div> : null}
      {loading ? <div className="teacher-alert">조사를 불러오는 중입니다.</div> : null}

      <div className="setup-layout">
        <section className="teacher-card survey-list-panel">
          <div className="survey-list-header">
            <h2>저장된 조사</h2>
            <button
              className="primary-button compact-button"
              onClick={() => {
                setSelectedSurveyId("");
                setMessage("새 조사를 작성합니다. 저장하면 조사 목록에 추가됩니다.");
              }}
              type="button"
            >
              <Plus size={14} />
              새 조사
            </button>
          </div>
          <div className="survey-list">
            {surveys.map((survey, index) => (
              <button
                className="survey-list-item"
                data-active={survey.id === selectedSurveyId}
                key={survey.id}
                onClick={() => setSelectedSurveyId(survey.id)}
                type="button"
              >
                <span className="survey-item-dot" />
                <span>{survey.title}</span>
                {index === 0 ? <StatusBadge>활성</StatusBadge> : null}
              </button>
            ))}
            {!surveys.length ? (
              <div className="empty-state compact-empty">
                <p>저장된 조사가 없습니다.</p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="teacher-card editor-panel">
          <div className="editor-header">
            <div>
              <span>편집 중</span>
              <h2>{selectedSurvey?.title ?? "새 조사"}</h2>
            </div>
            <button
              className="danger-button compact-button"
              disabled={!selectedSurvey}
              onClick={() => void handleDeleteSurvey()}
              type="button"
            >
              <Trash2 size={16} />
              조사 삭제
            </button>
          </div>
          <SurveyEditor
            initialDraft={editorDraft}
            key={selectedSurvey?.id ?? "new-survey"}
            onSave={handleSaveSurvey}
          />
        </section>
      </div>
    </TeacherShell>
  );
}
