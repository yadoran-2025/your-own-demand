"use client";

import { BarChart3, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { DemandChart } from "@/components/DemandChart";
import { LegalFooter } from "@/components/LegalFooter";
import {
  DemandMetricToggle,
  DemandScopeToggle,
} from "@/components/ResultControls";
import { RoomBadge, RoomGate } from "@/components/RoomGate";
import { buildDemandData } from "@/lib/aggregation";
import { fetchResponses, fetchSurveys, hasRemoteDatabase } from "@/lib/data";
import { STUDENT_ROOM_KEY, useStoredRoomName } from "@/lib/roomName";
import {
  purgeExpiredStudentStorage,
  readStoredStudentResultProfile,
  readStoredStudentSubmission,
} from "@/lib/studentResultProfile";
import { canLoadStudentData } from "@/lib/student-data-load";
import type {
  DemandMetric,
  DemandPoint,
  DemandScope,
  FilterState,
  StudentResponse,
  Survey,
} from "@/lib/types";

function findPersonalResponse(
  responses: StudentResponse[],
  profile: ReturnType<typeof readStoredStudentResultProfile>,
  responseId?: string | null,
) {
  if (responseId) {
    return responses.find((response) => response.id === responseId) ?? null;
  }

  if (!profile?.studentName) {
    return null;
  }

  return (
    responses.find(
      (response) =>
        response.grade === profile.grade &&
        response.class_number === profile.classNumber &&
        response.student_name.trim() === profile.studentName &&
        (profile.studentNumber === null ||
          response.student_number === profile.studentNumber),
    ) ?? null
  );
}

function addPersonalDemand(
  demandData: DemandPoint[],
  response: StudentResponse | null,
  productId?: string,
) {
  if (!response || !productId) {
    return demandData;
  }

  const quantitiesByPricePoint = new Map(
    response.response_items
      .filter((item) => item.product_id === productId)
      .map((item) => [item.price_point_id, item.quantity]),
  );

  if (!quantitiesByPricePoint.size) {
    return demandData;
  }

  return demandData.map((point) => ({
    ...point,
    personalQuantity: quantitiesByPricePoint.get(point.pricePointId) ?? null,
  }));
}

export default function StudentResultsPage() {
  const { ready: authReady, user, demoMode } = useAuth();
  const { roomName, ready, setRoomName } = useStoredRoomName(STUDENT_ROOM_KEY);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<StudentResponse[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [filter, setFilter] = useState<FilterState>({
    grade: "all",
    classNumber: "all",
  });
  const [scope, setScope] = useState<DemandScope>("personal");
  const [metric, setMetric] = useState<DemandMetric>("total");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const canLoad = canLoadStudentData({
    roomReady: ready,
    roomName,
    authReady,
    authenticated: Boolean(user),
    demoMode,
  });

  useEffect(() => {
    purgeExpiredStudentStorage();
  }, []);

  const selectedSurvey =
    surveys.find((survey) => survey.id === selectedSurveyId) ?? surveys[0];

  const loadSurveys = useCallback(async () => {
    if (!canLoad) {
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams(window.location.search);
      const requestedSurveyId = params.get("survey") ?? "";
      const requestedGrade = params.get("grade");
      const requestedClassNumber = params.get("classNumber");
      const storedProfile = readStoredStudentResultProfile();
      const nextSurveys = await fetchSurveys(roomName);
      const nextSurvey =
        nextSurveys.find((survey) => survey.id === requestedSurveyId) ??
        nextSurveys[0];
      const nextGrade = requestedGrade ?? storedProfile?.grade.toString() ?? "all";
      const nextClassNumber =
        requestedClassNumber ?? storedProfile?.classNumber.toString() ?? "all";

      setSurveys(nextSurveys);
      setSelectedSurveyId(nextSurvey?.id ?? "");
      setFilter({
        grade: nextGrade,
        classNumber: nextClassNumber,
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "설문 결과를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [canLoad, roomName]);

  const loadResponses = useCallback(async (surveyId: string) => {
    if (!canLoad || !surveyId) {
      setResponses([]);
      return;
    }

    try {
      const storedSubmission = readStoredStudentSubmission(roomName, surveyId);
      setResponses(
        await fetchResponses(
          surveyId,
          false,
          roomName,
          storedSubmission?.responseId ?? "00000000-0000-0000-0000-000000000000",
        ),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "응답을 불러오지 못했습니다.");
    }
  }, [canLoad, roomName]);

  useEffect(() => {
    if (canLoad) {
      void loadSurveys();
    }
  }, [canLoad, loadSurveys]);

  useEffect(() => {
    if (canLoad) {
      void loadResponses(selectedSurvey?.id ?? "");
    }
  }, [canLoad, loadResponses, selectedSurvey?.id]);

  const productCharts = useMemo(
    () => {
      if (!selectedSurvey) {
        return [];
      }

      const storedProfile = readStoredStudentResultProfile();
      const storedSubmission = selectedSurvey
        ? readStoredStudentSubmission(roomName, selectedSurvey.id)
        : null;
      const personalResponse = findPersonalResponse(
        responses,
        storedProfile,
        storedSubmission?.responseId,
      );

      return selectedSurvey.products.map((product, index) => {
        const data = addPersonalDemand(
          buildDemandData(product, responses, filter),
          personalResponse,
          product.id,
        );
        const hasPersonalDemand = data.some(
          (point) => typeof point.personalQuantity === "number",
        );
        const respondentCount =
          scope === "personal"
            ? hasPersonalDemand
              ? 1
              : 0
            : scope === "class"
              ? data.reduce((sum, point) => sum + point.classCount, 0)
              : data.reduce((sum, point) => sum + point.overallCount, 0);

        return {
          data,
          respondentCount,
          situationNumber: index + 1,
        };
      });
    },
    [filter, responses, roomName, scope, selectedSurvey],
  );

  return (
    <RoomGate
      description="교사가 알려준 방 이름을 입력하면 해당 방의 설문 결과를 볼 수 있습니다."
      roomName={roomName}
      ready={ready}
      setRoomName={setRoomName}
      title="결과 분석 방 입장"
    >
      <main className="student-page">
        <div className="student-shell student-results-shell">
          <header className="student-header">
            <div className="student-header-title">
              <div className="survey-eyebrow">
                <span className="survey-eyebrow-dot" />
                결과 분석
              </div>
              <h1 className="survey-title">
                {selectedSurvey?.title ?? "수요곡선 결과"}
              </h1>
            </div>
            <RoomBadge label="입장 방" roomName={roomName} onReset={() => setRoomName("")} />
          </header>

          {!hasRemoteDatabase ? (
            <div className="student-notice">
              Firebase 환경변수가 없어서 이 브라우저의 localStorage 응답만 분석합니다.
            </div>
          ) : null}
          {message ? <div className="student-notice" data-tone="error">{message}</div> : null}
          {loading ? <div className="student-notice">결과를 불러오는 중입니다.</div> : null}

          <section className="student-analysis-panel">
            <div className="student-analysis-head">
              <span className="student-entry-icon">
                <BarChart3 size={24} />
              </span>
              <div>
                <h2>완성된 수요곡선</h2>
                <p>설문과 상황을 바꿔가며 나의 응답, 우리 반, 학교 전체의 수요곡선을 살펴볼 수 있습니다.</p>
              </div>
              <button
                className="secondary-button compact-button"
                onClick={() => {
                  void loadSurveys();
                  void loadResponses(selectedSurvey?.id ?? "");
                }}
                type="button"
              >
                <RefreshCw size={16} />
                새로고침
              </button>
            </div>

            <div className="results-filter-bar student-results-filter-bar">
              <label>
                <span className="field-label">설문</span>
                <select
                  className="input"
                  value={selectedSurvey?.id ?? ""}
                  onChange={(event) => {
                    setSelectedSurveyId(event.target.value);
                  }}
                >
                  {surveys.map((survey) => (
                    <option key={survey.id} value={survey.id}>
                      {survey.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {selectedSurvey?.products.length ? (
            <>
              <div className="demand-controls-row">
                {scope !== "personal" ? (
                  <DemandMetricToggle value={metric} onChange={setMetric} />
                ) : null}
                <DemandScopeToggle
                  includePersonal
                  value={scope}
                  onChange={setScope}
                />
              </div>
              <div className="student-chart-stack">
                {productCharts.map((chart) => (
                  <DemandChart
                    data={chart.data}
                    key={chart.situationNumber}
                    metric={metric}
                    respondentCount={chart.respondentCount}
                    showRespondents={false}
                    scope={scope}
                    situationNumber={chart.situationNumber}
                  />
                ))}
              </div>
            </>
          ) : (
            <section className="teacher-card empty-state">
              <h2>분석할 설문이 없습니다.</h2>
              <p>교사가 설문을 저장하고 학생 응답이 모이면 결과가 표시됩니다.</p>
            </section>
          )}
        </div>
      </main>
      <LegalFooter />
    </RoomGate>
  );
}
