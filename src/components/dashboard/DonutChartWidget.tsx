"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { CHART_PALETTE } from "@/lib/constants";

interface DonutChartWidgetProps {
  data: { name: string; value: number }[];
  formatValue?: (v: number) => string;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
}

const CustomTooltip = ({
  active, payload, formatValue,
}: { active?: boolean; payload?: { name: string; value: number; payload: { name: string } }[]; formatValue?: (v: number) => string }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 10, padding: "8px 12px", boxShadow: "0 4px 12px rgb(0 0 0/0.08)", fontSize: 13 }}>
      <p style={{ fontWeight: 600, color: "#0F172A" }}>{item.name}</p>
      <p style={{ color: "#475569" }}>{formatValue ? formatValue(item.value) : item.value.toLocaleString("pt-BR")}</p>
    </div>
  );
};

export function DonutChartWidget({ data, formatValue, height = 260, innerRadius = 55, outerRadius = 90 }: DonutChartWidgetProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value, entry) => {
            const pct = total > 0 ? (((entry.payload as { value: number }).value / total) * 100).toFixed(1) : "0";
            return <span style={{ fontSize: 12, color: "#475569" }}>{value} ({pct}%)</span>;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
