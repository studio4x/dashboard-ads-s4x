"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, PieChart, X, Loader2, Save, Link2, RefreshCw, Database, Trash2, Pencil, Copy, Send, Download, CheckCircle2, ChevronDown, ChevronUp, BellRing, BellOff } from "lucide-react";
import { META_ADS_OBJECTIVES, getMetaObjectiveLabel, normalizeMetaAdsObjectives } from "@/lib/meta-ads/objectives";
import { useToast } from "@/components/ui/Toast";

import { ShareLinksManager } from "@/components/admin/ShareLinksManager";
import { DateRangeSelector } from "@/components/dashboard/DateRangeSelector";
import { DateRangePreset, formatDateISO, getDateRangePreset } from "@/lib/dashboard/date-utils";
import { resolveAutomationPeriodDays, resolveAutomationPeriodPresetFromDays, normalizeAutomationPeriodPreset, formatAutomationPeriodSummary } from "@/lib/dashboard/automation-period";
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL || "dashboard-ads-s4x@studio-4x.iam.gserviceaccount.com";
type MetaObjective = (typeof META_ADS_OBJECTIVES)[number]["id"];
const META_TEMPLATE_ID = "meta_ads_s4x";
const INTEGRATED_TEMPLATE_ID = "google_meta_ads_s4x";
const DASHBOARD_TYPE_BADGE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  google_meta_ads_s4x: { label: "Google + Meta", bg: "#DC2626", color: "#FFFFFF", border: "#DC2626" },
  google_ads_s4x: { label: "Google Ads", bg: "#16A34A", color: "#FFFFFF", border: "#16A34A" },
  meta_ads_s4x: { label: "Meta Ads", bg: "#4338CA", color: "#FFFFFF", border: "#4338CA" },
  google_ads: { label: "Google Ads (Legado)", bg: "#B45309", color: "#FFFFFF", border: "#B45309" },
  custom: { label: "Custom", bg: "#475569", color: "#FFFFFF", border: "#475569" },
};
const AUTOMATION_COMPLETION_BADGE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  success: { label: "Sucesso", bg: "#F0FDF4", color: "#166534", border: "#BBF7D0" },
  partial: { label: "Parcial", bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" },
  error: { label: "Erro", bg: "#FEF2F2", color: "#991B1B", border: "#FECACA" },
  pending: { label: "Pendente", bg: "#F8FAFC", color: "#475569", border: "#E2E8F0" },
};
const ANALYSIS_GENERATION_BADGE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  generating: { label: "Gerando", bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
  success: { label: "Disponível", bg: "#F0FDF4", color: "#166534", border: "#BBF7D0" },
  error: { label: "Erro", bg: "#FEF2F2", color: "#991B1B", border: "#FECACA" },
  pending: { label: "Ainda não gerada", bg: "#F8FAFC", color: "#475569", border: "#E2E8F0" },
};
const WEEK_DAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

type AutomationForm = {
  enabled: boolean;
  frequency: "daily" | "weekly";
  dayOfWeek: number;
  hour: number;
  minute: number;
  periodPreset: DateRangePreset;
  includeToday: boolean;
  reportMode: "analysis_only" | "metrics_only" | "both" | "pdf_only" | "analysis_pdf" | "both_pdf";
};

function formatAutomationCompletionStatusLabel(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized || normalized === "pending") return "Pendente";
  if (["success", "ok", "completed", "done"].includes(normalized)) return "Sucesso";
  if (["partial", "warning", "success_with_warnings"].includes(normalized)) return "Parcial";
  if (["error", "failed", "failure"].includes(normalized)) return "Erro";
  return normalized;
}

function formatAutomationCompletionKey(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["success", "ok", "completed", "done"].includes(normalized)) return "success";
  if (["partial", "warning", "success_with_warnings"].includes(normalized)) return "partial";
  if (["error", "failed", "failure"].includes(normalized)) return "error";
  return "pending";
}

