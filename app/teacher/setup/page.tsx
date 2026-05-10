"use client";

import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  StatusBadge,
  TeacherPageHeader,
  TeacherShell,
} from "@/components/TeacherShell";
import { RoomBadge, RoomGate } from "@/components/RoomGate";
import { SurveyEditor } from "@/components/SurveyEditor";
import {
  deleteSurvey,
  fetchSurveys,
  hasRemoteDatabase,
  saveSurvey,
  surveyToDraft,
} from "@/lib/data";
import { TEACHER_ROOM_KEY, useStoredRoomName } from "@/lib/roomName";
import type { Survey } from "@/lib/types";

export default function TeacherSetupPage() {
  const { roomName, ready, setRoomName } = useStoredRoomName(TEACHER_ROOM_KEY);
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
    if (!roomName) {
      return;
    }

    setLoading(true);
    try {
      const nextSurveys = await fetchSurveys(roomName);
      setSurveys(nextSurveys);
      const nextSurvey =
        nextSurveys.find((survey) => survey.id === preferredSurveyId) ??
        nextSurveys[0];
      setSelectedSurveyId(nextSurvey?.id ?? "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "설문을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [roomName]);

  useEffect(() => {
    if (ready && roomName) {
      void loadSurveys();
    }
  }, [loadSurveys, roomName, ready]);

  async function handleSaveSurvey(draft: Parameters<typeof saveSurvey>[0]) {
    const saved = await saveSurvey(draft, roomName);
    setMessage("설문이 저장되었습니다. 기존 응답은 유지됩니다.");
    await loadSurveys(saved.id);
  }

  async function handleDeleteSurvey() {
    if (!selectedSurvey) {
      return;
    }

    const confirmed = window.confirm(
      `"${selectedSurvey.title}" 설문을 삭제할까요? 학생 응답도 함께 삭제됩니다.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteSurvey(selectedSurvey.id);
      setMessage("설문이 삭제되었습니다.");
      setSelectedSurveyId("");
      await loadSurveys();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "설문을 삭제하지 못했습니다.");
    }
  }

  return (
    <RoomGate
      description="교사용 방 이름을 입력하면 그 방 이름의 설문 목록만 세팅할 수 있습니다."
      roomName={roomName}
      ready={ready}
      setRoomName={setRoomName}
      title="교사용 방 열기"
    >
    <TeacherShell active="setup" roomName={roomName}>
      <TeacherPageHeader
        actions={
          <>
            <RoomBadge roomName={roomName} onReset={() => setRoomName("")} />
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
                setMessage("새 설문을 작성합니다. 저장하면 설문 목록에 추가됩니다.");
              }}
              type="button"
            >
              <Plus size={16} />
              새 설문
            </button>
          </>
        }
        description="상황과 상품 가격, 상황별 가격 구성을 관리하고 설문을 저장하세요."
        eyebrow="대시보드 / 설문 세팅"
        title="설문 세팅"
      />

      {!hasRemoteDatabase ? (
        <div className="teacher-alert" data-tone="warn">
          Supabase 환경변수가 없어서 localStorage 데모 모드로 동작합니다.
        </div>
      ) : null}
      {message ? <div className="teacher-alert">{message}</div> : null}
      {loading ? <div className="teacher-alert">설문을 불러오는 중입니다.</div> : null}

      <div className="setup-layout">
        <section className="teacher-card survey-list-panel">
          <div className="survey-list-header">
            <h2>저장된 설문</h2>
            <button
              className="primary-button compact-button"
              onClick={() => {
                setSelectedSurveyId("");
                setMessage("새 설문을 작성합니다. 저장하면 설문 목록에 추가됩니다.");
              }}
              type="button"
            >
              <Plus size={14} />
              새 설문
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
                <p>저장된 설문이 없습니다.</p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="teacher-card editor-panel">
          <div className="editor-header">
            <div>
              <span>편집 중</span>
              <h2>{selectedSurvey?.title ?? "새 설문"}</h2>
            </div>
            <button
              className="danger-button compact-button"
              disabled={!selectedSurvey}
              onClick={() => void handleDeleteSurvey()}
              type="button"
            >
              <Trash2 size={16} />
              설문 삭제
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
    </RoomGate>
  );
}



