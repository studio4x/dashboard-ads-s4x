"use client";

import { FileSpreadsheet, ExternalLink, RefreshCw, Pencil, Trash2 } from "lucide-react";
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
  onEdit?: () => void;
  onDelete?: () => void;
  templateId?: string;
  syncInterval?: string;
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
  onEdit,
  onDelete,
  templateId,
  syncInterval,
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
        <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
          {templateId && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#F1F5F9", color: "#475569", textTransform: "uppercase" }}>
              {templateId.replace('_s4x', '').replace('_', ' ')}
            </span>
          )}
          {syncInterval && (
            <span 
              title="Frequência de sincronização automática"
              style={{ 
                fontSize: 10, 
                fontWeight: 600, 
                padding: "2px 6px", 
                borderRadius: 4, 
                background: syncInterval === 'manual' ? "#FEF2F2" : "#F0FDF4", 
                color: syncInterval === 'manual' ? "#EF4444" : "#16A34A",
                border: `1px solid ${syncInterval === 'manual' ? "#FEE2E2" : "#DCFCE7"}`
              }}
            >
              {syncInterval === 'manual' && 'Sync: Manual'}
              {syncInterval === 'six_hours' && 'Sync: 6 horas'}
              {syncInterval === 'twelve_hours' && 'Sync: 12 horas'}
              {syncInterval === 'daily' && 'Sync: Diária'}
              {syncInterval === 'weekly' && 'Sync: Semanal'}
            </span>
          )}
          {lastSynced ? (
            <p style={{ fontSize: 11, color: "#94A3B8" }}>Última sync: {lastSynced}</p>
          ) : (
            <p style={{ fontSize: 11, color: "#EF4444", fontWeight: 500 }}>Nunca importado</p>
          )}
        </div>
      </div>

      {/* Status + Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <ImportStatusBadge status={status} />
        
        <div style={{ display: "flex", gap: 6, marginLeft: 4 }}>
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
            <RefreshCw size={14} className={status === "running" ? "animate-spin" : ""} />
          </button>

          <button
            onClick={onEdit}
            title="Editar"
            style={{
              width: 32, height: 32, borderRadius: 8, border: "1px solid #E2E8F0",
              background: "white", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#64748B", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#F8FAFC"; (e.currentTarget as HTMLButtonElement).style.color = "#0F172A"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "white"; (e.currentTarget as HTMLButtonElement).style.color = "#64748B"; }}
          >
            <Pencil size={14} />
          </button>

          <button
            onClick={onDelete}
            title="Excluir"
            style={{
              width: 32, height: 32, borderRadius: 8, border: "1px solid #FEE2E2",
              background: "white", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#EF4444", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#FEF2F2"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "white"; }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
