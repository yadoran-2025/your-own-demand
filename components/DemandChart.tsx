"use client";

import {
  useState,
  type MouseEvent,
  type TouchEvent,
} from "react";
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
import type { DemandMetric, DemandPoint, DemandScope } from "@/lib/types";
import { formatWon } from "@/lib/utils";

type DemandChartProps = {
  data: DemandPoint[];
  metric: DemandMetric;
  respondentCount: number;
  scope: DemandScope;
  situationNumber: number;
};

type DemandPointDotRenderProps = {
  cx?: number;
  cy?: number;
  payload?: DemandPoint;
};

type TooltipPayload = {
  payload: DemandPoint;
  dataKey?: string;
  value?: number;
};

type PointDetails = {
  value: number;
  count: number;
  metric: DemandMetric;
  rows: DemandPoint["classRespondents"];
};

type TouchPopup = {
  point: DemandPoint;
  x: number;
  y: number;
};

function RespondentRows({
  count,
  metric,
  rows,
  value,
}: {
  count: number;
  metric: DemandMetric;
  rows: DemandPoint["classRespondents"];
  value: number;
}) {
  const valueLabel =
    metric === "average" ? `평균 ${value.toFixed(2)}개` : `합계 ${value}개`;

  return (
    <div className="tooltip-respondents">
      <div className="tooltip-respondents-head">
        <strong>응답 학생</strong>
        <span>{valueLabel}</span>
      </div>
      <p>응답 {count}명</p>
      <div className="tooltip-student-rows">
        {rows.map((row, index) => (
          <div
            key={`${row.grade}-${row.classNumber}-${row.studentName}-${index}`}
          >
            <span>
              {row.grade}학년 {row.classNumber}반
              <span className="tooltip-separator">-</span>
              {row.studentName || "이름 없음"}
            </span>
            <strong>{row.quantity}개</strong>
          </div>
        ))}
        {!rows.length ? <span>이 가격에 응답한 학생이 없습니다.</span> : null}
      </div>
    </div>
  );
}

function getPointDetails(
  point: DemandPoint,
  scope: DemandScope,
  metric: DemandMetric,
): PointDetails {
  const isClassScope = scope !== "school";
  const value =
    metric === "average"
      ? isClassScope
        ? point.classAverage
        : point.overallAverage
      : isClassScope
        ? point.classTotal
        : point.overallTotal;

  return {
    count: isClassScope ? point.classCount : point.overallCount,
    metric,
    rows: isClassScope ? point.classRespondents : point.overallRespondents,
    value,
  };
}

function DemandTooltip({
  active,
  payload,
  scope,
  mode,
  metric,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  scope: DemandScope;
  mode: "mouse" | "touch";
  metric: DemandMetric;
}) {
  if (mode === "touch" || !active || !payload?.length) {
    return null;
  }

  const point = payload[0].payload;

  if (payload[0].dataKey === "personalQuantity") {
    return (
      <div className="demand-tooltip demand-personal-tooltip">
        <p>{formatWon(point.price)}</p>
        <div className="tooltip-respondents">
          <div className="tooltip-respondents-head">
            <strong>나의 응답</strong>
            <span>{Number(payload[0].value ?? 0).toFixed(0)}개</span>
          </div>
        </div>
      </div>
    );
  }

  const details = getPointDetails(point, scope, metric);

  return (
    <div className="demand-tooltip">
      <p>{formatWon(point.price)}</p>
      <RespondentRows
        count={details.count}
        metric={details.metric}
        rows={details.rows}
        value={details.value}
      />
    </div>
  );
}

function DemandTouchPopup({
  popup,
  scope,
  metric,
  onClose,
}: {
  popup: TouchPopup;
  scope: DemandScope;
  metric: DemandMetric;
  onClose: () => void;
}) {
  const details = getPointDetails(popup.point, scope, metric);

  return (
    <div
      className="demand-tooltip demand-touch-tooltip"
      style={{ left: popup.x, top: popup.y }}
    >
      <button
        aria-label="가격 정보 닫기"
        className="demand-touch-close"
        onClick={onClose}
        type="button"
      >
        ×
      </button>
      <p>{formatWon(popup.point.price)}</p>
      <RespondentRows
        count={details.count}
        metric={details.metric}
        rows={details.rows}
        value={details.value}
      />
    </div>
  );
}

