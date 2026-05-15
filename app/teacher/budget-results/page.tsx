"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DemandMetricToggle, SituationTabs } from "@/components/ResultControls";
import { RoomBadge, RoomGate } from "@/components/RoomGate";
import {
  StatusBadge,
  TeacherPageHeader,
  TeacherShell,
} from "@/components/TeacherShell";
import {
  buildBudgetDemandData,
  buildBudgetDemandGroups,
} from "@/lib/aggregation";
import {
  ensureRoomHasDefaultSurveys,
  fetchResponses,
  fetchSurveys,
  hasRemoteDatabase,
} from "@/lib/data";
import { TEACHER_ROOM_KEY, useStoredRoomName } from "@/lib/roomName";
import { supabase } from "@/lib/supabase";
import type {
  BudgetDemandGroup,
  DemandPoint,
  DemandMetric,
  StudentResponse,
  Survey,
} from "@/lib/types";
import { formatWon } from "@/lib/utils";

type BudgetDemandSeries = {
  color: string;
  data: DemandPoint[];
  group: BudgetDemandGroup;
  key: string;
};

type BudgetChartRow = {
  price: number;
  pricePointId: string;
} & Record<string, number | string>;

type BudgetTooltipPayload = {
  color?: string;
  dataKey?: string;
  name?: string;
  payload?: BudgetChartRow;
  value?: number;
};

const budgetSeriesColors = [
  "#2563eb",
  "#16a34a",
  "#f97316",
  "#7c3aed",
  "#0891b2",
  "#dc2626",
  "#4f46e5",
  "#65a30d",
];

function classSummary(group: BudgetDemandGroup) {
  if (!group.classes.length) {
    return "학급 없음";
  }

  return group.classes
    .map((classBudget) => `${classBudget.grade}-${classBudget.class_number}`)
    .join(", ");
}

function getDemandValue(point: DemandPoint, metric: DemandMetric) {
  return metric === "average" ? point.classAverage : point.classTotal;
}

function BudgetComparisonTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: BudgetTooltipPayload[];
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const rows = payload
    .filter((item) => typeof item.value === "number")
    .sort((a, b) => Number(b.value) - Number(a.value));
  const price = rows[0]?.payload?.price;

  return (
    <div className="demand-tooltip budget-comparison-tooltip">
      <p>{typeof price === "number" ? formatWon(price) : "가격"}</p>
      <div className="budget-tooltip-rows">
        {rows.map((item) => (
          <div key={String(item.dataKey)}>
            <span>
              <i style={{ background: item.color }} />
              {item.name}
            </span>
            <strong>{Number(item.value ?? 0).toLocaleString("ko-KR")}개</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function BudgetComparisonChart({
  metric,
  respondentCount,
  selectedGroupId,
  series,
  situationNumber,
}: {
  metric: DemandMetric;
  respondentCount: number;
  selectedGroupId: string;
  series: BudgetDemandSeries[];
  situationNumber: number;
}) {
  const chartData = useMemo(() => {
    const firstSeries = series[0];

    if (!firstSeries) {
      return [];
    }

    return firstSeries.data.map((point) => {
      const row: BudgetChartRow = {
        price: point.price,
        pricePointId: point.pricePointId,
      };

      for (const item of series) {
        const matchingPoint = item.data.find(
          (seriesPoint) => seriesPoint.pricePointId === point.pricePointId,
        );
        row[item.key] = matchingPoint ? getDemandValue(matchingPoint, metric) : 0;
      }

      return row;
    });
  }, [metric, series]);

  if (!chartData.length) {
    return (
      <section className="teacher-card empty-state chart-empty">
        <h2>상황 {situationNumber} 수요곡선</h2>
        <p>가격 구간이 아직 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="teacher-card chart-card">
      <div className="chart-header">
        <div className="chart-title-block">
          <h2>상황 {situationNumber} 예산별 수요곡선</h2>
        </div>
        <div className="chart-meta">
          <div>
            <span>응답자수</span>
            <strong>{respondentCount}</strong>
          </div>
        </div>
      </div>
      <div className="chart-canvas">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart
            data={chartData}
            layout="vertical"
            margin={{ bottom: 24, left: 24, right: 28, top: 16 }}
          >
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="4 4" />
            <XAxis
              allowDecimals
              domain={[0, "dataMax + 1"]}
              label={{
                value: metric === "total" ? "수요량" : "평균 수요량",
                position: "insideBottom",
                offset: -14,
              }}
              tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
              type="number"
            />
            <YAxis
              allowDataOverflow={false}
              dataKey="price"
              domain={[0, "dataMax"]}
              reversed
              tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
              tickFormatter={(value) => Number(value).toLocaleString("ko-KR")}
              type="number"
              width={84}
            />
            <Tooltip content={<BudgetComparisonTooltip />} />
            <Legend verticalAlign="top" />
            {series.map((item) => {
              const selected = item.group.id === selectedGroupId;

              return (
                <Line
                  activeDot={{
                    r: selected ? 7 : 6,
                    fill: item.color,
                    stroke: "#ffffff",
                    strokeWidth: 2,
                  }}
                  dataKey={item.key}
                  dot={{
                    r: selected ? 5.5 : 4,
                    fill: item.color,
                    stroke: "#ffffff",
                    strokeWidth: 2,
                  }}
                  key={item.key}
                  name={`${item.group.label} 예산 그룹`}
                  stroke={item.color}
                  strokeOpacity={selected ? 1 : 0.62}
                  strokeWidth={selected ? 4 : 2.5}
                  type="monotone"
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default function TeacherBudgetResultsPage() {
  const { roomName, ready, setRoomName } = useStoredRoomName(TEACHER_ROOM_KEY);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<StudentResponse[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedBudgetGroupId, setSelectedBudgetGroupId] = useState("");
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
      setSelectedBudgetGroupId("");
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
      setResponses(await fetchResponses(surveyId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "응답을 불러오지 못했습니다.");
    }
  }, []);

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
      .channel(`budget-responses-${selectedSurvey.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "responses",
          filter: `survey_id=eq.${selectedSurvey.id}`,
        },
        () => {
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

  const budgetGroups = useMemo(
    () =>
      selectedSurvey
        ? buildBudgetDemandGroups(selectedSurvey.class_budgets, responses)
        : [],
    [responses, selectedSurvey],
  );
  const selectedBudgetGroup =
    budgetGroups.find((group) => group.id === selectedBudgetGroupId) ??
    budgetGroups[0];
  const budgetSeries = useMemo(
    () =>
      selectedProduct
        ? budgetGroups.map((group, index) => ({
            color: budgetSeriesColors[index % budgetSeriesColors.length],
            data: buildBudgetDemandData(selectedProduct, group, responses),
            group,
            key: `budgetSeries${index}`,
          }))
        : [],
    [budgetGroups, responses, selectedProduct],
  );

  useEffect(() => {
    if (!budgetGroups.length) {
      setSelectedBudgetGroupId("");
      return;
    }

    if (!budgetGroups.some((group) => group.id === selectedBudgetGroupId)) {
      setSelectedBudgetGroupId(budgetGroups[0].id);
    }
  }, [budgetGroups, selectedBudgetGroupId]);

  const selectedProductIndex =
    selectedSurvey?.products.findIndex(
      (product) => product.id === selectedProduct?.id,
    ) ?? -1;
  const situationNumber = selectedProductIndex >= 0 ? selectedProductIndex + 1 : 1;
  const respondentCount = budgetGroups.reduce(
    (sum, group) => sum + group.responses.length,
    0,
  );

  return (
    <RoomGate
      description="교사용 방 이름을 입력하면 그 방 이름으로 만든 설문 결과만 볼 수 있습니다."
      roomName={roomName}
      ready={ready}
      setRoomName={setRoomName}
      title="교사용 방 열기"
    >
      <TeacherShell active="budget-results" roomName={roomName}>
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
          description="같은 예산을 가진 학급들을 그룹으로 묶어 예산별 수요곡선을 확인합니다."
          eyebrow="대시보드 / 예산별 결과"
          title="예산별 결과"
        />

        {!hasRemoteDatabase ? (
          <div className="teacher-alert" data-tone="warn">
            Supabase 환경변수가 없어서 localStorage 데모 모드로 동작합니다.
          </div>
        ) : null}
        {message ? <div className="teacher-alert">{message}</div> : null}

        <section className="teacher-card filter-card">
          <div className="budget-results-filter-bar">
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
                  setSelectedBudgetGroupId("");
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

        {selectedSurvey ? (
          <SituationTabs
            products={selectedSurvey.products}
            selectedProductId={selectedProduct?.id}
            onSelect={(productId) => {
              setSelectedProductId(productId);
              setSelectedBudgetGroupId(budgetGroups[0]?.id ?? "");
            }}
          />
        ) : null}

        {loading ? <div className="teacher-alert">결과를 불러오는 중입니다.</div> : null}

        {selectedProduct && budgetGroups.length ? (
          <>
            <section className="budget-group-card">
              <div className="budget-group-tabs">
                {budgetGroups.map((group) => (
                  <button
                    className="budget-group-tab"
                    data-active={group.id === selectedBudgetGroup?.id}
                    key={group.id}
                    onClick={() => setSelectedBudgetGroupId(group.id)}
                    title={classSummary(group)}
                    type="button"
                  >
                    <strong>{group.label}</strong>
                    <span>
                      {group.classes.length}개 학급 · 응답 {group.responses.length}명
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <div className="demand-controls-row">
              <DemandMetricToggle value={metric} onChange={setMetric} />
            </div>
            <BudgetComparisonChart
              metric={metric}
              respondentCount={respondentCount}
              selectedGroupId={selectedBudgetGroup?.id ?? ""}
              series={budgetSeries}
              situationNumber={situationNumber}
            />
          </>
        ) : selectedProduct ? (
          <section className="teacher-card empty-state">
            <h2>예산 그룹이 없습니다.</h2>
            <p>학급별 예산을 설정하거나 학생 응답이 들어오면 예산별 결과가 표시됩니다.</p>
            <Link className="primary-button compact-button" href="/teacher/setup">
              설문 세팅으로 이동
            </Link>
          </section>
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
