"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DemandChart } from "@/components/DemandChart";
import {
  DemandMetricToggle,
  DemandScopeToggle,
  SituationTabs,
} from "@/components/ResultControls";
import { RoomBadge, RoomGate } from "@/components/RoomGate";
import {
  StatusBadge,
  TeacherPageHeader,
  TeacherShell,
} from "@/components/TeacherShell";
import { buildDemandData, getAvailableClasses, getAvailableGrades } from "@/lib/aggregation";
import {
  ensureRoomHasDefaultSurveys,
  fetchResponses,
  fetchSurveys,
  hasRemoteDatabase,
} from "@/lib/data";
import { TEACHER_ROOM_KEY, useStoredRoomName } from "@/lib/roomName";
import { supabase } from "@/lib/supabase";
import type {
  DemandMetric,
  DemandScope,
  FilterState,
  StudentResponse,
  Survey,
} from "@/lib/types";

export default function TeacherResultsPage() {
  const { roomName, ready, setRoomName } = useStoredRoomName(TEACHER_ROOM_KEY);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<StudentResponse[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [filter, setFilter] = useState<FilterState>({
    grade: "all",
    classNumber: "all",
  });
  const [scope, setScope] = useState<DemandScope>("class");
  const [metric, setMetric] = useState<DemandMetric>("total");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const selectedSurvey =
    surveys.find((survey) => survey.id === selectedSurveyId) ?? surveys[0];
  const selectedProduct =
    selectedSurvey?.products.find((product) => product.id === selectedProductId) ??
    selectedSurvey?.products[0];

  const loadSurveys = useCallback(async (preferredSurveyId?: string) => {
    if (!roomName) {
      return;
    }

    setLoading(true);
    try {
      await ensureRoomHasDefaultSurveys(roomName);
      const nextSurveys = await fetchSurveys(roomName);
      setSurveys(nextSurveys);
      const nextSurvey =
        nextSurveys.find((survey) => survey.id === preferredSurveyId) ??
        nextSurveys[0];
      setSelectedSurveyId(nextSurvey?.id ?? "");
      setSelectedProductId(nextSurvey?.products[0]?.id ?? "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "설문을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [roomName]);

  const loadResponses = useCallback(async (surveyId: string) => {
    if (!surveyId) {
      setResponses([]);
      return;
    }

    try {
      setResponses(await fetchResponses(surveyId, false, roomName));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "응답을 불러오지 못했습니다.");
    }
  }, [roomName]);

  useEffect(() => {
    if (ready && roomName) {
      void loadSurveys();
    }
  }, [loadSurveys, roomName, ready]);

  useEffect(() => {
    void loadResponses(selectedSurvey?.id ?? "");
  }, [loadResponses, selectedSurvey?.id]);

  useEffect(() => {
    const client = supabase;

    if (!client || !selectedSurvey?.id) {
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;

    const channel = client
      .channel(`responses-${selectedSurvey.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "responses",
          filter: `survey_id=eq.${selectedSurvey.id}`,
        },
        () => {
          // 짧게 대기해 response_items까지 커밋된 후 한 번만 fetch
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => void loadResponses(selectedSurvey.id), 300);
        },
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void client.removeChannel(channel);
    };
  }, [loadResponses, selectedSurvey?.id]);

  const grades = useMemo(() => getAvailableGrades(responses), [responses]);
  const classes = useMemo(
    () => getAvailableClasses(responses, filter.grade),
    [responses, filter.grade],
  );
  const demandData = useMemo(
    () =>
      selectedProduct
        ? buildDemandData(selectedProduct, responses, filter)
        : [],
    [selectedProduct, responses, filter],
  );

  const selectedProductIndex = selectedSurvey?.products.findIndex(
    (product) => product.id === selectedProduct?.id,
  ) ?? -1;
  const situationNumber = selectedProductIndex >= 0 ? selectedProductIndex + 1 : 1;
  const respondentCount =
    scope === "class"
      ? demandData.reduce((sum, point) => sum + point.classCount, 0)
      : demandData.reduce((sum, point) => sum + point.overallCount, 0);

  return (
    <RoomGate
      description="교사용 방 이름을 입력하면 그 방 이름으로 만든 설문 결과만 볼 수 있습니다."
      roomName={roomName}
      ready={ready}
      setRoomName={setRoomName}
      title="교사용 방 열기"
    >
    <TeacherShell active="results" roomName={roomName}>
      <TeacherPageHeader
        actions={
          <>
            <RoomBadge roomName={roomName} onReset={() => setRoomName("")} />
            <StatusBadge tone="green">
              <span className="live-dot" />
              실시간
            </StatusBadge>
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
        description="반별 또는 학교 전체 수요곡선을 선택해 확인합니다. 응답은 실시간으로 업데이트됩니다."
        eyebrow="대시보드 / 결과 확인"
        title="결과 확인"
      />

      {!hasRemoteDatabase ? (
        <div className="teacher-alert" data-tone="warn">
          Supabase 환경변수가 없어서 localStorage 데모 모드로 동작합니다.
        </div>
      ) : null}
      {message ? <div className="teacher-alert">{message}</div> : null}

      <section className="teacher-card filter-card">
        <div className="results-filter-bar">
          <label>
            <span className="field-label">설문</span>
            <select
              className="input"
              value={selectedSurvey?.id ?? ""}
              onChange={(event) => {
                const nextSurvey = surveys.find(
                  (survey) => survey.id === event.target.value,
                );
                setSelectedSurveyId(event.target.value);
                setSelectedProductId(nextSurvey?.products[0]?.id ?? "");
              }}
            >
              {surveys.map((survey) => (
                <option key={survey.id} value={survey.id}>
                  {survey.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">학년</span>
            <select
              className="input"
              value={filter.grade}
              onChange={(event) =>
                setFilter({ grade: event.target.value, classNumber: "all" })
              }
            >
              <option value="all">전체</option>
              {grades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}학년
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">반</span>
            <select
              className="input"
              value={filter.classNumber}
              onChange={(event) =>
                setFilter((current) => ({
                  ...current,
                  classNumber: event.target.value,
                }))
              }
            >
              <option value="all">전체</option>
              {classes.map((classNumber) => (
                <option key={classNumber} value={classNumber}>
                  {classNumber}반
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {selectedSurvey ? (
        <SituationTabs
          products={selectedSurvey.products}
          selectedProductId={selectedProduct?.id}
          onSelect={setSelectedProductId}
        />
      ) : null}

      {loading ? <div className="teacher-alert">결과를 불러오는 중입니다.</div> : null}

      {selectedProduct ? (
        <>
          <div className="demand-controls-row">
            <DemandMetricToggle value={metric} onChange={setMetric} />
            <DemandScopeToggle value={scope} onChange={setScope} />
          </div>
          <DemandChart
            data={demandData}
            metric={metric}
            respondentCount={respondentCount}
            scope={scope}
            situationNumber={situationNumber}
          />
        </>
      ) : (
        <section className="teacher-card empty-state">
          <h2>확인할 설문이 없습니다.</h2>
          <p>설문 세팅에서 상품과 가격을 만든 뒤 저장하면 결과가 표시됩니다.</p>
          <Link className="primary-button compact-button" href="/teacher/setup">
            설문 세팅으로 이동
          </Link>
        </section>
      )}
    </TeacherShell>
    </RoomGate>
  );
}


