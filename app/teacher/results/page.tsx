"use client";

import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DemandChart } from "@/components/DemandChart";
import { buildDemandData, getAvailableClasses, getAvailableGrades } from "@/lib/aggregation";
import { fetchResponses, fetchSurveys, hasRemoteDatabase } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import type { FilterState, StudentResponse, Survey } from "@/lib/types";

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

  return (
    <main className="app-shell px-4 py-5 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-[var(--brand)]"
              href="/teacher"
            >
              <ArrowLeft size={17} />
              교사 대시보드
            </Link>
            <h1 className="text-3xl font-black">조사 결과 확인</h1>
            <p className="mt-2 text-[var(--text-muted)]">
              반별 평균과 전체 평균 수요곡선을 비교합니다.
            </p>
          </div>
          <button
            className="secondary-button"
            onClick={() => void loadSurveys(selectedSurvey?.id)}
            type="button"
          >
            <RefreshCw size={18} />
            새로고침
          </button>
        </header>

        {!hasRemoteDatabase ? (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-sm font-bold text-[var(--text-muted)]">
            Supabase 환경변수가 없어서 localStorage 데모 모드로 동작합니다.
          </p>
        ) : null}

        {message ? <p className="font-bold text-[var(--brand)]">{message}</p> : null}

        <section className="surface rounded-lg p-5">
          <div className="grid gap-3 md:grid-cols-3">
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
          <section className="surface rounded-lg p-4">
            <div className="flex flex-wrap gap-2">
              {selectedSurvey.products.map((product) => (
                <button
                  className="tab-button"
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

        {loading ? <p className="font-bold">결과를 불러오는 중입니다.</p> : null}

        {selectedProduct ? (
          <DemandChart
            data={demandData}
            filterLabel={filterLabel}
            title={selectedProduct.name}
          />
        ) : (
          <section className="surface rounded-lg p-5">
            <h2 className="text-xl font-black">확인할 조사가 없습니다.</h2>
            <p className="mt-2 text-[var(--text-muted)]">
              조사 세팅에서 상품과 가격을 만든 뒤 저장하면 결과가 표시됩니다.
            </p>
            <Link className="primary-button mt-4" href="/teacher/setup">
              조사 세팅으로 이동
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}


