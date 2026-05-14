"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SortDir = "asc" | "desc";

interface Column<T> {
  key: keyof T;
  label: string;
  align?: "left" | "right" | "center";
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableWidgetProps<T extends Record<string, unknown>> {
  data: T[];
  columns: Column<T>[];
  maxRows?: number;
  className?: string;
}

export function DataTableWidget<T extends Record<string, unknown>>({
  data,
  columns,
  maxRows = 10,
  className,
}: DataTableWidgetProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (typeof av === "number" && typeof bv === "number") {
          return sortDir === "asc" ? av - bv : bv - av;
        }
        return sortDir === "asc"
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      })
    : data;

  const rows = sorted.slice(0, maxRows);

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #F1F5F9" }}>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                onClick={() => col.sortable !== false && handleSort(col.key)}
                style={{
                  padding: "8px 12px",
                  textAlign: col.align || "left",
                  fontWeight: 600,
                  fontSize: 12,
                  color: "#64748B",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  cursor: col.sortable !== false ? "pointer" : "default",
                  whiteSpace: "nowrap",
                  userSelect: "none",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {col.label}
                  {sortKey === col.key && (
                    sortDir === "asc"
                      ? <ChevronUp size={12} />
                      : <ChevronDown size={12} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              style={{
                borderBottom: "1px solid #F8FAFC",
                background: ri % 2 === 0 ? "white" : "#FAFBFC",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#EFF6FF"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ri % 2 === 0 ? "white" : "#FAFBFC"; }}
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  style={{
                    padding: "10px 12px",
                    textAlign: col.align || "left",
                    color: "#1E293B",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col.render
                    ? col.render(row[col.key], row)
                    : String(row[col.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > maxRows && (
        <p style={{ textAlign: "center", fontSize: 12, color: "#94A3B8", padding: "10px 0 2px" }}>
          Mostrando {maxRows} de {data.length} registros
        </p>
      )}
    </div>
  );
}
