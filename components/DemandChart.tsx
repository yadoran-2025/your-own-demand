"use client";

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
import type { DemandPoint } from "@/lib/types";
import { formatWon } from "@/lib/utils";

type DemandChartProps = {
  data: DemandPoint[];
  title: string;
  filterLabel: string;
};

type TooltipPayload = {
  payload: DemandPoint;
};

function RespondentRows({
  average,
  count,
  rows,
}: {
  average: number;
  count: number;
  rows: DemandPoint["classRespondents"];
}) {
  return (
    <div className="tooltip-respondents">
      <div className="tooltip-respondents-head">
        <strong>응답 학생</strong>
        <span>평균 {average.toFixed(2)}개</span>
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

function DemandTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0].payload;

  return (
    <div className="demand-tooltip">
      <p>{formatWon(point.price)}</p>
      <RespondentRows
        average={point.classAverage}
        count={point.classCount}
        rows={point.classRespondents}
      />
    </div>
  );
}

export function DemandChart({ data, title, filterLabel }: DemandChartProps) {
  if (!data.length) {
    return (
      <section className="teacher-card empty-state chart-empty">
        <h2>{title}</h2>
        <p>가격 구간이 아직 없습니다.</p>
      </section>
    );
  }

  const firstPoint = data[0];

  return (
    <section className="teacher-card chart-card">
      <div className="chart-header">
        <div>
          <h2>{title} 수요곡선</h2>
          <p>{filterLabel}</p>
        </div>
        <div className="chart-meta">
          <div>
            <strong>{firstPoint.overallCount}명</strong>
            <span>응답 수</span>
          </div>
          <div>
            <strong>{firstPoint.overallAverage.toFixed(1)}개</strong>
            <span>{formatWon(firstPoint.price)} 평균</span>
          </div>
        </div>
      </div>
      <div className="chart-canvas">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart
            data={data}
            layout="vertical"
            margin={{ bottom: 24, left: 24, right: 28, top: 16 }}
          >
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="4 4" />
            <XAxis
              allowDecimals
              domain={[0, "dataMax + 1"]}
              label={{
                value: "평균 수요량",
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
            <Tooltip content={<DemandTooltip />} />
            <Legend verticalAlign="top" />
            <Line
              activeDot={{ r: 7 }}
              dataKey="classAverage"
              dot={{ r: 5 }}
              name="선택한 반 평균"
              stroke="var(--color-primary)"
              strokeWidth={3}
              type="monotone"
            />
            <Line
              activeDot={{ r: 7 }}
              dataKey="overallAverage"
              dot={{ r: 5 }}
              name="전체 학생 평균"
              stroke="var(--color-text-secondary)"
              strokeDasharray="6 4"
              strokeWidth={3}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
