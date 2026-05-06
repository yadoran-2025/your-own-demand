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

function DistributionRows({
  title,
  average,
  count,
  rows,
}: {
  title: string;
  average: number;
  count: number;
  rows: DemandPoint["classDistribution"];
}) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] p-3">
      <div className="flex items-baseline justify-between gap-3">
        <strong>{title}</strong>
        <span className="text-sm text-[var(--text-muted)]">평균 {average.toFixed(2)}개</span>
      </div>
      <p className="mt-1 text-sm text-[var(--text-muted)]">응답 {count}명</p>
      <div className="mt-2 grid gap-1 text-sm">
        {rows.map((row) => (
          <div className="flex justify-between gap-4" key={row.label}>
            <span>{row.label}</span>
            <span className="font-black">{row.count}명</span>
          </div>
        ))}
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
    <div className="w-[19rem] rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] p-3 shadow-xl">
      <p className="text-base font-black">{formatWon(point.price)}</p>
      <div className="mt-3 grid gap-2">
        <DistributionRows
          average={point.classAverage}
          count={point.classCount}
          rows={point.classDistribution}
          title="선택한 반"
        />
        <DistributionRows
          average={point.overallAverage}
          count={point.overallCount}
          rows={point.overallDistribution}
          title="전체 학생"
        />
      </div>
    </div>
  );
}

export function DemandChart({ data, title, filterLabel }: DemandChartProps) {
  if (!data.length) {
    return (
      <section className="surface grid min-h-[24rem] place-items-center rounded-lg p-5 text-center">
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="mt-2 text-[var(--text-muted)]">가격 구간이 아직 없습니다.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="surface rounded-lg p-4 md:p-5">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-black">{title} 수요곡선</h2>
          <p className="text-sm font-bold text-[var(--text-muted)]">{filterLabel}</p>
        </div>
        <p className="text-sm text-[var(--text-muted)]">x축 수요량, y축 가격</p>
      </div>
      <div className="h-[28rem] w-full">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart
            data={data}
            layout="vertical"
            margin={{ bottom: 24, left: 24, right: 28, top: 16 }}
          >
            <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
            <XAxis
              allowDecimals
              domain={[0, "dataMax + 1"]}
              label={{
                value: "평균 수요량",
                position: "insideBottom",
                offset: -14,
              }}
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              type="number"
            />
            <YAxis
              allowDataOverflow={false}
              dataKey="price"
              domain={[0, "dataMax"]}
              reversed
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              tickFormatter={(value) => `${Number(value).toLocaleString("ko-KR")}`}
              type="number"
              width={84}
            />
            <Tooltip content={<DemandTooltip />} />
            <Legend verticalAlign="top" />
            <Line
              activeDot={{ r: 7 }}
              dataKey="classAverage"
              dot={{ r: 5 }}
              name="우리 반 평균"
              stroke="var(--brand)"
              strokeWidth={3}
              type="monotone"
            />
            <Line
              activeDot={{ r: 7 }}
              dataKey="overallAverage"
              dot={{ r: 5 }}
              name="전체 학생 평균"
              stroke="var(--color-text-tertiary)"
              strokeWidth={3}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}


