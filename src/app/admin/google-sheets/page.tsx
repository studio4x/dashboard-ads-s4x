"use client";

import { GoogleSheetSourceCard } from "@/components/admin/GoogleSheetSourceCard";
import { Plus } from "lucide-react";

const mockSheets = [
  { id: "sheet-001", spreadsheetName: "Loja XYZ — Dashboard Completo", spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms", clientName: "Empresa Demo — Loja XYZ", tabsCount: 10, lastSynced: "28/04/2024 às 09:42", status: "success" as const },
  { id: "sheet-002", spreadsheetName: "Clínica Bem Estar — Métricas", spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms", clientName: "Clínica Bem Estar", tabsCount: 7, lastSynced: "27/04/2024 às 18:20", status: "success" as const },
  { id: "sheet-003", spreadsheetName: "Auto Peças Central — ADS", spreadsheetUrl: undefined, clientName: "Auto Peças Central", tabsCount: 5, lastSynced: undefined, status: "never" as const },
];

export default function GoogleSheetsPage() {
  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Google Sheets</h1>
          <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>
            Planilhas vinculadas como fonte de dados dos dashboards
          </p>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, background: "#2563EB", color: "white", fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer" }}>
          <Plus size={15} /> Vincular Planilha
        </button>
      </div>

      {/* Aviso MVP */}
      <div style={{ padding: "12px 16px", borderRadius: 10, background: "#FFFBEB", border: "1px solid #FDE68A", marginBottom: 24, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ fontSize: 16 }}>⚠️</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#B45309" }}>Modo de Demonstração</p>
          <p style={{ fontSize: 13, color: "#92400E", marginTop: 2 }}>
            Nesta versão MVP, os dados são lidos de arquivos mock locais. A integração real com a Google Sheets API será ativada na Fase 2.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {mockSheets.map((sheet) => (
          <GoogleSheetSourceCard
            key={sheet.id}
            spreadsheetName={sheet.spreadsheetName}
            spreadsheetUrl={sheet.spreadsheetUrl}
            clientName={sheet.clientName}
            tabsCount={sheet.tabsCount}
            lastSynced={sheet.lastSynced}
            status={sheet.status}
            onSync={() => alert(`Sincronizando ${sheet.spreadsheetName}...`)}
          />
        ))}
      </div>

      {/* Schema info */}
      <div className="card" style={{ padding: 20, marginTop: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", marginBottom: 12 }}>Abas Esperadas nas Planilhas</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {["overview","google_ads","meta_ads","ga4_events","audience","search_console","campaigns","keywords","search_terms","pages","devices","locations","insights"].map((tab) => (
            <span key={tab} style={{ padding: "4px 12px", borderRadius: 99, background: "#F1F5F9", color: "#475569", fontSize: 12, fontWeight: 500, fontFamily: "monospace" }}>
              {tab}
            </span>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 12 }}>
          Consulte <code style={{ background: "#F1F5F9", padding: "1px 6px", borderRadius: 4 }}>/docs/GOOGLE_SHEETS_SCHEMA.md</code> para a documentação completa do padrão de planilhas.
        </p>
      </div>
    </div>
  );
}
