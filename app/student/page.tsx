"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { LegalFooter } from "@/components/LegalFooter";
import { RoomBadge, RoomGate } from "@/components/RoomGate";
import { StudentResponseForm } from "@/components/StudentResponseForm";
import { fetchSurveys, hasRemoteDatabase } from "@/lib/data";
import { STUDENT_ROOM_KEY, useStoredRoomName } from "@/lib/roomName";
import { hasStoredStudentSubmission } from "@/lib/studentResultProfile";
import { canLoadStudentData } from "@/lib/student-data-load";
import type { Survey } from "@/lib/types";

export default function StudentPage() {
  const router = useRouter();
  const { ready: authReady, user, demoMode } = useAuth();
  const { roomName, ready, setRoomName } = useStoredRoomName(STUDENT_ROOM_KEY);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const canLoad = canLoadStudentData({
    roomReady: ready,
    roomName,
    authReady,
    authenticated: Boolean(user),
    demoMode,
  });

  const load = useCallback(async () => {
    if (!canLoad) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const nextSurveys = await fetchSurveys(roomName);
      setSurveys(nextSurveys);
      setSelectedSurveyId((current) =>
        nextSurveys.some((survey) => survey.id === current)
          ? current
          : nextSurveys[0]?.id || "",
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "설문을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }, [canLoad, roomName]);

  useEffect(() => {
    if (canLoad) {
      void load();
    }
  }, [canLoad, load]);

  const selectedSurvey =
    surveys.find((survey) => survey.id === selectedSurveyId) ?? surveys[0];
  const resultHref =
    roomName && selectedSurvey
      ? `/student/results?room=${encodeURIComponent(roomName)}&survey=${encodeURIComponent(selectedSurvey.id)}`
      : "/student/results";

  useEffect(() => {
    if (
      ready &&
      roomName &&
      selectedSurvey &&
      hasStoredStudentSubmission(roomName, selectedSurvey.id)
    ) {
      router.replace(resultHref);
    }
  }, [ready, resultHref, roomName, router, selectedSurvey]);

  if (!loading && !selectedSurvey) {
    return (
      <RoomGate
        description="교사가 알려준 방 이름을 입력하면 해당 방의 설문만 선택할 수 있습니다."
        roomName={roomName}
        ready={ready}
        setRoomName={setRoomName}
        title="학생용 방 입장"
      >
      <main className="student-empty-shell">
        <div className="student-empty-icon">?</div>
        <h1>아직 설문이 없어요</h1>
        <p>
          선생님이 설문을 아직 준비 중이에요.
          <br />
          잠시 기다렸다가 새로고침해 보세요.
        </p>
        <div className="student-empty-actions">
          <button className="student-retry-btn" onClick={load} type="button">
            <RefreshCw size={16} />
            새로고침
          </button>
        </div>
      </main>
      <LegalFooter />
      </RoomGate>
    );
  }

  return (
    <RoomGate
      description="교사가 알려준 방 이름을 입력하면 해당 방의 설문만 선택할 수 있습니다."
      roomName={roomName}
      ready={ready}
      setRoomName={setRoomName}
      title="학생용 방 입장"
    >
    <main className="student-page">
      <div className="student-shell">
        <header className="student-header">
          <div className="student-header-title">
            <div className="survey-eyebrow">
              <span className="survey-eyebrow-dot" />
              진행 중인 설문
            </div>
            <h1 className="survey-title">
              {selectedSurvey?.title ?? "학생 응답 제출"}
            </h1>
          </div>
          <RoomBadge label="입장 방" roomName={roomName} onReset={() => setRoomName("")} />
        </header>

        {!hasRemoteDatabase ? (
          <div className="student-notice">
            Firebase 환경변수가 없어서 이 브라우저의 localStorage에 저장됩니다.
          </div>
        ) : null}

        {loading ? <div className="student-notice">설문을 불러오는 중입니다.</div> : null}
        {error ? <div className="student-notice" data-tone="error">{error}</div> : null}

        {selectedSurvey ? (
          <>
            {surveys.length > 1 ? (
              <section className="student-select-section">
                <label>
                  <span className="field-label">설문 선택</span>
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
            <StudentResponseForm
              resultHref={resultHref}
              roomName={roomName}
              survey={selectedSurvey}
            />
          </>
        ) : null}
      </div>
    </main>
    <LegalFooter />
    </RoomGate>
  );
}
