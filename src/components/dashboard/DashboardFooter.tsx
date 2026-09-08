"use client";

import React from "react";
import { Clock, Code2 } from "lucide-react";
import { useDashboard } from "./DashboardDataContext";
import { BrandingLogo } from "@/components/branding/BrandingLogo";

type DashboardFooterProps = {
  buildVersion: string;
  buildCommit?: string | null;
};

export function DashboardFooter({ buildVersion, buildCommit }: DashboardFooterProps) {
  const { data } = useDashboard();

  if (!data) return null;

  const buildLabel = `v${buildVersion}${buildCommit ? ` · ${buildCommit}` : ""}`;

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

        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14, flexWrap: "wrap" }}>
          <span
            title={buildCommit ? `Commit ${buildCommit}` : `Versão ${buildVersion}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 7px",
              borderRadius: 7,
              border: "1px solid #E2E8F0",
              background: "#F8FAFC",
              color: "#64748B",
              fontSize: 10,
              fontWeight: 650,
              whiteSpace: "nowrap",
            }}
          >
            <Code2 size={12} style={{ color: "#94A3B8" }} />
            Build <strong style={{ color: "#475569", fontWeight: 750 }}>{buildLabel}</strong>
          </span>

          <BrandingLogo
            alt="Dashboard ADS S4X"
            style={{ width: 150, height: 24, justifyContent: "flex-end" }}
            fallback={<span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Studio 4x — Inteligência de Dados</span>}
          />
        </div>
      </div>
    </footer>
  );
}
