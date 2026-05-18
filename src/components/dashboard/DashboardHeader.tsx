"use client";

import Link from "next/link";
import { BarChart3, Bell, Settings, LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";
import { DateRangeSelector } from "./DateRangeSelector";
import { useDashboard } from "./DashboardDataContext";

interface DashboardHeaderProps {
  clientName: string;
  dashboardTitle: string;
  dashboardId: string;
  dateRangeLabel?: string;
  onDateRangeClick?: () => void;
}

export function DashboardHeader({
  clientName,
  dashboardTitle,
  dashboardId,
}: DashboardHeaderProps) {
  const { rangePreset, updateRange, data } = useDashboard();
  
  const metricsSource = data?.config?.Fonte || data?.config?.fonte || (data?.source === "mock" ? "Mocks" : "Google Sheets");
  const accountId = data?.meta?.Conta_ID || data?.meta?.conta_id || data?.meta?.Conta || null;

  return (
    <header
      style={{
        background: "white",
        borderBottom: "1px solid #E2E8F0",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 60,
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Left: Logo + breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/app/dashboards" style={{ textDecoration: "none" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #2563EB, #7C3AED)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BarChart3 size={17} color="white" />
          </div>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#94A3B8" }}>{clientName}</span>
          <span style={{ color: "#CBD5E1" }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{dashboardTitle}</span>
          
          {/* Badges de Fonte e Conta */}
          {metricsSource && (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider">
              Fonte: {metricsSource}
            </span>
          )}
          {accountId && (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">
              ID Conta Google: {accountId}
            </span>
          )}
        </div>
      </div>

      {/* Right: Period + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <DateRangeSelector 
          currentPreset={rangePreset} 
          onPresetChange={updateRange} 
        />

        <button
          style={{
            width: 34, height: 34, borderRadius: 8, border: "1px solid #E2E8F0",
            background: "white", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#64748B",
          }}
        >
          <Bell size={16} />
        </button>

        <Link
          href="/admin"
          style={{
            width: 34, height: 34, borderRadius: 8, border: "1px solid #E2E8F0",
            background: "white", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#64748B", textDecoration: "none",
          }}
          title="Painel Admin"
        >
          <Settings size={16} />
        </Link>

        <button
          onClick={() => logout()}
          style={{
            width: 34, height: 34, borderRadius: 8, border: "1px solid #FEF2F2",
            background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#DC2626",
          }}
          title="Sair"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
