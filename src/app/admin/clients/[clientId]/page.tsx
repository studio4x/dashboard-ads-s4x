import { AdminService } from "@/services/admin-service";
import { requireAdmin } from "@/lib/auth/guards";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Building2, LayoutDashboard, FileSpreadsheet, Users, CheckCircle2, Circle, ArrowLeft, Plus } from "lucide-react";

export default async function ClientHubPage({ params }: { params: { clientId: string } }) {
  await requireAdmin();
  
  const hubData = await AdminService.getClientHubDetails(params.clientId);
  
  if (!hubData) {
    notFound();
  }

  const { client, dashboards, dataSources, userRoles } = hubData;

  // Onboarding Checklist Logic
  const hasClient = !!client;
  const hasDashboard = dashboards.length > 0;
  const hasSource = dataSources.length > 0;
  const hasImport = dataSources.some((s: any) => s.last_import_status === "success" || s.last_import_status === "success_with_warnings");
  const hasUser = userRoles.length > 0;

  const checklist = [
    { label: "Cliente criado", done: hasClient },
    { label: "Dashboard criado", done: hasDashboard },
    { label: "Fonte Google Sheets cadastrada", done: hasSource },
    { label: "Primeira importação realizada com sucesso", done: hasImport },
    { label: "Usuário client vinculado", done: hasUser },
  ];

  const checklistProgress = (checklist.filter(c => c.done).length / checklist.length) * 100;

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <div style={{ marginBottom: 32, display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/admin/clients" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 8, background: "#F1F5F9", color: "#475569", textDecoration: "none" }}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: 12 }}>
            {client.name}
            <span style={{ fontSize: 12, color: client.status === "active" ? "#16A34A" : "#64748B", background: client.status === "active" ? "#DCFCE7" : "#F1F5F9", padding: "4px 10px", borderRadius: 99, fontWeight: 600 }}>
              {client.status === "active" ? "Ativo" : "Inativo"}
            </span>
          </h1>
          <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>
            {client.company_name || "Empresa não informada"} {client.website_url && ` • ${client.website_url}`}
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Dashboards */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}>
                <LayoutDashboard size={20} color="#7C3AED" /> Dashboards Vinculados
              </h2>
              <button disabled style={{ fontSize: 13, padding: "6px 12px", background: "#F1F5F9", color: "#94A3B8", borderRadius: 6, border: "none", cursor: "not-allowed" }}>
                + Novo Dashboard
              </button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {dashboards.length === 0 ? (
                <p style={{ fontSize: 14, color: "#64748B", textAlign: "center", padding: "20px 0" }}>Nenhum dashboard cadastrado.</p>
              ) : (
                dashboards.map((d: any) => (
                  <div key={d.id} style={{ padding: 16, borderRadius: 8, border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "#0F172A" }}>{d.title}</p>
                      <p style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>ID: {d.id.substring(0,8)}... • Status: {d.status}</p>
                    </div>
                    <Link href={`/app/dashboards/${d.id}/executive-summary`} target="_blank" style={{ fontSize: 13, color: "#2563EB", fontWeight: 500, textDecoration: "none" }}>
                      Abrir
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Data Sources */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}>
                <FileSpreadsheet size={20} color="#059669" /> Fontes Google Sheets
              </h2>
              <Link href="/admin/google-sheets" style={{ fontSize: 13, padding: "6px 12px", background: "#EFF6FF", color: "#2563EB", borderRadius: 6, textDecoration: "none", fontWeight: 500 }}>
                Gerenciar Fontes
              </Link>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {dataSources.length === 0 ? (
                <p style={{ fontSize: 14, color: "#64748B", textAlign: "center", padding: "20px 0" }}>Nenhuma fonte conectada.</p>
              ) : (
                dataSources.map((s: any) => (
                  <div key={s.id} style={{ padding: 16, borderRadius: 8, border: "1px solid #E2E8F0" }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "#0F172A" }}>{s.name}</p>
                    <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                      <span style={{ fontSize: 12, color: "#64748B" }}>Última imp.: {s.last_import_status || "Nunca"}</span>
                      {s.last_import_at && <span style={{ fontSize: 12, color: "#64748B" }}>Em: {new Date(s.last_import_at).toLocaleString('pt-BR')}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Users */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}>
                <Users size={20} color="#2563EB" /> Usuários com Acesso (Client)
              </h2>
              <button disabled style={{ fontSize: 13, padding: "6px 12px", background: "#F1F5F9", color: "#94A3B8", borderRadius: 6, border: "none", cursor: "not-allowed" }}>
                Vincular Usuário
              </button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {userRoles.length === 0 ? (
                <div style={{ padding: "30px 20px", textAlign: "center", background: "#F8FAFC", borderRadius: 8, border: "1px dashed #CBD5E1" }}>
                  <p style={{ fontSize: 14, color: "#64748B", marginBottom: 12 }}>Nenhum usuário client vinculado a este cliente.</p>
                  <p style={{ fontSize: 12, color: "#94A3B8" }}>A criação e vínculo de usuários clients será habilitada em breve.</p>
                </div>
              ) : (
                userRoles.map((r: any) => (
                  <div key={r.id} style={{ padding: 12, borderRadius: 8, border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "#0F172A" }}>User ID: {r.user_id}</p>
                      <p style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Role: {r.role}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: Checklist */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "sticky", top: 32 }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", marginBottom: 16 }}>Onboarding</h3>
            
            {/* Progress bar */}
            <div style={{ height: 6, background: "#F1F5F9", borderRadius: 99, marginBottom: 24, overflow: "hidden" }}>
              <div style={{ height: "100%", background: checklistProgress === 100 ? "#16A34A" : "#2563EB", width: `${checklistProgress}%`, transition: "width 0.5s" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {checklist.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  {item.done ? (
                    <CheckCircle2 size={18} color="#16A34A" style={{ flexShrink: 0, marginTop: 2 }} />
                  ) : (
                    <Circle size={18} color="#CBD5E1" style={{ flexShrink: 0, marginTop: 2 }} />
                  )}
                  <span style={{ fontSize: 14, color: item.done ? "#334155" : "#94A3B8", fontWeight: item.done ? 500 : 400 }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            
            {checklistProgress === 100 && (
              <div style={{ marginTop: 24, padding: 12, background: "#DCFCE7", borderRadius: 8, color: "#16A34A", fontSize: 13, fontWeight: 500, textAlign: "center" }}>
                Cliente pronto para operação! 🎉
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
