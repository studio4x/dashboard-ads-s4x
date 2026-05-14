"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CHART_COLORS, CHART_PALETTE } from "@/lib/constants";

interface LineChartWidgetProps {
  data: Record<string, string | number>[];
  lines: {
    key: string;
    label: string;
    color?: string;
  }[];
  xKey?: string;
  formatValue?: (v: number) => string;
  height?: number;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  formatValue?: (v: number) => string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #E2E8F0",
        borderRadius: 10,
        padding: "10px 14px",
        boxShadow: "0 4px 12px rgb(0 0 0/0.08)",
        fontSize: 13,
      }}
    >
      <p style={{ fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, color: "#475569" }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: p.color, display: "inline-block" }} />
          <span>{p.name}:</span>
          <span style={{ fontWeight: 600, color: "#0F172A" }}>
            {formatValue ? formatValue(p.value) : p.value.toLocaleString("pt-BR")}
          </span>
        </div>
      ))}
    </div>
  );
};

export function LineChartWidget({
  data,
  lines,
  xKey = "date",
  formatValue,
  height = 260,
}: LineChartWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          axisLine={false}
          tickLine={false}
          width={48}
          tickFormatter={(v) => (formatValue ? formatValue(v) : v.toLocaleString("pt-BR"))}
        />
        <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
        {lines.length > 1 && (
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: "#64748B" }}
          />
        )}
        {lines.map((line, i) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.label}
            stroke={line.color || CHART_PALETTE[i % CHART_PALETTE.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
