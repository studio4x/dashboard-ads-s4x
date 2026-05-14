"use client";

import Link from "next/link";
import { BarChart3, Bell, Settings, ChevronDown, LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";

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
  dateRangeLabel = "Últimos 30 dias",
  onDateRangeClick,
}: DashboardHeaderProps) {
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
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, color: "#94A3B8" }}>{clientName}</span>
          <span style={{ color: "#CBD5E1" }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{dashboardTitle}</span>
        </div>
      </div>

      {/* Right: Period + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={onDateRangeClick}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 8,
            border: "1px solid #E2E8F0",
            background: "white",
            fontSize: 13,
            fontWeight: 500,
            color: "#475569",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#F8FAFC"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "white"; }}
        >
          📅 {dateRangeLabel}
          <ChevronDown size={14} />
        </button>

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
