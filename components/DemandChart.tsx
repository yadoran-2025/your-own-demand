"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
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
import { createPortal } from "react-dom";
import type { DemandMetric, DemandPoint, DemandScope } from "@/lib/types";
import { formatWon } from "@/lib/utils";

type DemandChartProps = {
  lineNameOverride?: string;
  data: DemandPoint[];
  metric: DemandMetric;
  respondentCount: number;
  scope: DemandScope;
  situationNumber: number;
  title?: string;
};

type DemandPointDotRenderProps = {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: DemandPoint;
};

type TooltipPayload = {
  payload: DemandPoint;
  dataKey?: string;
  value?: number;
};

type ChartPointerState = {
  activeCoordinate?: {
    x?: number;
    y?: number;
  };
  activePayload?: TooltipPayload[];
};

type PointDetails = {
  value: number;
  count: number;
  metric: DemandMetric;
  rows: DemandPoint["classRespondents"];
};

type TouchPopup = {
  placement: "above" | "below";
  point: DemandPoint;
  x: number;
  y: number;
};

const TOUCH_TOOLTIP_WIDTH = 304;
const TOUCH_TOOLTIP_ESTIMATED_HEIGHT = 260;
const TOUCH_TOOLTIP_MARGIN = 16;
const TOUCH_TOOLTIP_OFFSET = 14;

function getTouchTooltipWidth() {
  if (typeof window === "undefined") {
    return TOUCH_TOOLTIP_WIDTH;
  }

  const rootFontSize = Number.parseFloat(
    window.getComputedStyle(document.documentElement).fontSize,
  );
  const remWidth = Number.isFinite(rootFontSize)
    ? rootFontSize * 19
    : TOUCH_TOOLTIP_WIDTH;

  return Math.min(remWidth, window.innerWidth - TOUCH_TOOLTIP_MARGIN * 2);
}

function getPopupPosition(anchorX: number, anchorY: number) {
  if (typeof window === "undefined") {
    return { placement: "below" as const, x: anchorX, y: anchorY };
  }

  const halfWidth = getTouchTooltipWidth() / 2;
  const x = Math.min(
    window.innerWidth - halfWidth - TOUCH_TOOLTIP_MARGIN,
    Math.max(halfWidth + TOUCH_TOOLTIP_MARGIN, anchorX),
  );
  const hasEnoughSpaceBelow =
    anchorY + TOUCH_TOOLTIP_OFFSET + TOUCH_TOOLTIP_ESTIMATED_HEIGHT <=
    window.innerHeight - TOUCH_TOOLTIP_MARGIN;

  if (hasEnoughSpaceBelow) {
    return {
      placement: "below" as const,
      x,
      y: Math.max(TOUCH_TOOLTIP_MARGIN, anchorY + TOUCH_TOOLTIP_OFFSET),
    };
  }

  return {
    placement: "above" as const,
    x,
    y: Math.min(
      window.innerHeight - TOUCH_TOOLTIP_MARGIN,
      Math.max(TOUCH_TOOLTIP_MARGIN, anchorY - TOUCH_TOOLTIP_OFFSET),
    ),
  };
}

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

