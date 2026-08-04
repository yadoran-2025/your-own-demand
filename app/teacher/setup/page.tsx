"use client";

import { FileText, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TeacherAuthGate } from "@/components/TeacherAuthGate";
import { useAuth } from "@/components/AuthProvider";
import {
  StatusBadge,
  TeacherPageHeader,
  TeacherShell,
} from "@/components/TeacherShell";
import { RoomGate } from "@/components/RoomGate";
import { SurveyEditor } from "@/components/SurveyEditor";
import {
  deleteSurvey,
  ensureRoomHasDefaultSurveys,
  hasRemoteDatabase,
  saveSurvey,
  surveyToDraft,
} from "@/lib/data";
import { TEACHER_ROOM_KEY, useStoredRoomName } from "@/lib/roomName";
import { canAccessTeacherData } from "@/lib/teacher-access";
import { useTeacherWorkspace } from "@/lib/teacher-workspace";
import type { Survey } from "@/lib/types";

export default function TeacherSetupPage() {
  const { roomName, ready, setRoomName } = useStoredRoomName(TEACHER_ROOM_KEY);
  const { ready: authReady, isTeacher, demoMode } = useAuth();
  const {
    workspace,
    ready: workspaceReady,
    setSelectedLessonId: setWorkspaceLessonId,
  } = useTeacherWorkspace();
  const canUseTeacherData = canAccessTeacherData({ ready: authReady, isTeacher, demoMode });
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [deleteConfirmationId, setDeleteConfirmationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const automaticallyLoadedRoomRef = useRef("");

  const selectedSurvey = selectedSurveyId
    ? surveys.find((survey) => survey.id === selectedSurveyId)
    : undefined;
  const confirmingDelete = selectedSurvey?.id === deleteConfirmationId;

  const editorDraft = useMemo(
    () => (selectedSurvey ? surveyToDraft(selectedSurvey) : undefined),
    [selectedSurvey],
  );

  const loadSurveys = useCallback(async (preferredSurveyId?: string) => {
    if (!canUseTeacherData) return;
    if (!roomName) {
      return;
    }

    setLoading(true);
    try {
      const nextSurveys = await ensureRoomHasDefaultSurveys(roomName);
      setSurveys(nextSurveys);
      const nextSurvey =
        nextSurveys.find((survey) => survey.id === preferredSurveyId) ??
        nextSurveys[0];
      setSelectedSurveyId(nextSurvey?.id ?? "");
      setWorkspaceLessonId(nextSurvey?.id ?? "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "설문을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [canUseTeacherData, roomName, setWorkspaceLessonId]);

  useEffect(() => {
    if (!canUseTeacherData) {
      automaticallyLoadedRoomRef.current = "";
      return;
    }
    if (!ready || !roomName || !workspaceReady) {
      return;
    }
    if (automaticallyLoadedRoomRef.current === roomName) {
      return;
    }

    automaticallyLoadedRoomRef.current = roomName;
    void loadSurveys(workspace.selectedLessonId);
  }, [
    canUseTeacherData,
    loadSurveys,
    roomName,
    ready,
    workspace.selectedLessonId,
    workspaceReady,
  ]);

  async function handleSaveSurvey(draft: Parameters<typeof saveSurvey>[0]) {
    if (!canUseTeacherData) return;
    const saved = await saveSurvey(draft, roomName);
    setMessage("설문이 저장되었습니다. 기존 응답은 유지됩니다.");
    await loadSurveys(saved.id);
  }

  async function handleDeleteSurvey() {
    if (!canUseTeacherData) return;
    if (!selectedSurvey) {
      return;
    }

    try {
      await deleteSurvey(selectedSurvey.id, roomName);
      setDeleteConfirmationId("");
      setMessage("설문이 삭제되었습니다.");
      setSelectedSurveyId("");
      await loadSurveys();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "설문을 삭제하지 못했습니다.");
    }
  }

  return (
    <TeacherAuthGate>
      <RoomGate
      description="교사용 방 이름을 입력하면 그 방 이름의 설문 목록만 세팅할 수 있습니다."
      roomName={roomName}
      ready={ready}
      setRoomName={setRoomName}
      title="교사용 방 열기"
      variant="teacher"
    >
    <TeacherShell
      active="setup"
      roomName={roomName}
      selectedLessonId={selectedSurvey?.id ?? workspace.selectedLessonId}
    >
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
          </>
        }
        description="상황과 상품 가격, 상황별 가격 구성을 관리하고 설문을 저장하세요."
        eyebrow="대시보드 / 설문 세팅"
        title="설문 세팅"
      />

      {!hasRemoteDatabase ? (
        <div className="teacher-alert" data-tone="warn">
          Firebase 환경변수가 없어서 localStorage 데모 모드로 동작합니다.
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
                onClick={() => {
                  setSelectedSurveyId(survey.id);
                  setWorkspaceLessonId(survey.id);
                }}
                type="button"
              >
                <span className="survey-item-dot" />
                <span>{survey.title}</span>
                {index === 0 ? <StatusBadge>활성</StatusBadge> : null}
              </button>
            ))}
            {!surveys.length ? (
              <div className="survey-list-empty">
                <FileText aria-hidden="true" size={24} />
                <strong>저장된 설문이 없습니다.</strong>
                <span>새 설문을 만들어 보세요.</span>
                <ul>
                  <li>설문은 3단계로 구성됩니다.</li>
                  <li>예산 → 설문 정보 → 상황과 가격 순서로 진행됩니다.</li>
                </ul>
              </div>
            ) : null}
          </div>
        </section>

        <section className="teacher-card editor-panel">
          <div className="editor-header">
            <div>
              {selectedSurvey ? <span>편집 중</span> : null}
              <h2>{selectedSurvey?.title ?? "새 설문 만들기"}</h2>
            </div>
            {selectedSurvey ? <button
              className="danger-button compact-button"
              onClick={() => setDeleteConfirmationId(selectedSurvey.id)}
              type="button"
            >
              <Trash2 size={16} />
              설문 삭제
            </button> : null}
          </div>
          <SurveyEditor
            initialDraft={editorDraft}
            key={selectedSurvey?.id ?? "new-survey"}
            onSave={handleSaveSurvey}
          />
        </section>
      </div>

      {confirmingDelete ? (
        <div className="teacher-review-backdrop" role="presentation">
          <section
            aria-labelledby="delete-survey-title"
            aria-modal="true"
            className="teacher-review-dialog"
            role="dialog"
          >
            <h2 id="delete-survey-title">정말 삭제하시겠습니까?</h2>
            <p>설문과 관련된 모든 학생 답변이 영구적으로 삭제됩니다.</p>
            <div className="teacher-review-actions">
              <button
                className="danger-button compact-button"
                onClick={() => void handleDeleteSurvey()}
                type="button"
              >
                삭제
              </button>
              <button
                className="secondary-button compact-button"
                onClick={() => setDeleteConfirmationId("")}
                type="button"
              >
                취소
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </TeacherShell>
      </RoomGate>
    </TeacherAuthGate>
  );
}