function formatAutomationCompletionAtLabel(value: string | null | undefined) {
  if (!value) return "Aguardando retorno do n8n";
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function formatAnalysisGenerationKey(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["generating", "success", "error"].includes(normalized) ? normalized : "pending";
}

function formatAnalysisGenerationAtLabel(value: string | null | undefined) {
  if (!value) return "Aguardando geração";
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function isAnalysisPdfAvailable(dashboard: any) {
  if (formatAnalysisGenerationKey(dashboard?.automation_last_analysis_status) !== "success") return false;
  const reportMode = String(dashboard?.automation_report_mode || "").trim().toLowerCase();
  const message = String(dashboard?.automation_last_analysis_message || "").trim().toLowerCase();
  return ["pdf_only", "analysis_pdf", "both_pdf"].includes(reportMode) || message.includes("pdf");
}

export default function AdminDashboardsPage() {
  const { toast } = useToast();
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shareModalDashboard, setShareModalDashboard] = useState<any | null>(null);
  const [editModalDashboard, setEditModalDashboard] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [editObjectivesModalDashboard, setEditObjectivesModalDashboard] = useState<any | null>(null);
  const [editObjectives, setEditObjectives] = useState<MetaObjective[]>([]);
  const [isUpdatingObjectives, setIsUpdatingObjectives] = useState(false);
  const [editTemplateModalDashboard, setEditTemplateModalDashboard] = useState<any | null>(null);
  const [editTemplateType, setEditTemplateType] = useState("");
  const [editTemplateObjectives, setEditTemplateObjectives] = useState<MetaObjective[]>([]);
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false);
  // Integração Google Sheets
  const [integrationModalDashboard, setIntegrationModalDashboard] = useState<any | null>(null);
  const [integrationForm, setIntegrationForm] = useState({
    spreadsheetId: "",
    name: "",
    googleAdsSpreadsheetId: "",
    googleAdsName: "",
    googleAdsSourceId: "",
    metaAdsSpreadsheetId: "",
    metaAdsName: "",
    metaAdsSourceId: "",
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingIntegration, setIsSavingIntegration] = useState(false);
  const [runningDispatchByDashboardId, setRunningDispatchByDashboardId] = useState<Record<string, boolean>>({});
  const [runningAnalysisByDashboardId, setRunningAnalysisByDashboardId] = useState<Record<string, boolean>>({});
  const [automationForms, setAutomationForms] = useState<Record<string, AutomationForm>>({});
  const [savingAutomationByDashboardId, setSavingAutomationByDashboardId] = useState<Record<string, boolean>>({});
  const [expandedAutomationByDashboardId, setExpandedAutomationByDashboardId] = useState<Record<string, boolean>>({});
  const [expandedCardsByDashboardId, setExpandedCardsByDashboardId] = useState<Record<string, boolean>>({});
  const [selectedMetricsSourceByDashboardId, setSelectedMetricsSourceByDashboardId] = useState<Record<string, string>>({});
  const [savingMetricsSourceByDashboardId, setSavingMetricsSourceByDashboardId] = useState<Record<string, boolean>>({});
  
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    client_id: "",
    description: "",
    status: "active",
    dashboard_type: "google_ads_s4x",
    meta_objectives: [] as MetaObjective[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const availableTemplateIds = new Set(templates.map((template: any) => template.id));

  async function fetchData() {
    setIsLoading(true);
    try {
      const [dashRes, clientsRes, sourcesRes, templatesRes] = await Promise.all([
        fetch("/api/admin/dashboards/list-all"),
        fetch("/api/admin/clients"),
        fetch("/api/admin/data-sources"),
        fetch("/api/admin/templates")
      ]);
      const dashboardsData = await dashRes.json();
      const clientsData = await clientsRes.json();
      const sourcesData = await sourcesRes.json();
      const templatesData = await templatesRes.json();
      
      setDashboards(Array.isArray(dashboardsData) ? dashboardsData : []);
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setSources(Array.isArray(sourcesData) ? sourcesData : []);
      setTemplates(Array.isArray(templatesData) ? templatesData.filter((template: any) => template.status !== "deprecated") : []);
      if (Array.isArray(dashboardsData)) {
        const nextSelectedMetricsSources: Record<string, string> = {};
        const nextForms: Record<string, AutomationForm> = {};
        dashboardsData.forEach((d: any) => {
          nextSelectedMetricsSources[d.id] = d.metrics_source_id || "";
          const periodPreset = normalizeAutomationPeriodPreset(d.automation_period_preset || resolveAutomationPeriodPresetFromDays(d.automation_period_days));
          nextForms[d.id] = {
            enabled: Boolean(d.automation_enabled),
            frequency: d.automation_frequency === "daily" ? "daily" : "weekly",
            dayOfWeek: Number.isInteger(d.automation_day_of_week) ? d.automation_day_of_week : 1,
            hour: Number.isInteger(d.automation_hour) ? d.automation_hour : 8,
            minute: Number.isInteger(d.automation_minute) ? d.automation_minute : 0,
            periodPreset,
            includeToday: Boolean(d.automation_include_today),
            reportMode: ["analysis_only", "metrics_only", "both", "pdf_only", "analysis_pdf", "both_pdf"].includes(String(d.automation_report_mode))
              ? d.automation_report_mode
              : "both",
          };
        });
        setSelectedMetricsSourceByDashboardId(nextSelectedMetricsSources);
        setAutomationForms(nextForms);
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const generateSlug = (name: string) => {
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData({ ...formData, name, slug: generateSlug(name) });
  };

  const toggleCreateObjective = (objective: MetaObjective) => {
    setFormData((prev) => {
      const current = prev.meta_objectives || [];
      const has = current.includes(objective);
      const next = has ? current.filter((item) => item !== objective) : [...current, objective];
      return { ...prev, meta_objectives: next };
    });
  };

  const toggleEditObjective = (objective: MetaObjective) => {
    setEditObjectives((prev) => {
      const has = prev.includes(objective);
      return has ? prev.filter((item) => item !== objective) : [...prev, objective];
    });
  };

  const getSourceRole = (source: any): "google_ads" | "meta_ads" | null => {
    const gsheet = Array.isArray(source?.google_sheet_sources)
      ? source.google_sheet_sources[0]
      : source?.google_sheet_sources;
    return (gsheet?.source_role as "google_ads" | "meta_ads" | null) || null;
  };

  const getDashboardSheetSources = (dashboardId: string) => {
    return sources.filter((s: any) => s.dashboard_id === dashboardId && s.type === "google_sheets");
  };

  const getDashboardConnectedSources = (dashboardId: string) => {
    return sources.filter((s: any) => s.dashboard_id === dashboardId && s.status === "active");
  };

  const getSourceTypeLabel = (source: any) => {
    if (source?.type === "meta_ads") return "Meta Marketing API";
    if (source?.type === "google_sheets") return "Google Sheets";
    if (source?.type === "google_ads") return "Google Ads API";
    if (source?.type === "ga4") return "GA4";
    if (source?.type === "search_console") return "Search Console";
    return "Fonte de dados";
  };

  const handleSaveMetricsSource = async (dashboard: any) => {
    const sourceId = selectedMetricsSourceByDashboardId[dashboard.id] || "";
    if (!sourceId) {
      toast("Selecione uma fonte de métricas.");
      return;
    }

    setSavingMetricsSourceByDashboardId((prev) => ({ ...prev, [dashboard.id]: true }));
    try {
      const response = await fetch(`/api/admin/dashboards/${dashboard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metrics_source_id: sourceId }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result?.error || "Não foi possível trocar a fonte de métricas.");
      }
      setDashboards((prev) => prev.map((item) => item.id === dashboard.id ? { ...item, metrics_source_id: sourceId } : item));
      toast("Fonte de métricas atualizada.");
    } catch (error: any) {
      toast(error instanceof Error ? error.message : "Não foi possível trocar a fonte de métricas.");
    } finally {
      setSavingMetricsSourceByDashboardId((prev) => ({ ...prev, [dashboard.id]: false }));
    }
  };

  const inferSourceRole = (source: any): "google_ads" | "meta_ads" | null => {
    const explicitRole = getSourceRole(source);
    if (explicitRole) return explicitRole;
    const dashboardType = source?.dashboards?.dashboard_type;
    if (dashboardType === "google_ads_s4x" || dashboardType === "google_ads") return "google_ads";
    if (dashboardType === "meta_ads_s4x" || dashboardType === "meta_ads") return "meta_ads";
    return null;
  };

  const handleOpenIntegration = (dash: any) => {
    setIntegrationModalDashboard(dash);
    const dashSources = getDashboardSheetSources(dash.id);
    if (dash.dashboard_type === "google_meta_ads_s4x") {
      const googleSource = dashSources.find((s: any) => getSourceRole(s) === "google_ads");
      const metaSource = dashSources.find((s: any) => getSourceRole(s) === "meta_ads");
      setIntegrationForm({
        spreadsheetId: "",
        name: "",
        googleAdsSpreadsheetId: googleSource?.google_sheet_sources?.spreadsheet_id || "",
        googleAdsName: googleSource?.name || `Planilha Google Ads - ${dash.name}`,
        googleAdsSourceId: "",
        metaAdsSpreadsheetId: metaSource?.google_sheet_sources?.spreadsheet_id || "",
        metaAdsName: metaSource?.name || `Planilha Meta Ads - ${dash.name}`,
        metaAdsSourceId: "",
      });
      return;
    }
    const source = dashSources[0];
    if (source) {
      setIntegrationForm({
        spreadsheetId: source.google_sheet_sources?.spreadsheet_id || "",
        name: source.name || `Planilha - ${dash.name}`,
        googleAdsSpreadsheetId: "",
        googleAdsName: "",
        googleAdsSourceId: "",
        metaAdsSpreadsheetId: "",
        metaAdsName: "",
        metaAdsSourceId: "",
      });
    } else {
      setIntegrationForm({
        spreadsheetId: "",
        name: `Planilha - ${dash.name}`,
        googleAdsSpreadsheetId: "",
        googleAdsName: "",
        googleAdsSourceId: "",
        metaAdsSpreadsheetId: "",
        metaAdsName: "",
        metaAdsSourceId: "",
      });
    }
  };

  const handleCopyServiceEmail = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_SERVICE_ACCOUNT_EMAIL);
      toast("E-mail da service account copiado!");
    } catch {
      toast("Não foi possível copiar automaticamente.");
    }
  };

  const handleOpenEditName = (dash: any) => {
    setEditModalDashboard(dash);
    setEditName(dash.name || "");
  };

  const handleOpenEditObjectives = (dash: any) => {
    setEditObjectivesModalDashboard(dash);
    setEditObjectives(normalizeMetaAdsObjectives(dash.meta_objectives) as MetaObjective[]);
  };

  const handleOpenEditTemplate = (dash: any) => {
    setEditTemplateModalDashboard(dash);
    setEditTemplateType(dash.dashboard_type || "google_ads_s4x");
    setEditTemplateObjectives(normalizeMetaAdsObjectives(dash.meta_objectives) as MetaObjective[]);
  };

  const toggleEditTemplateObjective = (objective: MetaObjective) => {
    setEditTemplateObjectives((prev) => {
      const has = prev.includes(objective);
      return has ? prev.filter((item) => item !== objective) : [...prev, objective];
    });
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalDashboard) return;
    if (!editName.trim() || editName.trim().length < 3) {
      toast("Informe um nome válido com pelo menos 3 caracteres.");
      return;
    }

    setIsUpdatingName(true);
    try {
      const payload = {
        name: editName.trim(),
        slug: generateSlug(editName.trim())
      };
      const response = await fetch(`/api/admin/dashboards/${editModalDashboard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast("Erro ao atualizar nome: " + (result.error || "erro desconhecido"));
        return;
      }

      setEditModalDashboard(null);
      setEditName("");
      await fetchData();
    } catch {
      toast("Erro ao conectar com o servidor.");
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleSaveIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!integrationModalDashboard) return;
    
    setIsSavingIntegration(true);
    const dashSources = getDashboardSheetSources(integrationModalDashboard.id);
    
    try {
      const syncSavedSource = async (source: any, spreadsheetId: string) => {
        const syncResponse = await fetch("/api/admin/google-sheets/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: integrationModalDashboard.client_id,
            dashboardId: integrationModalDashboard.id,
            spreadsheetId,
            dataSourceId: source.id,
          }),
        });
        const syncResult = await syncResponse.json();
        if (!syncResponse.ok || !syncResult.success) {
          throw new Error(
            syncResult?.error
              || (syncResult?.errors?.[0]?.message)
              || "Erro ao validar/sincronizar a planilha."
          );
        }
      };

      const saveOrUpdateSource = async (params: {
        existingSource?: any;
        name: string;
        spreadsheetId: string;
        sourceRole?: "google_ads" | "meta_ads";
      }) => {
        const url = params.existingSource ? `/api/admin/google-sheets/${params.existingSource.id}` : "/api/admin/google-sheets";
        const method = params.existingSource ? "PATCH" : "POST";
        const body = {
          clientId: integrationModalDashboard.client_id,
          dashboardId: integrationModalDashboard.id,
          name: params.name,
          spreadsheetId: params.spreadsheetId,
          sourceRole: params.sourceRole,
        };
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result?.error || "Erro ao salvar integração.");
        }
        return params.existingSource || result.source;
      };

      if (integrationModalDashboard.dashboard_type === "google_meta_ads_s4x") {
        if (
          !integrationForm.googleAdsSpreadsheetId.trim()
          || !integrationForm.googleAdsName.trim()
          || !integrationForm.metaAdsSpreadsheetId.trim()
          || !integrationForm.metaAdsName.trim()
        ) {
          toast("Preencha as duas planilhas (Google Ads e Meta Ads) para o dashboard integrado.");
          return;
        }

        const existingGoogleSource = dashSources.find((s: any) => getSourceRole(s) === "google_ads");
        const existingMetaSource = dashSources.find((s: any) => getSourceRole(s) === "meta_ads");

        const savedGoogleSource = await saveOrUpdateSource({
          existingSource: existingGoogleSource,
          name: integrationForm.googleAdsName.trim(),
          spreadsheetId: integrationForm.googleAdsSpreadsheetId.trim(),
          sourceRole: "google_ads",
        });
        const savedMetaSource = await saveOrUpdateSource({
          existingSource: existingMetaSource,
          name: integrationForm.metaAdsName.trim(),
          spreadsheetId: integrationForm.metaAdsSpreadsheetId.trim(),
          sourceRole: "meta_ads",
        });

        await syncSavedSource(savedGoogleSource, integrationForm.googleAdsSpreadsheetId.trim());
        await syncSavedSource(savedMetaSource, integrationForm.metaAdsSpreadsheetId.trim());
      } else {
        if (!integrationForm.name.trim() || !integrationForm.spreadsheetId.trim()) {
          toast("Preencha nome e ID da planilha.");
          return;
        }
        const existingSource = dashSources[0];
        const savedSource = await saveOrUpdateSource({
          existingSource,
          name: integrationForm.name.trim(),
          spreadsheetId: integrationForm.spreadsheetId.trim(),
        });
        await syncSavedSource(savedSource, integrationForm.spreadsheetId.trim());
      }

      toast("Integração salva e sincronizada com sucesso!");
      setIntegrationModalDashboard(null);
      await fetchData();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Erro de conexão com o servidor ao salvar integração.");
    } finally {
      setIsSavingIntegration(false);
    }
  };

  const handleSaveObjectives = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editObjectivesModalDashboard) return;

    setIsUpdatingObjectives(true);
    try {
      const response = await fetch(`/api/admin/dashboards/${editObjectivesModalDashboard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meta_objectives: editObjectives,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast("Erro ao atualizar objetivos: " + (result.error || "erro desconhecido"));
        return;
      }

      setEditObjectivesModalDashboard(null);
      setEditObjectives([]);
      await fetchData();
    } catch {
      toast("Erro ao conectar com o servidor.");
    } finally {
      setIsUpdatingObjectives(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTemplateModalDashboard) return;

    const selectedTemplate = templates.find((template) => template.id === editTemplateType);
    if (!selectedTemplate) {
      toast("Selecione um template válido.");
      return;
    }

    const requiresObjectives = selectedTemplate.platform === "meta_ads" || selectedTemplate.platform === "mixed";
    const normalizedObjectives = requiresObjectives ? normalizeMetaAdsObjectives(editTemplateObjectives) : [];
    if (requiresObjectives && normalizedObjectives.length === 0) {
      toast("Selecione ao menos um objetivo para templates Meta ou integrados.");
      return;
    }

    setIsUpdatingTemplate(true);
    try {
      const response = await fetch(`/api/admin/dashboards/${editTemplateModalDashboard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dashboard_type: editTemplateType,
          meta_objectives: normalizedObjectives,
          reprocess_template: true,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast("Erro ao atualizar template: " + (result.error || "erro desconhecido"));
        return;
      }

      if (result?.reprocess?.failed > 0) {
        toast(`Template atualizado, mas ${result.reprocess.failed} fonte(s) falharam no reprocessamento.`);
      } else {
        toast("Template atualizado e dashboard reprocessado com sucesso.");
      }

      setEditTemplateModalDashboard(null);
      setEditTemplateType("");
      setEditTemplateObjectives([]);
      await fetchData();
    } catch {
      toast("Erro ao conectar com o servidor.");
    } finally {
      setIsUpdatingTemplate(false);
    }
  };

  const getValidationSummary = (dashboard: any, source: any) => {
    const status = source?.google_sheet_sources?.meta_validation_status
      || dashboard?.meta_validation_status
      || "not_configured";

    const notes = (source?.google_sheet_sources?.meta_validation_notes
      || dashboard?.meta_validation_notes
      || {}) as any;

    return {
      status,
      notes,
    };
  };

  const handleSyncIntegration = async () => {
    if (!integrationModalDashboard) return;
    const dashSources = getDashboardSheetSources(integrationModalDashboard.id);
    if (dashSources.length === 0) {
      toast("Por favor, salve a integração com o ID da planilha antes de sincronizar!");
      return;
    }
    
    setIsSyncing(true);
    try {
      for (const source of dashSources) {
        const response = await fetch("/api/admin/google-sheets/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: source.client_id,
            dashboardId: source.dashboard_id,
            spreadsheetId: source.google_sheet_sources?.spreadsheet_id,
            dataSourceId: source.id
          })
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          const errorMsg = result.error || (result.errors && result.errors.length > 0 ? result.errors[0].message : "Erro desconhecido");
          throw new Error(errorMsg);
        }
      }
      toast("Sincronização concluída com sucesso! Todos os dados foram atualizados.");
      fetchData();
    } catch (error) {
      toast(error instanceof Error ? `Erro na sincronização: ${error.message}` : "Erro ao conectar com o servidor para sincronização.");
    } finally {
      setIsSyncing(false);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const result = await res.json();
      if (result.success) {
        setIsModalOpen(false);
        setFormData({ name: "", slug: "", client_id: "", description: "", status: "active", dashboard_type: "google_ads_s4x", meta_objectives: [] });
        fetchData();
      } else {
        toast("Erro: " + result.error);
      }
    } catch (error) {
      toast("Erro ao conectar com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDuplicate(dash: any) {
    const newName = prompt(`Duplicar "${dash.name}"\nNovo nome:`, `${dash.name} (Cópia)`);
    if (!newName) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/dashboards/${dash.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: dash.client_id,
          name: newName,
          slug: generateSlug(newName)
        })
      });
      
      const result = await res.json();
      if (result.success) {
        fetchData();
        toast("Dashboard duplicado com sucesso!");
      } else {
        toast("Erro: " + result.error);
        setIsLoading(false);
      }
    } catch (error) {
      toast("Erro ao duplicar dashboard");
      setIsLoading(false);
    }
  }

  async function handleDeleteDashboard(id: string, name: string) {
    if (!confirm(`Deseja realmente EXCLUIR o dashboard "${name}"?\nEsta ação é irreversível e removerá todos os dados sincronizados, conexões com planilhas e links de compartilhamento!`)) {
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/dashboards/${id}`, {
        method: "DELETE"
      });
      const result = await res.json();
      if (result.success) {
        toast("Dashboard excluído com sucesso!");
        fetchData();
      } else {
        toast("Erro ao excluir: " + result.error);
        setIsLoading(false);
      }
    } catch (error) {
      toast("Erro ao conectar com o servidor.");
      setIsLoading(false);
    }
  }

  async function handleDispatchAutomation(dashboard: any) {
    const form = automationForms[dashboard.id];
    const periodPreset = form?.periodPreset || "last_7_days";
    const includeToday = Boolean(form?.includeToday);
    const period = getDateRangePreset(periodPreset, undefined, includeToday);
    const confirmRun = confirm(
      `Disparar automação para "${dashboard.name}" agora?\n\nPeríodo: ${formatDateISO(period.from)} a ${formatDateISO(period.to)}.\nIsso enviará os dados para o webhook do n8n configurado no ambiente.`
    );
    if (!confirmRun) return;

    setRunningDispatchByDashboardId((prev) => ({ ...prev, [dashboard.id]: true }));
    try {
      const response = await fetch("/api/admin/automations/report-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dashboardId: dashboard.id,
          from: formatDateISO(period.from),
          to: formatDateISO(period.to),
          source: "manual",
          reportMode: form?.reportMode || "both",
          automationPeriod: {
            preset: periodPreset,
            includeToday,
          },
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        toast(`Falha no disparo: ${result.error || "erro desconhecido"}`);
        return;
      }

      toast("Automação disparada com sucesso para o n8n.");
    } catch {
      toast("Erro ao conectar com o servidor para disparo da automação.");
    } finally {
      setRunningDispatchByDashboardId((prev) => ({ ...prev, [dashboard.id]: false }));
    }
  }

  async function handleRegenerateAnalysis(dashboard: any) {
    const form = automationForms[dashboard.id];
    const period = getDateRangePreset(form?.periodPreset || "last_7_days", undefined, Boolean(form?.includeToday));
    const confirmRun = confirm(
      `Regenerar a análise e o PDF de "${dashboard.name}" agora?\n\nPeríodo: ${formatDateISO(period.from)} a ${formatDateISO(period.to)}.\nO webhook do n8n não será reenviado.`
    );
    if (!confirmRun) return;

    setRunningAnalysisByDashboardId((prev) => ({ ...prev, [dashboard.id]: true }));
    try {
      const response = await fetch("/api/admin/automations/report-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dashboardId: dashboard.id,
          from: formatDateISO(period.from),
          to: formatDateISO(period.to),
          source: "manual",
          reportMode: "both_pdf",
          forceAnalysis: true,
          skipWebhook: true,
          automationPeriod: {
            preset: form?.periodPreset || "last_7_days",
            includeToday: Boolean(form?.includeToday),
          },
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast(`Falha ao regenerar análise: ${result.error || "erro desconhecido"}`);
        return;
      }
      toast("Análise e PDF regenerados com sucesso.");
      await fetchData();
    } catch {
      toast("Erro ao conectar com o servidor para regenerar a análise.");
    } finally {
      setRunningAnalysisByDashboardId((prev) => ({ ...prev, [dashboard.id]: false }));
      await fetchData();
    }
  }

  function handleAutomationFieldChange(
    dashboardId: string,
    patch: Partial<AutomationForm>
  ) {
    setAutomationForms((prev) => ({
      ...prev,
      [dashboardId]: {
        ...(prev[dashboardId] || {
          enabled: false,
          frequency: "weekly",
          dayOfWeek: 1,
          hour: 8,
          minute: 0,
          periodPreset: "last_7_days" as DateRangePreset,
          includeToday: false,
          reportMode: "both",
        }),
        ...patch,
      },
    }));
  }

  async function handleSaveAutomation(dashboardId: string) {
    const form = automationForms[dashboardId];
    if (!form) return;

    setSavingAutomationByDashboardId((prev) => ({ ...prev, [dashboardId]: true }));
    try {
      const selectedPreset = normalizeAutomationPeriodPreset(form.periodPreset);
      const derivedPeriodDays = resolveAutomationPeriodDays(selectedPreset, form.includeToday);
      const response = await fetch(`/api/admin/dashboards/${dashboardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          automation_enabled: form.enabled,
          automation_frequency: form.frequency,
          automation_day_of_week: form.dayOfWeek,
          automation_hour: form.hour,
          automation_minute: form.minute,
          automation_period_preset: selectedPreset,
          automation_include_today: form.includeToday,
          automation_period_days: derivedPeriodDays,
          automation_report_mode: form.reportMode,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast(`Erro ao salvar programação: ${result.error || "erro desconhecido"}`);
        return;
      }
      await fetchData();
      toast("Programação da automação salva.");
    } catch {
      toast("Erro ao salvar programação da automação.");
    } finally {
      setSavingAutomationByDashboardId((prev) => ({ ...prev, [dashboardId]: false }));
    }
  }

  if (isLoading && dashboards.length === 0) {
    return (
      <div style={{ display: "flex", height: "50vh", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="animate-spin" size={32} color="#2563EB" />
      </div>
    );
  }

  return (
    <div className="admin-page" style={{ padding: "clamp(14px, 3vw, 32px)", maxWidth: 1000 }}>
      <div className="admin-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Dashboards</h1>
          <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>{dashboards.length} dashboards cadastrados</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ name: "", slug: "", client_id: "", description: "", status: "active", dashboard_type: "google_ads_s4x", meta_objectives: [] });
            setIsModalOpen(true);
          }}
          style={{ 
            display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", 
            borderRadius: 8, background: "#2563EB", color: "white", fontSize: 14, 
            fontWeight: 500, border: "none", cursor: "pointer" 
          }}
        >
          <Plus size={15} /> Novo Dashboard
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {dashboards.length === 0 ? (
          <div className="card" style={{ padding: "40px", textAlign: "center", borderStyle: "dashed" }}>
            <PieChart size={40} color="#CBD5E1" style={{ margin: "0 auto 16px" }} />
            <p style={{ color: "#64748B", fontSize: 14 }}>Nenhum dashboard cadastrado ainda.</p>
          </div>
        ) : (
          dashboards.map((d: any) => (
            (() => {
              const isCardExpanded = Boolean(expandedCardsByDashboardId[d.id]);
              const automationEnabled = Boolean(
                automationForms[d.id]?.enabled ?? d.automation_enabled
              );
              const dashboardTypeBadge = DASHBOARD_TYPE_BADGE[d.dashboard_type] || {
                label: d.dashboard_type || "Custom",
                bg: "#F1F5F9",
                color: "#475569",
                border: "#E2E8F0",
              };
              const isOrphanTemplate = Boolean(d.dashboard_type) && !availableTemplateIds.has(d.dashboard_type);
              return (
            <div 
              key={d.id} 
              className="card card-hover" 
              style={{ 
                padding: "20px 24px", 
                display: "flex", 
                flexDirection: "column", 
                gap: 16,
                background: "white",
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)"
              }}
            >
              {/* TOP ROW: Icon + Title & System Badges */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, width: "100%", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 280 }}>
                  <div 
                    style={{ 
                      width: 42, height: 42, borderRadius: 10, 
                      background: d.clients?.primary_color || "#2563EB", 
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 
                    }}
                  >
                    <PieChart size={20} color="white" />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", wordBreak: "break-word" }}>{d.name}</p>
                    <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
                      Cliente: <strong style={{ color: "#334155" }}>{d.clients?.name}</strong>
                    </p>
                  </div>
                </div>
                
                {/* System Badges (Status & Type) */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                  <span
                    title={automationEnabled ? "Programação da automação ativada" : "Programação da automação desativada"}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      border: automationEnabled ? "1px solid #BBF7D0" : "1px solid #E2E8F0",
                      background: automationEnabled ? "#F0FDF4" : "#F8FAFC",
                      color: automationEnabled ? "#15803D" : "#64748B",
                    }}
                  >
                    {automationEnabled ? <BellRing size={14} /> : <BellOff size={14} />}
                  </span>
                  <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, background: d.status === "active" ? "#DCFCE7" : "#FEF3C7", color: d.status === "active" ? "#16A34A" : "#D97706", fontWeight: 600 }}>
                    {d.status === "active" ? "Ativo" : "Inativo"}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: dashboardTypeBadge.color,
                      background: dashboardTypeBadge.bg,
                      padding: "4px 10px",
                      borderRadius: 99,
                      fontWeight: 600,
                      border: `1px solid ${dashboardTypeBadge.border}`,
                    }}
                  >
                    {dashboardTypeBadge.label}
                  </span>
                  <button
                    onClick={() =>
                      setExpandedCardsByDashboardId((prev) => ({ ...prev, [d.id]: !prev[d.id] }))
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid #E2E8F0",
                      background: "#F8FAFC",
                      color: "#475569",
                      borderRadius: 999,
                      width: 36,
                      height: 36,
                      cursor: "pointer",
                    }}
                    title={isCardExpanded ? "Recolher card" : "Expandir card"}
                    aria-label={isCardExpanded ? "Recolher card" : "Expandir card"}
                  >
                    {isCardExpanded ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                  </button>
                </div>
              </div>

              {isOrphanTemplate && (
                <div
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #FDE68A",
                    background: "#FFFBEB",
                    color: "#92400E",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  Este dashboard está órfão de template. O template vinculado `{d.dashboard_type}` não existe mais. O dashboard continua usando a configuração salva, mas precisa ser vinculado a um template ativo quando houver nova revisão.
                </div>
              )}

              {isCardExpanded && (
              <>
              {(d.dashboard_type === META_TEMPLATE_ID || d.dashboard_type === INTEGRATED_TEMPLATE_ID) && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>Objetivos:</span>
                  {normalizeMetaAdsObjectives(d.meta_objectives).length > 0 ? (
                    normalizeMetaAdsObjectives(d.meta_objectives).map((objective) => (
                      <span
                        key={objective}
                        style={{
                          fontSize: 11,
                          color: "#1D4ED8",
                          background: "#EFF6FF",
                          padding: "4px 8px",
                          borderRadius: 999,
                          border: "1px solid #DBEAFE",
                          fontWeight: 600,
                        }}
                      >
                        {getMetaObjectiveLabel(objective)}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: 11, color: "#92400E", background: "#FFFBEB", padding: "4px 8px", borderRadius: 999, border: "1px solid #FDE68A", fontWeight: 600 }}>
                      Nenhum objetivo selecionado
                    </span>
                  )}
                </div>
              )}

              {/* MIDDLE ROW: Connected sources and selected metrics source */}
              <div style={{ width: "100%" }}>
                {(() => {
                  const connectedSources = getDashboardConnectedSources(d.id);
                  const defaultSourceId = String(d.metrics_source_id || connectedSources[0]?.id || "");
                  const selectedSourceId = selectedMetricsSourceByDashboardId[d.id] || defaultSourceId;
                  const currentSource = connectedSources.find((source: any) => source.id === d.metrics_source_id) || connectedSources[0];
                  if (connectedSources.length > 0) {
                    return (
                      <div 
                        style={{ 
                          width: "100%",
                          fontSize: 13, 
                          color: "#15803d",
                          background: "#f0fdf4", 
                          padding: "10px 14px", 
                          borderRadius: 8, 
                          border: "1px solid #dcfce7",
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "space-between",
                          gap: 12
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }}></span>
                          <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                            Fontes conectadas: <strong>{connectedSources.length}</strong>
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: "#166534", fontWeight: 600, flexShrink: 0 }}>
                          Atual: {currentSource?.name || "Nenhuma"}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div 
                      style={{ 
                        width: "100%",
                        fontSize: 13, 
                        color: "#b45309", 
                        background: "#fffbeb", 
                        padding: "10px 14px", 
                        borderRadius: 8, 
                        border: "1px solid #fef3c7",
                        display: "flex", 
                        alignItems: "center", 
                        gap: 8
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }}></span>
                      <span>Sem fonte conectada. Configure uma fonte para alimentar este dashboard.</span>
                    </div>
                  );
                })()}
              </div>

              {(() => {
                const connectedSources = getDashboardConnectedSources(d.id);
                if (connectedSources.length === 0) return null;
                const defaultSourceId = String(d.metrics_source_id || connectedSources[0]?.id || "");
                const selectedSourceId = selectedMetricsSourceByDashboardId[d.id] || defaultSourceId;
                const selectedSource = connectedSources.find((source: any) => source.id === selectedSourceId) || connectedSources[0];
                const selectedSheetId = selectedSource?.type === "google_sheets"
                  ? selectedSource?.google_sheet_sources?.spreadsheet_id
                  : null;

                return (
                  <div style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #BFDBFE", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <Database size={15} color="#2563EB" />
                      <span style={{ fontSize: 12, color: "#1E3A8A", fontWeight: 700 }}>Fonte das métricas</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <select
                        value={selectedSourceId}
                        onChange={(event) => setSelectedMetricsSourceByDashboardId((prev) => ({ ...prev, [d.id]: event.target.value }))}
                        aria-label={`Fonte das métricas do dashboard ${d.name}`}
                        style={{ minWidth: 240, maxWidth: 360, padding: "7px 10px", borderRadius: 6, border: "1px solid #BFDBFE", background: "#FFFFFF", color: "#1E3A8A", fontSize: 12 }}
                      >
                        {connectedSources.map((source: any) => (
                          <option key={source.id} value={source.id}>
                            {source.name} · {getSourceTypeLabel(source)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleSaveMetricsSource(d)}
                        disabled={Boolean(savingMetricsSourceByDashboardId[d.id]) || selectedSourceId === String(d.metrics_source_id || defaultSourceId)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: 6, border: "1px solid #93C5FD", background: "#DBEAFE", color: "#1D4ED8", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: savingMetricsSourceByDashboardId[d.id] ? 0.7 : 1 }}
                      >
                        {savingMetricsSourceByDashboardId[d.id] ? <Loader2 className="animate-spin" size={13} /> : <Save size={13} />}
                        Usar fonte
                      </button>
                      {selectedSheetId ? (
                        <a
                          href={`https://docs.google.com/spreadsheets/d/${selectedSheetId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 11, color: "#1D4ED8", fontWeight: 600, textDecoration: "underline" }}
                        >
                          Ver Sheets ↗
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })()}

              {(d.dashboard_type === META_TEMPLATE_ID || d.dashboard_type === INTEGRATED_TEMPLATE_ID) && (() => {
                const source = sources.find((s: any) => s.dashboard_id === d.id);
                const validation = getValidationSummary(d, source);
                const isMissing = validation.status === "missing_metrics";
                const isOk = validation.status === "ok";
                const notes = validation.notes || {};
                const missingByObjective = notes.missingLabelsByObjective || notes.missingByObjective || {};
                const hasMissingDetails = Object.keys(missingByObjective).length > 0;

                return (
                  <div
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: isMissing ? "1px solid #FDE68A" : isOk ? "1px solid #BBF7D0" : "1px solid #E2E8F0",
                      background: isMissing ? "#FFFBEB" : isOk ? "#F0FDF4" : "#F8FAFC",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <p style={{ fontSize: 12, fontWeight: 700, color: isMissing ? "#92400E" : isOk ? "#166534" : "#475569" }}>
                      {isMissing
                        ? "Métricas faltantes para os objetivos selecionados"
                        : isOk
                          ? "Métricas validadas para os objetivos selecionados"
                          : "Validação de objetivos não configurada"}
                    </p>
                    <p style={{ fontSize: 12, color: "#475569" }}>
                      {notes.message || "Objetivos de campanha não configurados para este dashboard."}
                    </p>
                    {hasMissingDetails && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {Object.entries(missingByObjective).map(([objective, fields]) => (
                          <p key={objective} style={{ fontSize: 11, color: "#78350F" }}>
                            <strong>{getMetaObjectiveLabel(objective)}:</strong> {(fields as string[]).join(", ")}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {(() => {
                const form = automationForms[d.id] || {
                  enabled: false,
                  frequency: "weekly" as const,
                  dayOfWeek: 1,
                  hour: 8,
                  minute: 0,
                  periodPreset: "last_7_days" as DateRangePreset,
                  includeToday: false,
                  reportMode: "both",
                };
                const isCollapsed = form.enabled && !expandedAutomationByDashboardId[d.id];

                return (
                  <div
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: 8,
                      border: "1px solid #DBEAFE",
                      background: "#F8FBFF",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#1E3A8A" }}>
                        Programação da automação (n8n)
                      </p>
                      <label style={{ fontSize: 12, color: "#334155", display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={form.enabled}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            handleAutomationFieldChange(d.id, { enabled });
                            setExpandedAutomationByDashboardId((prev) => ({
                              ...prev,
                              [d.id]: !enabled,
                            }));
                          }}
                        />
                        Ativar programação
                      </label>
                    </div>

                    {isCollapsed && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          border: "1px solid #BBF7D0",
                          background: "#F0FDF4",
                          borderRadius: 8,
                          padding: "10px 12px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <CheckCircle2 size={16} color="#15803D" />
                          <span style={{ fontSize: 12, color: "#166534", fontWeight: 700 }}>
                            Programação ativada.
                          </span>
                        </div>
                        <button
                          onClick={() => setExpandedAutomationByDashboardId((prev) => ({ ...prev, [d.id]: true }))}
                          style={{
                            border: "1px solid #86EFAC",
                            background: "#DCFCE7",
                            color: "#166534",
                            borderRadius: 8,
                            padding: "6px 10px",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Editar programação
                        </button>
                      </div>
                    )}

                    {!isCollapsed && (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                      <label style={{ fontSize: 12, color: "#334155", display: "flex", flexDirection: "column", gap: 4 }}>
                        Frequência
                        <select
                          value={form.frequency}
                          onChange={(e) => handleAutomationFieldChange(d.id, { frequency: e.target.value as "daily" | "weekly" })}
                          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, background: "#fff" }}
                        >
                          <option value="weekly">Semanal</option>
                          <option value="daily">Diária</option>
                        </select>
                      </label>

                      {form.frequency === "weekly" && (
                        <label style={{ fontSize: 12, color: "#334155", display: "flex", flexDirection: "column", gap: 4 }}>
                          Dia da semana
                          <select
                            value={form.dayOfWeek}
                            onChange={(e) => handleAutomationFieldChange(d.id, { dayOfWeek: Number(e.target.value) })}
                            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, background: "#fff" }}
                          >
                            {WEEK_DAYS.map((day) => (
                              <option key={day.value} value={day.value}>{day.label}</option>
                            ))}
                          </select>
                        </label>
                      )}

                      <label style={{ fontSize: 12, color: "#334155", display: "flex", flexDirection: "column", gap: 4 }}>
                        Hora (0-23)
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={form.hour}
                          onChange={(e) => handleAutomationFieldChange(d.id, { hour: Number(e.target.value) })}
                          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                        />
                      </label>

                      <label style={{ fontSize: 12, color: "#334155", display: "flex", flexDirection: "column", gap: 4 }}>
                        Minuto (múltiplo de 5)
                        <input
                          type="number"
                          min={0}
                          max={55}
                          step={5}
                          value={form.minute}
                          onChange={(e) => handleAutomationFieldChange(d.id, { minute: Number(e.target.value) })}
                          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                        />
                      </label>

                      <div style={{ fontSize: 12, color: "#334155", display: "flex", flexDirection: "column", gap: 4 }}>
                        Janela (dias)
                        <DateRangeSelector
                          currentPreset={form.periodPreset as DateRangePreset}
                          includeToday={form.includeToday}
                          onPresetChange={(preset, _customDates, includeTodayOverride) =>
                            handleAutomationFieldChange(d.id, {
                              periodPreset: preset,
                              includeToday: includeTodayOverride ?? form.includeToday,
                            })
                          }
                          variant="default"
                          menuAlign="left"
                          showCustomRange={false}
                          className="w-full"
                        />
                        <span style={{ fontSize: 11, color: "#64748B" }}>
                          {formatAutomationPeriodSummary(form.periodPreset as Exclude<DateRangePreset, "custom">, form.includeToday)}
                        </span>
                      </div>

                      <label style={{ fontSize: 12, color: "#334155", display: "flex", flexDirection: "column", gap: 4 }}>
                        Conteúdo do payload
                        <select
                          value={form.reportMode}
                          onChange={(e) => handleAutomationFieldChange(d.id, { reportMode: e.target.value as "analysis_only" | "metrics_only" | "both" | "pdf_only" | "analysis_pdf" | "both_pdf" })}
                          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, background: "#fff" }}
                        >
                          <option value="both">Métricas + Análise</option>
                          <option value="analysis_only">Somente Análise</option>
                          <option value="metrics_only">Somente Métricas</option>
                          <option value="pdf_only">Somente PDF</option>
                          <option value="analysis_pdf">Análise + PDF</option>
                          <option value="both_pdf">Análise + Métricas + PDF</option>
                        </select>
                      </label>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ fontSize: 12, color: "#475569" }}>
                          Contatos padrão do cliente serão usados no payload.
                        </span>
                        <button
                          onClick={() => handleSaveAutomation(d.id)}
                          disabled={Boolean(savingAutomationByDashboardId[d.id])}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "1px solid #BFDBFE",
                            background: "#EFF6FF",
                            color: "#1D4ED8",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            opacity: savingAutomationByDashboardId[d.id] ? 0.7 : 1,
                          }}
                        >
                          {savingAutomationByDashboardId[d.id] ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                          Salvar Programação
                        </button>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          flexWrap: "wrap",
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: "1px solid #E2E8F0",
                          background: "#F8FAFC",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: "#334155", fontWeight: 700 }}>Última execução final</span>
                          {(() => {
                            const completionKey = formatAutomationCompletionKey(d.automation_last_completion_status);
                            const completionCfg = AUTOMATION_COMPLETION_BADGE[completionKey] || AUTOMATION_COMPLETION_BADGE.pending;
                            return (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  padding: "4px 8px",
                                  borderRadius: 999,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: completionCfg.color,
                                  background: completionCfg.bg,
                                  border: `1px solid ${completionCfg.border}`,
                                }}
                              >
                                {formatAutomationCompletionStatusLabel(d.automation_last_completion_status)}
                              </span>
                            );
                          })()}
                          <span style={{ fontSize: 12, color: "#475569" }}>
                            {formatAutomationCompletionAtLabel(d.automation_last_completed_at)}
                          </span>
                        </div>
                        {d.automation_last_completion_message ? (
                          <span style={{ fontSize: 12, color: "#64748B" }}>{d.automation_last_completion_message}</span>
                        ) : null}
                      </div>
                    </div>
                      </>
                    )}
                  </div>
                );
              })()}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #E2E8F0",
                  background: "#F8FAFC",
                  marginTop: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "#334155", fontWeight: 700 }}>Status da análise</span>
                  {(() => {
                    const analysisKey = formatAnalysisGenerationKey(d.automation_last_analysis_status);
                    const analysisCfg = ANALYSIS_GENERATION_BADGE[analysisKey] || ANALYSIS_GENERATION_BADGE.pending;
                    return (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 8px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          color: analysisCfg.color,
                          background: analysisCfg.bg,
                          border: `1px solid ${analysisCfg.border}`,
                        }}
                      >
                        {analysisKey === "generating" ? <Loader2 className="animate-spin" size={12} /> : null}
                        {analysisCfg.label}
                      </span>
                    );
                  })()}
                  <span style={{ fontSize: 12, color: "#475569" }}>
                    {formatAnalysisGenerationAtLabel(d.automation_last_analysis_generated_at)}
                  </span>
                </div>
                {d.automation_last_analysis_message ? (
                  <span style={{ fontSize: 12, color: "#64748B" }}>{d.automation_last_analysis_message}</span>
                ) : null}
              </div>

              {/* METADATA INFO ROW */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "#64748B", borderTop: "1px solid #F1F5F9", paddingTop: 12 }}>
                <div>
                  Páginas: <strong style={{ color: "#334155" }}>{d.pages_count}</strong>
                </div>
                <div style={{ color: "#CBD5E1" }}>|</div>
                <div>
                  Última Sincronização: <strong style={{ color: "#334155" }}>{d.latest_snapshot_date ? new Date(d.latest_snapshot_date).toLocaleDateString('pt-BR') : "Nunca"}</strong>
                </div>
              </div>

              {/* BOTTOM ROW: Actions (Spanning full width!) */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 4, width: "100%", flexWrap: "wrap" }}>
                {/* Secondary/Admin Actions */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button 
                    onClick={() => handleOpenIntegration(d)}
                    style={{ 
                      display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", 
                      borderRadius: 8, background: "#FFF7ED", fontSize: 13, color: "#EA580C", 
                      border: "1px solid #FFEDD5", cursor: "pointer", fontWeight: 600,
                      transition: "all 0.2s"
                    }}
                  >
                    <Link2 size={14} /> Configurar Planilha
                  </button>

                  <button 
                    onClick={() => setShareModalDashboard(d)}
                    style={{ 
                      display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", 
                      borderRadius: 8, background: "#F0FDF4", fontSize: 13, color: "#16A34A", 
                      border: "1px solid #BBF7D0", cursor: "pointer", fontWeight: 600,
                      transition: "all 0.2s"
                    }}
                  >
                    Compartilhar
                  </button>

                  <button
                    onClick={() => handleDispatchAutomation(d)}
                    disabled={Boolean(runningDispatchByDashboardId[d.id])}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                      borderRadius: 8, background: "#EFF6FF", fontSize: 13, color: "#1D4ED8",
                      border: "1px solid #BFDBFE", cursor: "pointer", fontWeight: 600,
                      transition: "all 0.2s", opacity: runningDispatchByDashboardId[d.id] ? 0.7 : 1
                    }}
                    title="Disparar automação para o n8n"
                  >
                    {runningDispatchByDashboardId[d.id] ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                    Disparar Automação
                  </button>

                  <button
                    onClick={() => handleRegenerateAnalysis(d)}
                    disabled={Boolean(runningAnalysisByDashboardId[d.id])}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                      borderRadius: 8, background: "#FFF7ED", fontSize: 13, color: "#C2410C",
                      border: "1px solid #FED7AA", cursor: "pointer", fontWeight: 600,
                      transition: "all 0.2s", opacity: runningAnalysisByDashboardId[d.id] ? 0.7 : 1
                    }}
                    title="Regenerar a analise e o PDF sem reenviar o webhook"
                  >
                    {runningAnalysisByDashboardId[d.id] ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                    Regenerar Analise
                  </button>

                  {isAnalysisPdfAvailable(d) ? (
                    <a
                      href={`/api/admin/dashboards/${d.id}/analysis-pdf`}
                      download
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                        borderRadius: 8, background: "#EEF2FF", fontSize: 13, color: "#4338CA",
                        border: "1px solid #C7D2FE", cursor: "pointer", fontWeight: 600,
                        transition: "all 0.2s", textDecoration: "none",
                      }}
                      title="Baixar o PDF da análise mais recente"
                    >
                      <Download size={14} /> Baixar PDF da análise
                    </a>
                  ) : null}

                  <button 
                    onClick={() => handleDuplicate(d)}
                    style={{ 
                      display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", 
                      borderRadius: 8, background: "#F8FAFC", fontSize: 13, color: "#475569", 
                      border: "1px solid #E2E8F0", cursor: "pointer", fontWeight: 600,
                      transition: "all 0.2s"
                    }}
                  >
                    Duplicar
                  </button>

                  <button
                    onClick={() => handleOpenEditName(d)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                      borderRadius: 8, background: "#EFF6FF", fontSize: 13, color: "#1D4ED8",
                      border: "1px solid #DBEAFE", cursor: "pointer", fontWeight: 600,
                      transition: "all 0.2s"
                    }}
                  >
                    <Pencil size={14} /> Editar nome
                  </button>

                  <button
                    onClick={() => handleOpenEditTemplate(d)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                      borderRadius: 8, background: "#FFF7ED", fontSize: 13, color: "#EA580C",
                      border: "1px solid #FFEDD5", cursor: "pointer", fontWeight: 600,
                      transition: "all 0.2s"
                    }}
                  >
                    <RefreshCw size={14} /> Alterar template
                  </button>

                  {(d.dashboard_type === META_TEMPLATE_ID || d.dashboard_type === INTEGRATED_TEMPLATE_ID) && (
                    <button
                      onClick={() => handleOpenEditObjectives(d)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                        borderRadius: 8, background: "#EEF2FF", fontSize: 13, color: "#4338CA",
                        border: "1px solid #C7D2FE", cursor: "pointer", fontWeight: 600,
                        transition: "all 0.2s"
                      }}
                    >
                      Editar objetivos
                    </button>
                  )}
                </div>

                {/* Primary Actions (View & Delete) */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button 
                    onClick={() => handleDeleteDashboard(d.id, d.name)}
                    style={{ 
                      display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", 
                      borderRadius: 8, background: "#FEF2F2", fontSize: 13, color: "#DC2626", 
                      border: "1px solid #FEE2E2", cursor: "pointer", fontWeight: 600,
                      transition: "all 0.2s"
                    }}
                    title="Excluir Dashboard"
                  >
                    <Trash2 size={14} /> Excluir
                  </button>

                  <Link 
                    href={`/app/dashboards/${d.id}/executive-summary`} 
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ 
                      display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", 
                      borderRadius: 8, background: "#2563EB", fontSize: 13, color: "white", 
                      textDecoration: "none", fontWeight: 600, boxShadow: "0 1px 2px 0 rgba(37, 99, 235, 0.2)",
                      transition: "all 0.2s"
                    }}
                  >
                    Visualizar Dashboard →
                  </Link>
                </div>
              </div>
              </>
              )}
            </div>
            );
            })()
          ))
        )}
      </div>

      {/* Modal Novo Dashboard */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 500, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>Criar Novo Dashboard</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Cliente Proprietário</label>
                <select 
                  required
                  value={formData.client_id}
                  onChange={e => setFormData({ ...formData, client_id: e.target.value })}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, background: "white" }}
                >
                  <option value="">Selecione um cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Nome do Dashboard</label>
                <input 
                  required
                  value={formData.name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="Ex: Performance Mensal"
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14 }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>URL Slug (Identificador único)</label>
                <input 
                  required
                  value={formData.slug}
                  onChange={e => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="ex: performance-mensal"
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, background: "#F8FAFC" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Descrição (Opcional)</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Breve descrição do objetivo deste dashboard"
                  rows={2}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, resize: "none" }}
                />
              </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Modelo de Dashboard</label>
                  <select 
                    required
                    value={formData.dashboard_type}
                    onChange={e => {
                      const selected = templates.find((template) => template.id === e.target.value);
                      setFormData({
                        ...formData,
                        dashboard_type: e.target.value,
                        meta_objectives: selected && (selected.platform === "meta_ads" || selected.platform === "mixed") ? formData.meta_objectives : [],
                      });
                    }}
                    style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, background: "white" }}
                  >
                    <option value="">Selecione um modelo...</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {(() => {
                  const selected = templates.find((template) => template.id === formData.dashboard_type);
                  const showObjectives = Boolean(selected && (selected.platform === "meta_ads" || selected.platform === "mixed"));
                  if (!showObjectives) return null;
                  return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Objetivos da Campanha (Meta Ads)</label>
                    <div className="admin-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {META_ADS_OBJECTIVES.map((objective) => {
                        const active = formData.meta_objectives.includes(objective.id);
                        return (
                          <button
                            key={objective.id}
                            type="button"
                            onClick={() => toggleCreateObjective(objective.id)}
                            style={{
                              textAlign: "left",
                              padding: "8px 10px",
                              borderRadius: 8,
                              border: active ? "1px solid #2563EB" : "1px solid #E2E8F0",
                              background: active ? "#EFF6FF" : "#FFFFFF",
                              color: active ? "#1D4ED8" : "#475569",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {objective.label}
                          </button>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: 11, color: "#64748B" }}>
                      Você pode selecionar múltiplos objetivos. O primeiro selecionado será o objetivo principal.
                    </p>
                  </div>
                  );
                })()}

                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{ flex: 1, padding: "12px", borderRadius: 8, border: "1px solid #E2E8F0", background: "white", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    style={{ 
                      flex: 1, padding: "12px", borderRadius: 8, border: "none", 
                      background: "#2563EB", color: "white", fontSize: 14, 
                      fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 
                    }}
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (
                      <>
                        <Save size={18} /> Criar Dashboard
                      </>
                    )}
                  </button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Nome do Dashboard */}
      {editModalDashboard && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 500, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>Editar Nome do Dashboard</h2>
              <button onClick={() => { setEditModalDashboard(null); setEditName(""); }} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateName} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Nome do Dashboard</label>
                <input
                  required
                  minLength={3}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ex: Performance Mensal"
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14 }}
                />
              </div>

              <div style={{ fontSize: 12, color: "#64748B", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 10 }}>
                Novo slug automático: <strong>{generateSlug(editName || "") || "-"}</strong>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => { setEditModalDashboard(null); setEditName(""); }}
                  style={{ flex: 1, padding: "12px", borderRadius: 8, border: "1px solid #E2E8F0", background: "white", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingName}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 8, border: "none",
                    background: "#2563EB", color: "white", fontSize: 14,
                    fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                  }}
                >
                  {isUpdatingName ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Salvar Alteração</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Objetivos Meta Ads */}
      {editObjectivesModalDashboard && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 540, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>Editar Objetivos da Campanha</h2>
              <button onClick={() => { setEditObjectivesModalDashboard(null); setEditObjectives([]); }} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveObjectives} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ fontSize: 13, color: "#64748B" }}>
                Dashboard: <strong style={{ color: "#334155" }}>{editObjectivesModalDashboard.name}</strong>
              </p>

              <div className="admin-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {META_ADS_OBJECTIVES.map((objective) => {
                  const active = editObjectives.includes(objective.id);
                  return (
                    <button
                      key={objective.id}
                      type="button"
                      onClick={() => toggleEditObjective(objective.id)}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: active ? "1px solid #2563EB" : "1px solid #E2E8F0",
                        background: active ? "#EFF6FF" : "#FFFFFF",
                        color: active ? "#1D4ED8" : "#475569",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {objective.label}
                    </button>
                  );
                })}
              </div>

              <p style={{ fontSize: 11, color: "#64748B" }}>
                O primeiro objetivo selecionado será usado como objetivo principal para o rótulo de conversão.
              </p>
              <p style={{ fontSize: 11, color: "#64748B", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 10px" }}>
                Esta configuração é aplicada somente às métricas e visualizações de Meta Ads (inclusive no dashboard integrado Google + Meta). A aba Google Ads não é afetada.
              </p>

              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => { setEditObjectivesModalDashboard(null); setEditObjectives([]); }}
                  style={{ flex: 1, padding: "12px", borderRadius: 8, border: "1px solid #E2E8F0", background: "white", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingObjectives}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 8, border: "none",
                    background: "#2563EB", color: "white", fontSize: 14,
                    fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                  }}
                >
                  {isUpdatingObjectives ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Salvar Objetivos</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Alterar Template */}
      {editTemplateModalDashboard && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 680, padding: 0, overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F8FAFC" }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>Alterar Template</h2>
                <p style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                  Dashboard: <strong>{editTemplateModalDashboard.name}</strong>
                </p>
              </div>
              <button onClick={() => { setEditTemplateModalDashboard(null); setEditTemplateType(""); setEditTemplateObjectives([]); }} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Template do Dashboard</label>
                <select
                  required
                  value={editTemplateType}
                  onChange={(e) => {
                    setEditTemplateType(e.target.value);
                    const selected = templates.find((template) => template.id === e.target.value);
                    if (selected && (selected.platform === "meta_ads" || selected.platform === "mixed")) {
                      setEditTemplateObjectives((prev) => prev.length > 0 ? prev : normalizeMetaAdsObjectives(editTemplateModalDashboard.meta_objectives) as MetaObjective[]);
                    } else {
                      setEditTemplateObjectives([]);
                    }
                  }}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, background: "white" }}
                >
                  <option value="">Selecione um template...</option>
                  {templates.map((template: any) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: 12 }}>
                <p style={{ fontSize: 12, color: "#1E3A8A", fontWeight: 700 }}>Importante</p>
                <p style={{ fontSize: 11, color: "#1D4ED8", marginTop: 4, lineHeight: 1.5 }}>
                  Ao salvar, o dashboard terá suas páginas e configuração do template reconstruídas e será reprocessado usando as fontes já vinculadas.
                </p>
              </div>

              {(() => {
                const selected = templates.find((template) => template.id === editTemplateType);
                const showObjectives = Boolean(selected && (selected.platform === "meta_ads" || selected.platform === "mixed"));
                if (!showObjectives) return null;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Objetivos da Campanha (Meta Ads)</label>
                    <div className="admin-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {META_ADS_OBJECTIVES.map((objective) => {
                        const active = editTemplateObjectives.includes(objective.id as MetaObjective);
                        return (
                          <button
                            key={objective.id}
                            type="button"
                            onClick={() => toggleEditTemplateObjective(objective.id as MetaObjective)}
                            style={{
                              textAlign: "left",
                              padding: "8px 10px",
                              borderRadius: 8,
                              border: active ? "1px solid #2563EB" : "1px solid #E2E8F0",
                              background: active ? "#EFF6FF" : "#FFFFFF",
                              color: active ? "#1D4ED8" : "#475569",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {objective.label}
                          </button>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: 11, color: "#64748B" }}>
                      O primeiro objetivo selecionado será usado como objetivo principal.
                    </p>
                  </div>
                );
              })()}

              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => { setEditTemplateModalDashboard(null); setEditTemplateType(""); setEditTemplateObjectives([]); }}
                  style={{ flex: 1, padding: "12px", borderRadius: 8, border: "1px solid #E2E8F0", background: "white", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingTemplate}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 8, border: "none",
                    background: "#2563EB", color: "white", fontSize: 14,
                    fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                  }}
                >
                  {isUpdatingTemplate ? <Loader2 className="animate-spin" size={18} /> : <><RefreshCw size={18} /> Salvar Template</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Compartilhamento Seguro */}
      {shareModalDashboard && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 600, padding: 0, overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F8FAFC" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>
                Compartilhar: {shareModalDashboard.name}
              </h2>
              <button onClick={() => setShareModalDashboard(null)} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 24, overflowY: "auto" }}>
              <ShareLinksManager 
                dashboardId={shareModalDashboard.id} 
                dashboardName={shareModalDashboard.name} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Integração Google Sheets */}
      {integrationModalDashboard && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 100, padding: 20, overflowY: "auto" }}>
          <div className="card" style={{ width: "100%", maxWidth: 980, padding: 0, overflow: "hidden", maxHeight: "calc(100vh - 40px)", display: "flex", flexDirection: "column", margin: "auto 0" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F8FAFC" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}>
                <Database size={18} color="#EA580C" /> Integração Google Sheets
              </h2>
              <button onClick={() => setIntegrationModalDashboard(null)} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveIntegration} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", flex: 1 }}>
              {(() => {
                const allSheetSources = sources.filter((s: any) => s.type === "google_sheets");
                const googleCandidates = allSheetSources.filter((s: any) => inferSourceRole(s) === "google_ads");
                const metaCandidates = allSheetSources.filter((s: any) => inferSourceRole(s) === "meta_ads");
                const formatSheetOptionLabel = (s: any) => {
                  const sheetId = s?.google_sheet_sources?.spreadsheet_id || "-";
                  return `${s.name} · ${s.clients?.name || "Cliente"} · ${String(sheetId).slice(0, 12)}...`;
                };
                return (
                  <>
              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: 12 }}>
                <p style={{ fontSize: 12, color: "#1E3A8A", fontWeight: 600 }}>Dashboard: {integrationModalDashboard.name}</p>
                <p style={{ fontSize: 11, color: "#1D4ED8", marginTop: 2 }}>Cliente: {clients.find(c => c.id === integrationModalDashboard.client_id)?.name || "Cliente"}</p>
              </div>

              {integrationModalDashboard.dashboard_type === "google_meta_ads_s4x" ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
                    <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>Fonte 1: Google Ads</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Selecionar planilha existente</label>
                        <select
                          value={integrationForm.googleAdsSourceId}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const selected = googleCandidates.find((s: any) => s.id === selectedId);
                            if (!selected) {
                              setIntegrationForm({ ...integrationForm, googleAdsSourceId: "" });
                              return;
                            }
                            setIntegrationForm({
                              ...integrationForm,
                              googleAdsSourceId: selectedId,
                              googleAdsName: selected.name || integrationForm.googleAdsName,
                              googleAdsSpreadsheetId: selected.google_sheet_sources?.spreadsheet_id || integrationForm.googleAdsSpreadsheetId,
                            });
                          }}
                          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, background: "white" }}
                        >
                          <option value="">Selecionar (opcional)</option>
                          {googleCandidates.map((s: any) => (
                            <option key={s.id} value={s.id}>{formatSheetOptionLabel(s)}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Nome da Conexão</label>
                        <input
                          required
                          value={integrationForm.googleAdsName}
                          onChange={e => setIntegrationForm({ ...integrationForm, googleAdsName: e.target.value, googleAdsSourceId: "" })}
                          placeholder="Ex: Planilha Google Ads"
                          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14 }}
                        />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>ID da Planilha Google Ads</label>
                        <input
                          required
                          value={integrationForm.googleAdsSpreadsheetId}
                          onChange={e => setIntegrationForm({ ...integrationForm, googleAdsSpreadsheetId: e.target.value, googleAdsSourceId: "" })}
                          placeholder="Cole o ID da planilha do Google Ads"
                          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14 }}
                        />
                      </div>
                    </div>

                    <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#1D4ED8" }}>Fonte 2: Meta Ads</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Selecionar planilha existente</label>
                        <select
                          value={integrationForm.metaAdsSourceId}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const selected = metaCandidates.find((s: any) => s.id === selectedId);
                            if (!selected) {
                              setIntegrationForm({ ...integrationForm, metaAdsSourceId: "" });
                              return;
                            }
                            setIntegrationForm({
                              ...integrationForm,
                              metaAdsSourceId: selectedId,
                              metaAdsName: selected.name || integrationForm.metaAdsName,
                              metaAdsSpreadsheetId: selected.google_sheet_sources?.spreadsheet_id || integrationForm.metaAdsSpreadsheetId,
                            });
                          }}
                          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, background: "white" }}
                        >
                          <option value="">Selecionar (opcional)</option>
                          {metaCandidates.map((s: any) => (
                            <option key={s.id} value={s.id}>{formatSheetOptionLabel(s)}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Nome da Conexão</label>
                        <input
                          required
                          value={integrationForm.metaAdsName}
                          onChange={e => setIntegrationForm({ ...integrationForm, metaAdsName: e.target.value, metaAdsSourceId: "" })}
                          placeholder="Ex: Planilha Meta Ads"
                          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14 }}
                        />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>ID da Planilha Meta Ads</label>
                        <input
                          required
                          value={integrationForm.metaAdsSpreadsheetId}
                          onChange={e => setIntegrationForm({ ...integrationForm, metaAdsSpreadsheetId: e.target.value, metaAdsSourceId: "" })}
                          placeholder="Cole o ID da planilha do Meta Ads"
                          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14 }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Nome da Conexão</label>
                    <input 
                      required
                      value={integrationForm.name}
                      onChange={e => setIntegrationForm({ ...integrationForm, name: e.target.value })}
                      placeholder="Ex: Planilha de Vendas Google Ads"
                      style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14 }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>ID da Planilha (Spreadsheet ID)</label>
                    <input 
                      required
                      value={integrationForm.spreadsheetId}
                      onChange={e => setIntegrationForm({ ...integrationForm, spreadsheetId: e.target.value })}
                      placeholder="Cole o ID da planilha do Google Sheets"
                      style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14 }}
                    />
                  </div>
                </>
              )}
              <span style={{ fontSize: 11, color: "#94A3B8", marginTop: -8 }}>
                O ID fica na URL da planilha: docs.google.com/spreadsheets/d/<strong>[ID-AQUI]</strong>/edit
              </span>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, border: "1px solid #DBEAFE", background: "#EFF6FF", borderRadius: 8, padding: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#1E40AF" }}>Google Service Account (obrigatório)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <code style={{ fontSize: 12, color: "#1E3A8A", background: "#FFFFFF", border: "1px solid #BFDBFE", borderRadius: 6, padding: "6px 8px", wordBreak: "break-all", flex: 1 }}>
                    {GOOGLE_SERVICE_ACCOUNT_EMAIL}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyServiceEmail}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 6, border: "1px solid #BFDBFE", background: "#FFFFFF", color: "#1D4ED8", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    <Copy size={13} /> Copiar
                  </button>
                </div>
                <div style={{ fontSize: 12, color: "#1E3A8A", lineHeight: 1.5 }}>
                  <strong>Como liberar acesso no Google Sheets:</strong><br />
                  1. Abra a planilha e clique em <strong>Compartilhar</strong>.<br />
                  2. Adicione o e-mail acima.<br />
                  3. Defina a permissão como <strong>Editor</strong>.<br />
                  4. Salve e volte para clicar em <strong>Salvar Integração</strong>.
                </div>
              </div>
                  </>
                );
              })()}

              {/* Status da Planilha & Sincronização direta do Modal */}
              {(() => {
                const dashSources = getDashboardSheetSources(integrationModalDashboard.id);
                if (dashSources.length > 0) {
                  return (
                    <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                      {dashSources.map((source: any) => (
                        <div key={source.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: "#64748B" }}>
                            {getSourceRole(source) === "google_ads" ? "Google Ads" : getSourceRole(source) === "meta_ads" ? "Meta Ads" : "Fonte"}:
                            {" "}
                            <strong>{source.google_sheet_sources?.last_import_at ? `${new Date(source.google_sheet_sources.last_import_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (UTC-3)` : "Nunca sincronizada"}</strong>
                          </span>
                          {source.google_sheet_sources?.spreadsheet_id && (
                            <a 
                              href={`https://docs.google.com/spreadsheets/d/${source.google_sheet_sources.spreadsheet_id}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ fontSize: 12, color: "#2563EB", textDecoration: "none", fontWeight: 500 }}
                            >
                              Abrir Planilha ↗
                            </a>
                          )}
                        </div>
                      ))}

                      {(() => {
                        const sourceForValidation = dashSources.find((s: any) => getSourceRole(s) === "meta_ads") || dashSources[0];
                        const validation = getValidationSummary(integrationModalDashboard, sourceForValidation);
                        const isMissing = validation.status === "missing_metrics";
                        const isOk = validation.status === "ok";
                        const notes = validation.notes || {};
                        const missingByObjective = notes.missingLabelsByObjective || notes.missingByObjective || {};
                        const hasMissingDetails = Object.keys(missingByObjective).length > 0;
                        return (
                          <div
                            style={{
                              padding: 10,
                              borderRadius: 8,
                              border: isMissing ? "1px solid #FDE68A" : isOk ? "1px solid #BBF7D0" : "1px solid #E2E8F0",
                              background: isMissing ? "#FFFBEB" : isOk ? "#F0FDF4" : "#F8FAFC",
                              display: "flex",
                              flexDirection: "column",
                              gap: 6,
                            }}
                          >
                            <p style={{ fontSize: 12, fontWeight: 700, color: isMissing ? "#92400E" : isOk ? "#166534" : "#475569" }}>
                              {isMissing
                                ? "Existem métricas faltantes para os objetivos configurados"
                                : isOk
                                  ? "Métricas da planilha validadas com sucesso"
                                  : "Objetivos ainda não configurados para validação"}
                            </p>
                            <p style={{ fontSize: 11, color: "#475569" }}>
                              {notes.message || "Selecione objetivos no dashboard Meta Ads para ativar a validação automática."}
                            </p>
                            {hasMissingDetails && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                {Object.entries(missingByObjective).map(([objective, fields]) => (
                                  <p key={objective} style={{ fontSize: 11, color: "#78350F" }}>
                                    <strong>{getMetaObjectiveLabel(objective)}:</strong> {(fields as string[]).join(", ")}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                       
                      <button
                        type="button"
                        onClick={handleSyncIntegration}
                        disabled={isSyncing}
                        style={{
                          width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #BBF7D0",
                          background: "#F0FDF4", color: "#16A34A", fontSize: 13, fontWeight: 600,
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                        }}
                      >
                        {isSyncing ? (
                          <>
                            <Loader2 className="animate-spin" size={16} /> Sincronizando dados...
                          </>
                        ) : (
                          <>
                            <RefreshCw size={14} /> Sincronizar Planilha Agora
                          </>
                        )}
                      </button>
                    </div>
                  );
                }
                return null;
              })()}

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button 
                  type="button"
                  onClick={() => setIntegrationModalDashboard(null)}
                  style={{ flex: 1, padding: "12px", borderRadius: 8, border: "1px solid #E2E8F0", background: "white", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
                >
                  Fechar
                </button>
                <button 
                  type="submit"
                  disabled={isSavingIntegration || isSyncing}
                  style={{ 
                    flex: 1, padding: "12px", borderRadius: 8, border: "none", 
                    background: "#2563EB", color: "white", fontSize: 14, 
                    fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 
                  }}
                >
                  {isSavingIntegration ? <Loader2 className="animate-spin" size={18} /> : (
                    <>
                      <Save size={18} /> Salvar Integração
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
