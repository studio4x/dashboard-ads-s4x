"use client";

import React from "react";
import { Clock } from "lucide-react";
import { useDashboard } from "./DashboardDataContext";

export function DashboardFooter() {
  const { data } = useDashboard();

  if (!data) return null;

  return (
    <footer
      style={{
        background: "white",
        borderTop: "1px solid #E2E8F0",
        padding: "16px 24px",
        marginTop: "auto",
      }}
    >
      <div
        style={{
          maxWidth: "1440px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748B" }}>
          <Clock size={14} style={{ color: "#94A3B8" }} />
          <span>
            Última sincronização dos dados:{" "}
            <strong style={{ color: "#334155" }}>
              {data.lastUpdated || "Nunca sincronizado"}
            </strong>
          </span>
        </div>

        <div 
          style={{ 
            fontSize: 10, 
            color: "#94A3B8", 
            fontWeight: 700, 
            letterSpacing: "0.05em",
            textTransform: "uppercase"
          }}
        >
          Studio 4x — Inteligência de Dados
        </div>
      </div>
    </footer>
  );
}