function DemandPointDot({
  cx,
  cy,
  payload,
  metric,
  scope,
  selected,
  onSelect,
}: {
  cx?: number;
  cy?: number;
  payload?: DemandPoint;
  metric: DemandMetric;
  scope: DemandScope;
  selected: boolean;
  onSelect: (point: DemandPoint, x: number, y: number) => void;
}) {
  if (typeof cx !== "number" || typeof cy !== "number" || !payload) {
    return null;
  }

  const value =
    metric === "average"
      ? scope === "school"
        ? payload.overallAverage
        : payload.classAverage
      : scope === "school"
        ? payload.overallTotal
        : payload.classTotal;
  const valueLabel =
    metric === "average" ? `평균 ${value.toFixed(2)}개` : `합계 ${value}개`;
  const label = `${formatWon(payload.price)} 가격대, ${valueLabel}`;
  const handleTouch = (event: TouchEvent<SVGGElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect(payload, cx, cy);
  };
  const handleClick = (event: MouseEvent<SVGGElement>) => {
    event.stopPropagation();
  };

  return (
    <g
      aria-label={label}
      className="demand-point-dot"
      data-selected={selected}
      onClick={handleClick}
      onTouchEnd={handleTouch}
      role="button"
      transform={`translate(${cx}, ${cy})`}
    >
      <circle className="demand-point-hit-area" r={22} />
      <circle
        className="demand-point-core"
        fill="var(--color-primary)"
        r={selected ? 7 : 5}
        stroke="#ffffff"
        strokeWidth={2}
      />
    </g>
  );
}

export function DemandChart({
  data,
  metric,
  respondentCount,
  scope,
  situationNumber,
}: DemandChartProps) {
  const [interactionMode, setInteractionMode] = useState<"mouse" | "touch">("mouse");
  const [touchPopup, setTouchPopup] = useState<TouchPopup | null>(null);

  if (!data.length) {
    return (
      <section className="teacher-card empty-state chart-empty">
        <h2>상황 {situationNumber} 수요곡선</h2>
        <p>가격 구간이 아직 없습니다.</p>
      </section>
    );
  }

  const hasPersonalDemand = data.some(
    (point) => typeof point.personalQuantity === "number",
  );

  if (scope === "personal" && !hasPersonalDemand) {
    return (
      <section className="teacher-card empty-state chart-empty">
        <h2>상황 {situationNumber} 수요곡선</h2>
        <p>이 상황에 표시할 나의 응답이 없습니다.</p>
      </section>
    );
  }

  const lineKey =
    metric === "average"
      ? scope === "class"
        ? "classAverage"
        : "overallAverage"
      : scope === "class"
        ? "classTotal"
        : "overallTotal";
  const lineName =
    scope === "class"
      ? metric === "average"
        ? "우리 반 평균"
        : "우리 반 수요량"
      : metric === "average"
        ? "학교 전체 평균"
        : "학교 전체 수요량";
  const lineStroke =
    scope === "class" ? "var(--color-primary)" : "var(--color-text-secondary)";
  const isPersonalScope = scope === "personal";

  return (
    <section className="teacher-card chart-card">
      <div className="chart-header">
        <div className="chart-title-block">
          <h2>상황 {situationNumber} 수요곡선</h2>
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
            data={data}
            layout="vertical"
            margin={{ bottom: 24, left: 24, right: 28, top: 16 }}
            onMouseMove={() => {
              setInteractionMode("mouse");
              setTouchPopup(null);
            }}
            onTouchStart={() => setInteractionMode("touch")}
          >
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="4 4" />
            <XAxis
              allowDecimals
              domain={[0, "dataMax + 1"]}
              label={{
                value:
                  isPersonalScope || metric === "total" ? "수요량" : "평균 수요량",
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
            <Tooltip
              content={
                <DemandTooltip
                  metric={metric}
                  mode={interactionMode}
                  scope={scope}
                />
              }
            />
            <Legend verticalAlign="top" />
            {!isPersonalScope ? (
              <Line
                activeDot={{ r: 7, fill: "var(--color-primary)", stroke: "#ffffff", strokeWidth: 2 }}
                dataKey={lineKey}
                dot={(dotProps) => {
                  const pointDotProps = dotProps as DemandPointDotRenderProps;

                  return (
                    <DemandPointDot
                      {...pointDotProps}
                      onSelect={(point, x, y) =>
                        setTouchPopup({ point, x: x + 14, y: y + 14 })
                      }
                      metric={metric}
                      scope={scope}
                      selected={
                        pointDotProps.payload?.pricePointId ===
                        touchPopup?.point.pricePointId
                      }
                    />
                  );
                }}
                name={lineName}
                stroke={lineStroke}
                strokeWidth={3}
                type="monotone"
              />
            ) : null}
            {isPersonalScope ? (
              <Line
                activeDot={{
                  r: 7,
                  fill: "#f97316",
                  stroke: "#ffffff",
                  strokeWidth: 2,
                }}
                connectNulls={false}
                dataKey="personalQuantity"
                dot={{
                  r: 5,
                  fill: "#f97316",
                  stroke: "#ffffff",
                  strokeWidth: 2,
                }}
                name="나의 응답"
                stroke="#f97316"
                strokeWidth={3}
                type="monotone"
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
        {touchPopup ? (
          <DemandTouchPopup
            metric={metric}
            onClose={() => setTouchPopup(null)}
            popup={touchPopup}
            scope={scope}
          />
        ) : null}
      </div>
    </section>
  );
}