function getDemandValue(
  point: DemandPoint,
  scope: DemandScope,
  metric: DemandMetric,
) {
  if (scope === "personal") {
    return point.personalQuantity ?? 0;
  }

  if (metric === "average") {
    return scope === "school" ? point.overallAverage : point.classAverage;
  }

  return scope === "school" ? point.overallTotal : point.classTotal;
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
  const popupStyle = {
    left: popup.x,
    maxHeight:
      popup.placement === "above"
        ? `calc(${popup.y}px - ${TOUCH_TOOLTIP_MARGIN}px)`
        : `calc(100vh - ${popup.y}px - ${TOUCH_TOOLTIP_MARGIN}px)`,
    top: popup.y,
  };

  const content = (
    <div
      className="demand-tooltip demand-touch-tooltip"
      data-placement={popup.placement}
      style={popupStyle}
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

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(content, document.body);
}

function DemandPointDot({
  cx,
  cy,
  payload,
  metric,
  scope,
  selected,
  onMouseSelect,
  onTouchSelect,
}: {
  cx?: number;
  cy?: number;
  payload?: DemandPoint;
  metric: DemandMetric;
  scope: DemandScope;
  selected: boolean;
  onMouseSelect: (point: DemandPoint, clientX: number, clientY: number) => void;
  onTouchSelect: (point: DemandPoint, clientX: number, clientY: number) => void;
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
    const touch = event.changedTouches[0] ?? event.touches[0];

    if (touch) {
      onTouchSelect(payload, touch.clientX, touch.clientY);
    }
  };
  const handleClick = (event: MouseEvent<SVGGElement>) => {
    event.stopPropagation();
    onMouseSelect(payload, event.clientX, event.clientY);
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

function AbsorbingDemandPointDot({
  absorptionKey,
  cx,
  cy,
  index = 0,
  payload,
  xOffset,
}: {
  absorptionKey: number;
  cx?: number;
  cy?: number;
  index?: number;
  payload?: DemandPoint;
  xOffset: number;
}) {
  if (
    typeof cx !== "number" ||
    typeof cy !== "number" ||
    !payload ||
    typeof payload.personalQuantity !== "number"
  ) {
    return null;
  }

  const style = {
    "--absorb-delay": `${Math.min(index, 8) * 55}ms`,
    "--absorb-x": `${xOffset}px`,
  } as CSSProperties;

  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <g
        className="demand-absorbing-dot"
        data-absorb-key={absorptionKey}
        style={style}
      >
        <circle className="demand-absorbing-halo" r={14} />
        <circle className="demand-absorbing-core" r={5.5} />
      </g>
    </g>
  );
}

export function DemandChart({
  data,
  lineNameOverride,
  metric,
  respondentCount,
  scope,
  situationNumber,
  title,
}: DemandChartProps) {
  const [interactionMode, setInteractionMode] = useState<"mouse" | "touch">("mouse");
  const [pinnedPopup, setPinnedPopup] = useState<TouchPopup | null>(null);
  const [touchPopup, setTouchPopup] = useState<TouchPopup | null>(null);
  const [absorptionKey, setAbsorptionKey] = useState(0);
  const [isAbsorbing, setIsAbsorbing] = useState(false);
  const [chartWidth, setChartWidth] = useState(0);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const previousScopeRef = useRef(scope);

  const hasPersonalDemand = data.some(
    (point) => typeof point.personalQuantity === "number",
  );

  useEffect(() => {
    setPinnedPopup(null);
    setTouchPopup(null);
  }, [data, metric, scope, situationNumber]);

  useEffect(() => {
    const element = canvasRef.current;

    if (!element) {
      return;
    }

    const updateWidth = () => setChartWidth(element.clientWidth);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const previousScope = previousScopeRef.current;
    previousScopeRef.current = scope;

    if (previousScope !== "personal" || scope === "personal" || !hasPersonalDemand) {
      return;
    }

    setAbsorptionKey((current) => current + 1);
    setIsAbsorbing(true);

    const timeoutId = window.setTimeout(() => {
      setIsAbsorbing(false);
    }, 980);

    return () => window.clearTimeout(timeoutId);
  }, [hasPersonalDemand, scope]);

  if (!data.length) {
    return (
      <section className="teacher-card empty-state chart-empty">
        <h2>상황 {situationNumber} 수요곡선</h2>
        <p>가격 구간이 아직 없습니다.</p>
      </section>
    );
  }

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
    lineNameOverride ??
    (scope === "class"
      ? metric === "average"
        ? "우리 반 평균"
        : "우리 반 수요량"
      : metric === "average"
        ? "학교 전체 평균"
        : "학교 전체 수요량");
  const lineStroke =
    scope === "class" ? "var(--color-primary)" : "var(--color-text-secondary)";
  const isPersonalScope = scope === "personal";
  const maxVisibleValue = Math.max(
    0,
    ...data.map((point) => getDemandValue(point, scope, metric)),
    ...data.map((point) => point.personalQuantity ?? 0),
  );
  const plotWidth = Math.max(chartWidth - 136, 240);
  const pixelsPerUnit = plotWidth / Math.max(maxVisibleValue + 1, 1);
  const getAbsorbOffset = (point: DemandPoint) => {
    if (typeof point.personalQuantity !== "number") {
      return 0;
    }

    const rawOffset =
      (point.personalQuantity - getDemandValue(point, scope, metric)) *
      pixelsPerUnit;

    return Math.max(-220, Math.min(220, rawOffset));
  };
  const getViewportPopupPosition = (x: number, y: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();

    if (!rect) {
      return getPopupPosition(x, y);
    }

    return getPopupPosition(rect.left + x, rect.top + y);
  };
  const pinPointAtViewport = (point: DemandPoint, clientX: number, clientY: number) => {
    setInteractionMode("mouse");
    setTouchPopup(null);
    setPinnedPopup({
      point,
      ...getPopupPosition(clientX, clientY),
    });
  };
  const pinPointFromChart = (point: DemandPoint, x: number, y: number) => {
    setInteractionMode("mouse");
    setTouchPopup(null);
    setPinnedPopup({ point, ...getViewportPopupPosition(x, y) });
  };

  return (
    <section className="teacher-card chart-card">
      <div className="chart-header">
        <div className="chart-title-block">
          <h2>{title ?? `상황 ${situationNumber} 수요곡선`}</h2>
        </div>
        <div className="chart-meta">
          <div>
            <span>응답자수</span>
            <strong>{respondentCount}</strong>
          </div>
        </div>
      </div>
      <div className="chart-canvas" ref={canvasRef}>
        <ResponsiveContainer height="100%" width="100%">
          <LineChart
            data={data}
            layout="vertical"
            margin={{ bottom: 24, left: 24, right: 28, top: 16 }}
            onClick={(state: unknown) => {
              if (isPersonalScope) {
                return;
              }

              const chartState = state as ChartPointerState;
              const point = chartState.activePayload?.find(
                (item) => item.dataKey === lineKey,
              )?.payload;
              const coordinate = chartState.activeCoordinate;

              if (
                !point ||
                typeof coordinate?.x !== "number" ||
                typeof coordinate.y !== "number"
              ) {
                return;
              }

              pinPointFromChart(point, coordinate.x, coordinate.y);
            }}
            onMouseMove={() => {
              setInteractionMode("mouse");
              setTouchPopup(null);
            }}
            onTouchStart={() => {
              setInteractionMode("touch");
              setPinnedPopup(null);
            }}
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
                  mode={pinnedPopup ? "touch" : interactionMode}
                  scope={scope}
                />
              }
            />
            <Legend verticalAlign="top" />
            {isAbsorbing && !isPersonalScope ? (
              <Line
                className="demand-personal-absorb-line"
                connectNulls={false}
                dataKey="personalQuantity"
                dot={false}
                isAnimationActive={false}
                legendType="none"
                stroke="#f97316"
                strokeWidth={3}
                type="monotone"
              />
            ) : null}
            {!isPersonalScope ? (
              <Line
                activeDot={{
                  r: 7,
                  fill: "var(--color-primary)",
                  stroke: "#ffffff",
                  strokeWidth: 2,
                  style: { pointerEvents: "none" },
                }}
                dataKey={lineKey}
                dot={(dotProps) => {
                  const pointDotProps = dotProps as DemandPointDotRenderProps;

                  if (isAbsorbing) {
                    return (
                      <AbsorbingDemandPointDot
                        {...pointDotProps}
                        absorptionKey={absorptionKey}
                        xOffset={
                          pointDotProps.payload
                            ? getAbsorbOffset(pointDotProps.payload)
                            : 0
                        }
                      />
                    );
                  }

                      return (
                    <DemandPointDot
                      {...pointDotProps}
                      onMouseSelect={pinPointAtViewport}
                      onTouchSelect={(point, x, y) =>
                        setTouchPopup({
                          point,
                          ...getPopupPosition(x, y),
                        })
                      }
                      metric={metric}
                      scope={scope}
                      selected={
                        pointDotProps.payload?.pricePointId ===
                        (pinnedPopup ?? touchPopup)?.point.pricePointId
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
        {pinnedPopup ? (
          <DemandTouchPopup
            metric={metric}
            onClose={() => setPinnedPopup(null)}
            popup={pinnedPopup}
            scope={scope}
          />
        ) : null}
      </div>
    </section>
  );
}
