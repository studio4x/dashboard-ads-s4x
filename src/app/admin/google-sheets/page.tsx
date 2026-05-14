"use client";

import { useState, useEffect } from "react";
import { GoogleSheetSourceCard } from "@/components/admin/GoogleSheetSourceCard";
import { Plus, RefreshCw, AlertTriangle, CheckCircle2, Info } from "lucide-react";

interface SheetSource {
  id: string;
  spreadsheetId: string;
  spreadsheetName: string;
  clientName: string;
  clientId: string;
  dashboardId: string;
  tabsCount: number;
  lastSynced?: string;
  status: "pending" | "success" | "failed" | "running";
}

export default function GoogleSheetsAdminPage() {
  const [sources, setSources] = useState<SheetSource[]>([
    { id: "1", spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms", spreadsheetName: "Loja XYZ — Dashboard Completo", clientName: "Loja XYZ", clientId: "client-001", dashboardId: "dashboard-demo-001", tabsCount: 10, status: "pending" },
  ]);
  
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [useMocks, setUseMocks] = useState(true);

  // No MVP real, buscaríamos isso do process.env via uma API route
  useEffect(() => {
    // Simulação de verificação de modo
    setUseMocks(process.env.NEXT_PUBLIC_USE_MOCKS !== "false");
  }, []);

  const handleSync = async (source: SheetSource) => {
    setIsSyncing(source.id);
    
    try {
      const response = await fetch("/api/admin/google-sheets/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: source.clientId,
          dashboardId: source.dashboardId,
          spreadsheetId: source.spreadsheetId
        })
      });

      const result = await response.json();

      if (result.success) {
        setSources(prev => prev.map(s => s.id === source.id ? { 
          ...s, 
          status: "success", 
          lastSynced: new Date().toLocaleString("pt-BR"),
          spreadsheetName: result.log.spreadsheetTitle || s.spreadsheetName
        } : s));
        alert("Sincronização concluída com sucesso!");
      } else {
        setSources(prev => prev.map(s => s.id === source.id ? { ...s, status: "failed" } : s));
        alert(`Erro na sincronização: ${result.error}`);
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao conectar com o servidor.");
      setSources(prev => prev.map(s => s.id === source.id ? { ...s, status: "failed" } : s));
    } finally {
      setIsSyncing(null);
    }
  };

  return (
    <div style={{ padding: 32, maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0F172A" }}>Google Sheets</h1>
          <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>
            Gerencie as planilhas que alimentam os dashboards dos seus clientes.
          </p>
        </div>
        <button 
          style={{ 
            background: "#2563EB", color: "white", border: "none", padding: "10px 16px", 
            borderRadius: 8, fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" 
          }}
          onClick={() => alert("Funcionalidade de adicionar nova planilha em breve (Fase 3).")}
        >
          <Plus size={18} />
          Nova Planilha
        </button>
      </div>

      {/* Modo de Operação */}
      <div className="card" style={{ padding: 16, marginBottom: 32, background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Info size={20} color="#2563EB" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>Modo de Dados</p>
              <p style={{ fontSize: 12, color: "#64748B" }}>
                {useMocks 
                  ? "Atualmente exibindo MOCKS para segurança. Altere no .env para usar dados reais." 
                  : "Conexão com Google Sheets API ATIVA."}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ 
              fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 99, 
              background: useMocks ? "#F1F5F9" : "#DCFCE7", 
              color: useMocks ? "#64748B" : "#16A34A" 
            }}>
              {useMocks ? "MOCK MODE" : "REAL API MODE"}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>Planilhas Vinculadas</h2>
        
        {sources.map((source) => (
          <GoogleSheetSourceCard
            key={source.id}
            spreadsheetName={source.spreadsheetName}
            clientName={source.clientName}
            tabsCount={source.tabsCount}
            lastSynced={source.lastSynced}
            status={isSyncing === source.id ? "running" : source.status as any}
            onSync={() => handleSync(source)}
            spreadsheetUrl={`https://docs.google.com/spreadsheets/d/${source.spreadsheetId}`}
          />
        ))}
      </div>

      {/* Logs de Importação (Simulados) */}
      <div style={{ marginTop: 48 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A" }}>Logs de Importação Recentes</h2>
          <button style={{ background: "none", border: "none", color: "#2563EB", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <RefreshCw size={14} />
            Atualizar logs
          </button>
        </div>
        
        <div className="card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748B" }}>Início</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748B" }}>Dashboard</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748B" }}>Status</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748B" }}>Abas</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748B" }}>Erros/Avisos</th>
              </tr>
            </thead>
            <tbody>
              {sources.filter(s => s.status === "success").map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "12px 16px", color: "#0F172A" }}>{s.lastSynced || "—"}</td>
                  <td style={{ padding: "12px 16px", color: "#0F172A" }}>{s.spreadsheetName}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#16A34A", fontWeight: 500 }}>
                      <CheckCircle2 size={14} /> Sucesso
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#64748B" }}>10 abas</td>
                  <td style={{ padding: "12px 16px", color: "#64748B" }}>0/0</td>
                </tr>
              ))}
              {sources.length === 0 || !sources.some(s => s.lastSynced) && (
                <tr>
                  <td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#94A3B8" }}>
                    Nenhuma importação realizada recentemente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
