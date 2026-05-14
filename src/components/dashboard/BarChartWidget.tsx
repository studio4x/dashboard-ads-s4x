"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  BarChart as HBar,
} from "recharts";
import { CHART_PALETTE } from "@/lib/constants";

// Tooltip customizado
const CustomTooltip = ({
  active, payload, label, formatValue,
}: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; formatValue?: (v: number) => string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 12px rgb(0 0 0/0.08)", fontSize: 13 }}>
      <p style={{ fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, color: "#475569" }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: p.color, display: "inline-block" }} />
          <span style={{ fontWeight: 600, color: "#0F172A" }}>
            {formatValue ? formatValue(p.value) : p.value.toLocaleString("pt-BR")}
          </span>
        </div>
      ))}
    </div>
  );
};

interface BarChartWidgetProps {
  data: Record<string, string | number>[];
  dataKey: string;
  xKey?: string;
  color?: string;
  formatValue?: (v: number) => string;
  height?: number;
}

export function BarChartWidget({ data, dataKey, xKey = "date", color = CHART_PALETTE[0], formatValue, height = 260 }: BarChartWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => formatValue ? formatValue(v) : v.toLocaleString("pt-BR")} />
        <Tooltip content={<CustomTooltip formatValue={formatValue} />} cursor={{ fill: "rgba(37,99,235,0.06)" }} />
        <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((_, i) => (
            <Cell key={i} fill={color} fillOpacity={0.85 + (i % 3) * 0.05} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Gráfico de barras horizontais
interface HorizontalBarChartWidgetProps {
  data: { label: string; value: number; [k: string]: string | number }[];
  dataKey?: string;
  formatValue?: (v: number) => string;
  height?: number;
}

export function HorizontalBarChartWidget({ data, dataKey = "value", formatValue, height = 260 }: HorizontalBarChartWidgetProps) {
  const sorted = [...data].sort((a, b) => (b[dataKey] as number) - (a[dataKey] as number));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <HBar data={sorted} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatValue ? formatValue(v) : v.toLocaleString("pt-BR")} />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: "#475569" }} axisLine={false} tickLine={false} width={140} />
        <Tooltip content={<CustomTooltip formatValue={formatValue} />} cursor={{ fill: "rgba(37,99,235,0.06)" }} />
        <Bar dataKey={dataKey} radius={[0, 4, 4, 0]} maxBarSize={24}>
          {sorted.map((_, i) => (
            <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
          ))}
        </Bar>
      </HBar>
    </ResponsiveContainer>
  );
}
