import { AdminService } from "@/services/admin-service";
import { requireAdmin } from "@/lib/auth/guards";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Database, Users, CheckCircle2, Circle, ArrowLeft, Link as LinkIcon } from "lucide-react";
import { ShareLinksManager } from "@/components/admin/ShareLinksManager";
import { ClientLogoUploader } from "@/components/admin/ClientLogoUploader";
import { ClientContactForm } from "@/components/admin/ClientContactForm";
import { CreateDashboardModalButton } from "@/components/admin/CreateDashboardModalButton";
import { ClientSourceLinker } from "@/components/admin/ClientSourceLinker";
import { ClientSourceSyncModalButton } from "@/components/admin/ClientSourceSyncModalButton";

const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL || "dashboard-ads-s4x@studio-4x.iam.gserviceaccount.com";

export default async function ClientHubPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  await requireAdmin();
  
  const hubData = await AdminService.getClientHubDetails(clientId);
  
  if (!hubData) {
    notFound();
  }

  const { client, dashboards, dataSources, userRoles } = hubData;
  const getSourceSyncData = (source: any) => {
    const gSheet = Array.isArray(source.google_sheet_sources) ? source.google_sheet_sources[0] : source.google_sheet_sources;
    return {
      lastImportStatus: gSheet?.last_import_status || null,
      lastImportAt: gSheet?.last_import_at || null,
    };
  };

  // Onboarding Checklist Logic
  const hasClient = !!client;
  const hasDashboard = dashboards.length > 0;
  const hasSource = dataSources.length > 0;
  const hasImport = dataSources.some((s: any) => {
    const sync = getSourceSyncData(s);
    return sync.lastImportStatus === "success" || sync.lastImportStatus === "success_with_warnings";
  });
  const hasUser = userRoles.length > 0;

  const checklist = [
    { label: "Cliente criado", done: hasClient },
    { label: "Dashboard criado", done: hasDashboard },
    { label: "Fonte de dados cadastrada", done: hasSource },
    { label: "Primeira importação realizada com sucesso", done: hasImport },
    { label: "Usuário client vinculado", done: hasUser },
  ];

  const checklistProgress = (checklist.filter(c => c.done).length / checklist.length) * 100;

  return (
    <div className="admin-page" style={{ padding: "clamp(14px, 3vw, 32px)", maxWidth: 1200 }}>
      <div className="admin-page-header" style={{ marginBottom: 32, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
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

      <div className="admin-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Dashboards */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}>
                <LayoutDashboard size={20} color="#7C3AED" /> Dashboards Vinculados
              </h2>
              <CreateDashboardModalButton clientId={clientId} />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {dashboards.length === 0 ? (
                <p style={{ fontSize: 14, color: "#64748B", textAlign: "center", padding: "20px 0" }}>Nenhum dashboard cadastrado.</p>
              ) : (
                dashboards.map((d: any) => {
                  const dashSources = dataSources.filter((s: any) => s.dashboard_id === d.id);
                  const hasDashSource = dashSources.length > 0;
                  const primaryDashSource = dashSources[0];
                  const hasDashImport = dashSources.some((s: any) => {
                    const sync = getSourceSyncData(s);
                    return sync.lastImportStatus === "success" || sync.lastImportStatus === "success_with_warnings";
                  });
                  
                  return (
                    <div key={d.id} style={{ padding: 16, borderRadius: 8, border: "1px solid #E2E8F0", display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <p style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>{d.title || d.name}</p>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "#F1F5F9", color: "#475569" }}>
                              Tipo: {d.dashboard_type === "google_ads" ? "Google Ads" : d.dashboard_type === "custom" ? "Customizado" : d.dashboard_type || "Google Ads"}
                            </span>
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: d.status === "active" ? "#DCFCE7" : "#F1F5F9", color: d.status === "active" ? "#16A34A" : "#64748B" }}>
                              {d.status === "active" ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                        </div>
                        <Link href={`/app/dashboards/${d.id}/executive-summary`} target="_blank" style={{ fontSize: 13, color: "#2563EB", fontWeight: 500, textDecoration: "none", background: "#EFF6FF", padding: "4px 10px", borderRadius: 6 }}>
                          Abrir
                        </Link>
                      </div>

                      <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 12, marginTop: 4 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 8 }}>Checklist de Operação:</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <CheckCircle2 size={14} color="#16A34A" />
                            <span style={{ fontSize: 12, color: "#334155" }}>Dashboard criado ({d.dashboard_type || "google_ads"})</span>
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {hasDashSource ? <CheckCircle2 size={14} color="#16A34A" /> : <Circle size={14} color="#CBD5E1" />}
                            <span style={{ fontSize: 12, color: hasDashSource ? "#334155" : "#94A3B8" }}>Fonte de dados vinculada</span>
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {hasDashImport ? <CheckCircle2 size={14} color="#16A34A" /> : <Circle size={14} color="#CBD5E1" />}
                            <span style={{ fontSize: 12, color: hasDashImport ? "#334155" : "#94A3B8" }}>Primeira importação realizada</span>
                          </div>
                        </div>
                        {!hasDashSource && (
                          <div style={{ marginTop: 10 }}>
                            <ClientSourceLinker
                              clientId={client.id}
                              dashboards={dashboards}
                              dataSources={dataSources}
                              presetDashboardId={d.id}
                              triggerLabel="Vincular fonte de dados"
                              triggerVariant="secondary"
                              serviceAccountEmail={GOOGLE_SERVICE_ACCOUNT_EMAIL}
                            />
                          </div>
                        )}
                        {hasDashSource && primaryDashSource && (
                          <div style={{ marginTop: 10 }}>
                            <ClientSourceSyncModalButton
                              clientId={client.id}
                              dashboardId={d.id}
                              dashboardName={String(d.title || d.name || "Dashboard")}
                              source={primaryDashSource}
                              triggerVariant="inline"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Data Sources */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}>
                <Database size={20} color="#059669" /> Fontes Conectadas
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ClientSourceLinker
                  clientId={client.id}
                  dashboards={dashboards}
                  dataSources={dataSources}
                  triggerLabel="Criar e vincular"
                  triggerVariant="primary"
                  serviceAccountEmail={GOOGLE_SERVICE_ACCOUNT_EMAIL}
                />
                <Link href="/admin/google-sheets" style={{ fontSize: 13, padding: "6px 12px", background: "#EFF6FF", color: "#2563EB", borderRadius: 6, textDecoration: "none", fontWeight: 500 }}>
                  Gerenciar Fontes
                </Link>
              </div>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {dataSources.length === 0 ? (
                <p style={{ fontSize: 14, color: "#64748B", textAlign: "center", padding: "20px 0" }}>Nenhuma fonte conectada.</p>
              ) : (
                dataSources.map((s: any) => {
                  const sync = getSourceSyncData(s);
                  const hasSyncedAtLeastOnce = !!sync.lastImportAt;
                  const statusLabel = sync.lastImportStatus === "success"
                    ? "Sucesso"
                    : sync.lastImportStatus === "success_with_warnings"
                      ? "Sucesso com avisos"
                      : sync.lastImportStatus === "error"
                        ? "Erro"
                        : "Pendente";
                  return (
                    <div key={s.id} style={{ padding: 16, borderRadius: 8, border: "1px solid #E2E8F0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: "#0F172A" }}>{s.name}</p>
                        <ClientSourceSyncModalButton
                          clientId={client.id}
                          dashboardId={String(s.dashboard_id)}
                          dashboardName={String(dashboards.find((item: any) => item.id === s.dashboard_id)?.title || dashboards.find((item: any) => item.id === s.dashboard_id)?.name || "Dashboard")}
                          source={s}
                          triggerVariant="card"
                        />
                      </div>
                      <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: "#64748B" }}>
                          Última imp.: {hasSyncedAtLeastOnce ? new Date(sync.lastImportAt).toLocaleString("pt-BR") : "Nunca"}
                        </span>
                        {hasSyncedAtLeastOnce && (
                          <span style={{ fontSize: 12, color: "#64748B" }}>
                            Status: {statusLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
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
                  <p style={{ fontSize: 12, color: "#94A3B8" }}>O compartilhamento primário da Fase 6 é via Links Seguros (veja abaixo).</p>
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

          {/* Compartilhamento */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}>
                <LinkIcon size={20} color="#0EA5E9" /> Links de Compartilhamento
              </h2>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {dashboards.length === 0 ? (
                <p style={{ fontSize: 14, color: "#64748B", textAlign: "center", padding: "20px 0" }}>Crie um dashboard primeiro para gerar links.</p>
              ) : (
                dashboards.map((d: any) => (
                  <div key={`share-${d.id}`} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <div className="mb-4">
                      <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                        {d.title}
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded uppercase tracking-wider">Dashboard</span>
                      </h4>
                    </div>
                    <ShareLinksManager dashboardId={d.id} dashboardName={d.title} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: Checklist */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "sticky", top: 32 }}>
          <ClientLogoUploader
            clientId={client.id}
            clientName={client.name}
            logoUrl={client.logo_url}
          />

          <ClientContactForm
            clientId={client.id}
            initialCompanyName={client.company_name}
            initialWebsiteUrl={client.website_url}
            initialEmail={client.email}
            initialEmails={client.emails}
            initialWhatsapp={client.whatsapp}
            initialPhones={client.phones || client.phone}
          />

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
