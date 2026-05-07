"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DemandChart } from "@/components/DemandChart";
import {
  StatusBadge,
  TeacherPageHeader,
  TeacherShell,
} from "@/components/TeacherShell";
import { buildDemandData, getAvailableClasses, getAvailableGrades } from "@/lib/aggregation";
import { fetchResponses, fetchSurveys, hasRemoteDatabase } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import type { FilterState, StudentResponse, Survey } from "@/lib/types";
import { formatWon } from "@/lib/utils";

export default function TeacherResultsPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<StudentResponse[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [filter, setFilter] = useState<FilterState>({
    grade: "all",
    classNumber: "all",
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const selectedSurvey =
    surveys.find((survey) => survey.id === selectedSurveyId) ?? surveys[0];
  const selectedProduct =
    selectedSurvey?.products.find((product) => product.id === selectedProductId) ??
    selectedSurvey?.products[0];

  const loadSurveys = useCallback(async (preferredSurveyId?: string) => {
    setLoading(true);
    try {
      const nextSurveys = await fetchSurveys();
      setSurveys(nextSurveys);
      const nextSurvey =
        nextSurveys.find((survey) => survey.id === preferredSurveyId) ??
        nextSurveys[0];
      setSelectedSurveyId(nextSurvey?.id ?? "");
      setSelectedProductId(nextSurvey?.products[0]?.id ?? "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "조사를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadResponses = useCallback(async (surveyId: string) => {
    if (!surveyId) {
      setResponses([]);
      return;
    }

    try {
      setResponses(await fetchResponses(surveyId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "응답을 불러오지 못했습니다.");
    }
  }, []);

  useEffect(() => {
    void loadSurveys();
  }, [loadSurveys]);

  useEffect(() => {
    void loadResponses(selectedSurvey?.id ?? "");
  }, [loadResponses, selectedSurvey?.id]);

  useEffect(() => {
    const client = supabase;

    if (!client || !selectedSurvey?.id) {
      return;
    }

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
        () => void loadResponses(selectedSurvey.id),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "response_items",
        },
        () => void loadResponses(selectedSurvey.id),
      )
      .subscribe();

    return () => {
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

  const filterLabel =
    filter.grade === "all"
      ? "전체 학생과 전체 평균 비교"
      : `${filter.grade}학년 ${
          filter.classNumber === "all" ? "전체 반" : `${filter.classNumber}반`
        }과 전체 평균 비교`;

  const classCount = useMemo(
    () =>
      new Set(
        responses.map(
          (response) => `${response.grade}-${response.class_number}`,
        ),
      ).size,
    [responses],
  );

  const firstPoint = demandData[0];
  const lastPoint = demandData[demandData.length - 1];

  return (
    <TeacherShell active="results">
      <TeacherPageHeader
        actions={
          <>
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
        description="반별 수요곡선과 전체 평균을 비교합니다. 응답은 실시간으로 업데이트됩니다."
        eyebrow="대시보드 / 결과 확인"
        title="결과 확인"
      />

      {!hasRemoteDatabase ? (
        <div className="teacher-alert" data-tone="warn">
          Supabase 환경변수가 없어서 localStorage 데모 모드로 동작합니다.
        </div>
      ) : null}
      {message ? <div className="teacher-alert">{message}</div> : null}

      <section className="response-summary" aria-label="응답 요약">
        <article className="summary-card">
          <strong>{responses.length}</strong>
          <span>총 응답 수</span>
          <p>{loading ? "불러오는 중" : "현재 조사 기준"}</p>
        </article>
        <article className="summary-card">
          <strong>{classCount}</strong>
          <span>참여 학급</span>
          <p>{classCount ? "응답 기준 집계" : "응답 대기 중"}</p>
        </article>
        <article className="summary-card">
          <strong>
            {firstPoint ? `${firstPoint.classAverage.toFixed(1)}개` : "0개"}
          </strong>
          <span>
            {selectedProduct?.price_points[0]
              ? `${formatWon(selectedProduct.price_points[0].price)} 평균 수요`
              : "첫 가격 평균 수요"}
          </span>
          <p>선택 필터 기준</p>
        </article>
        <article className="summary-card">
          <strong>
            {lastPoint ? `${lastPoint.classAverage.toFixed(1)}개` : "0개"}
          </strong>
          <span>
            {selectedProduct?.price_points.at(-1)
              ? `${formatWon(selectedProduct.price_points.at(-1)!.price)} 평균 수요`
              : "마지막 가격 평균 수요"}
          </span>
          <p>선택 필터 기준</p>
        </article>
      </section>

      <section className="teacher-card filter-card">
        <div className="results-filter-bar">
          <label>
            <span className="field-label">조사</span>
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
        <section className="product-tabs-card">
          <div className="product-tabs">
            {selectedSurvey.products.map((product) => (
              <button
                className="product-tab"
                data-active={product.id === selectedProduct?.id}
                key={product.id}
                onClick={() => setSelectedProductId(product.id)}
                type="button"
              >
                {product.name}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {loading ? <div className="teacher-alert">결과를 불러오는 중입니다.</div> : null}

      {selectedProduct ? (
        <DemandChart
          data={demandData}
          filterLabel={filterLabel}
          title={selectedProduct.name}
        />
      ) : (
        <section className="teacher-card empty-state">
          <h2>확인할 조사가 없습니다.</h2>
          <p>조사 세팅에서 상품과 가격을 만든 뒤 저장하면 결과가 표시됩니다.</p>
          <Link className="primary-button compact-button" href="/teacher/setup">
            조사 세팅으로 이동
          </Link>
        </section>
      )}
    </TeacherShell>
  );
}
