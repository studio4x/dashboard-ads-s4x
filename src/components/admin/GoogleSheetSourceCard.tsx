"use client";

import { FileSpreadsheet, ExternalLink, RefreshCw } from "lucide-react";
import { ImportStatusBadge } from "./ImportStatusBadge";
import type { ImportStatus } from "@/types/data-sources";

interface GoogleSheetSourceCardProps {
  spreadsheetName: string;
  spreadsheetUrl?: string;
  clientName: string;
  dashboardName?: string;
  tabsCount: number;
  lastSynced?: string;
  status: ImportStatus;
  onSync?: () => void;
}

export function GoogleSheetSourceCard({
  spreadsheetName,
  spreadsheetUrl,
  clientName,
  dashboardName,
  tabsCount,
  lastSynced,
  status,
  onSync,
}: GoogleSheetSourceCardProps) {
  return (
    <div
      className="card card-hover"
      style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}
    >
      {/* Icon */}
      <div
        style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: "linear-gradient(135deg, #34A853, #0F9D58)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <FileSpreadsheet size={22} color="white" />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {spreadsheetName}
          </p>
          {spreadsheetUrl && (
            <a href={spreadsheetUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#94A3B8", flexShrink: 0 }}>
              <ExternalLink size={13} />
            </a>
          )}
        </div>
        <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
          {clientName} {dashboardName && `· ${dashboardName}`}
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
          {lastSynced ? (
            <p style={{ fontSize: 11, color: "#94A3B8" }}>Última sync: {lastSynced}</p>
          ) : (
            <p style={{ fontSize: 11, color: "#EF4444", fontWeight: 500 }}>Nunca importado</p>
          )}
        </div>
      </div>

      {/* Status + Action */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <ImportStatusBadge status={status} />
        <button
          onClick={onSync}
          title="Sincronizar"
          style={{
            width: 32, height: 32, borderRadius: 8, border: "1px solid #E2E8F0",
            background: "white", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#64748B", transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#EFF6FF"; (e.currentTarget as HTMLButtonElement).style.color = "#2563EB"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "white"; (e.currentTarget as HTMLButtonElement).style.color = "#64748B"; }}
        >
          <RefreshCw size={14} />
        </button>
      </div>
    </div>
  );
}
