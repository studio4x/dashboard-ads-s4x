"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type GoogleAdsTrendPoint = {
  label: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  cvr: number;
  cpa: number | null;
  rankLost: number | null;
};

type Props = {
  points: GoogleAdsTrendPoint[];
};

type MetricKey = "clicks" | "ctr" | "cpc" | "conversions" | "cpa" | "rankLost";

const METRICS: Array<{ key: MetricKey; label: string; kind: "number" | "currency" | "percent" }> = [
  { key: "clicks", label: "Cliques", kind: "number" },
  { key: "ctr", label: "Taxa de cliques", kind: "percent" },
  { key: "cpc", label: "Custo por clique", kind: "currency" },
  { key: "conversions", label: "Conversões", kind: "number" },
  { key: "cpa", label: "Custo por conversão", kind: "currency" },
  { key: "rankLost", label: "Perda por classificação", kind: "percent" },
];

function formatValue(value: number | null | undefined, kind: "number" | "currency" | "percent") {
  if (value == null || !Number.isFinite(value)) return "—";
  if (kind === "currency") {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(value);
  }
  if (kind === "percent") return `${value.toFixed(1).replace(".", ",")}%`;
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);
}

export function GoogleAdsTrendExplorer({ points }: Props) {
  const [metric, setMetric] = useState<MetricKey>("clicks");
  const definition = METRICS.find((item) => item.key === metric) || METRICS[0];

  const data = useMemo(() => points.map((point) => ({ ...point })), [points]);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {METRICS.map((item) => {
          const active = item.key === metric;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setMetric(item.key)}
              style={{
                border: `1px solid ${active ? "#93C5FD" : "#E2E8F0"}`,
                background: active ? "#EFF6FF" : "#FFFFFF",
                color: active ? "#1D4ED8" : "#64748B",
                borderRadius: 999,
                padding: "5px 9px",
                fontSize: 10.5,
                fontWeight: active ? 750 : 650,
                cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div style={{ width: "100%", height: 190 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 10, fill: "#64748B" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => definition.kind === "currency" ? `R$ ${Number(value).toFixed(0)}` : definition.kind === "percent" ? `${Number(value).toFixed(0)}%` : String(Math.round(Number(value)))}
            />
            <Tooltip
              formatter={(value) => [formatValue(Number(value), definition.kind), definition.label]}
              labelStyle={{ color: "#334155", fontWeight: 700 }}
              contentStyle={{ border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 11 }}
            />
            <Line
              type="monotone"
              dataKey={metric}
              stroke="#2563EB"
              strokeWidth={2.2}
              dot={{ r: 2.5 }}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
