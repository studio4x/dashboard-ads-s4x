import { NextResponse } from "next/server";
import { DashboardService } from "@/services/dashboard-service";
import { requireAdmin } from "@/lib/auth/guards";
import { normalizeMetaAdsObjectives } from "@/lib/meta-ads/objectives";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security/request-guards";
import { apiErrorResponse, parseJsonObject } from "@/lib/security/api-safety";
import { DashboardTemplateCatalogService } from "@/services/dashboard-template-catalog-service";
import { DashboardTemplateService } from "@/services/dashboard-template-service";
import { DataSourceService } from "@/services/data-source-service";
import { GoogleSheetsImportService } from "@/lib/google-sheets/google-sheets-import-service";
import { AUTOMATION_PERIOD_OPTIONS, normalizeAutomationPeriodPreset } from "@/lib/dashboard/automation-period";

interface RouteParams {
  params: Promise<{ dashboardId: string }>;
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:dashboards:delete", limit: 20, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const { dashboardId } = await params;

    if (!dashboardId) {
      return NextResponse.json({ error: "dashboardId é obrigatório" }, { status: 400 });
    }

    const deleted = await DashboardService.deleteDashboard(dashboardId);
    return NextResponse.json({ success: true, deleted });
  } catch (error: any) {
    console.error("Erro ao excluir dashboard:", error);
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;
    const rateLimitError = enforceRateLimit(request, { key: "admin:dashboards:update", limit: 40, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;

    const { dashboardId } = await params;
    const parsed = await parseJsonObject(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body;
    const {
      name,
      slug,
      meta_objectives,
      dashboard_type,
      automation_enabled,
      automation_frequency,
      automation_day_of_week,
      automation_hour,
      automation_minute,
      automation_period_preset,
      automation_include_today,
      automation_period_days,
      automation_report_mode,
      automation_channels,
      reprocess_template,
    } = body || {};

    if (!dashboardId) {
      return NextResponse.json({ error: "dashboardId é obrigatório" }, { status: 400 });
    }

    let templateUpdatedDashboard: any | null = null;
    const templateType = typeof dashboard_type === "string" && dashboard_type.trim() ? dashboard_type.trim() : "";
    const templateWasRequested = Boolean(templateType);
    const currentDashboard = templateWasRequested
      ? await DashboardService.getDashboardById(dashboardId, { bypassRls: true }).catch(() => null)
      : null;

    if (templateWasRequested) {
      const templateDefinition = await DashboardTemplateCatalogService.getTemplateDefinition(templateType);
      if (!templateDefinition) {
        return NextResponse.json({ error: "Template selecionado inválido ou indisponível." }, { status: 400 });
      }

      const normalizedObjectives = templateDefinition.platform === "meta_ads" || templateDefinition.platform === "mixed"
        ? normalizeMetaAdsObjectives(Array.isArray(meta_objectives) && meta_objectives.length > 0
          ? meta_objectives
          : (Array.isArray(currentDashboard?.meta_objectives) ? currentDashboard.meta_objectives : []))
        : [];

      templateUpdatedDashboard = await DashboardTemplateService.applyTemplateToExistingDashboard(
        dashboardId,
        templateType,
        {
          metaObjectives: normalizedObjectives,
          metaPrimaryObjective: normalizedObjectives[0] || null,
        }
      );
    }

    const updates: {
      name?: string;
      slug?: string;
      meta_objectives?: string[];
      meta_primary_objective?: string | null;
      automation_enabled?: boolean;
      automation_frequency?: "daily" | "weekly";
      automation_day_of_week?: number;
      automation_hour?: number;
      automation_minute?: number;
      automation_period_preset?: string;
      automation_include_today?: boolean;
      automation_period_days?: number;
      automation_report_mode?: "analysis_only" | "metrics_only" | "both" | "pdf_only" | "analysis_pdf" | "both_pdf";
      automation_channels?: string[];
    } = {};

    if (name !== undefined) {
      if (!name || String(name).trim().length < 3) {
        return NextResponse.json({ error: "Nome do dashboard inválido" }, { status: 400 });
      }
      updates.name = String(name).trim();
      if (slug && String(slug).trim()) {
        updates.slug = String(slug).trim();
      }
    }

    if (!templateWasRequested && meta_objectives !== undefined) {
      const objectives = normalizeMetaAdsObjectives(meta_objectives);
      updates.meta_objectives = objectives;
      updates.meta_primary_objective = objectives[0] || null;
    }

    if (automation_enabled !== undefined) {
      updates.automation_enabled = Boolean(automation_enabled);
    }

    if (automation_frequency !== undefined) {
      const freq = String(automation_frequency);
      if (freq !== "daily" && freq !== "weekly") {
        return NextResponse.json({ error: "automation_frequency inválido. Use daily ou weekly." }, { status: 400 });
      }
      updates.automation_frequency = freq;
    }

    if (automation_day_of_week !== undefined) {
      const value = Number(automation_day_of_week);
      if (!Number.isInteger(value) || value < 0 || value > 6) {
        return NextResponse.json({ error: "automation_day_of_week inválido. Use 0..6." }, { status: 400 });
      }
      updates.automation_day_of_week = value;
    }

    if (automation_hour !== undefined) {
      const value = Number(automation_hour);
      if (!Number.isInteger(value) || value < 0 || value > 23) {
        return NextResponse.json({ error: "automation_hour inválido. Use 0..23." }, { status: 400 });
      }
      updates.automation_hour = value;
    }

    if (automation_minute !== undefined) {
      const value = Number(automation_minute);
      if (!Number.isInteger(value) || value < 0 || value > 59 || value % 5 !== 0) {
        return NextResponse.json({ error: "automation_minute inválido. Use 0..59 em múltiplos de 5." }, { status: 400 });
      }
      updates.automation_minute = value;
    }

    if (automation_period_preset !== undefined) {
      const rawValue = String(automation_period_preset).trim();
      if (!AUTOMATION_PERIOD_OPTIONS.some((option) => option.value === rawValue)) {
        return NextResponse.json({ error: "automation_period_preset inválido." }, { status: 400 });
      }
      updates.automation_period_preset = normalizeAutomationPeriodPreset(rawValue);
    }

    if (automation_include_today !== undefined) {
      updates.automation_include_today = Boolean(automation_include_today);
    }

    if (automation_period_days !== undefined) {
      const value = Number(automation_period_days);
      if (!Number.isInteger(value) || value < 1 || value > 90) {
        return NextResponse.json({ error: "automation_period_days inválido. Use 1..90." }, { status: 400 });
      }
      updates.automation_period_days = value;
    }

    if (automation_report_mode !== undefined) {
      const value = String(automation_report_mode);
      if (!["analysis_only", "metrics_only", "both", "pdf_only", "analysis_pdf", "both_pdf"].includes(value)) {
        return NextResponse.json({ error: "automation_report_mode inválido." }, { status: 400 });
      }
      updates.automation_report_mode = value as "analysis_only" | "metrics_only" | "both" | "pdf_only" | "analysis_pdf" | "both_pdf";
    }

    if (automation_channels !== undefined) {
      if (!Array.isArray(automation_channels)) {
        return NextResponse.json({ error: "automation_channels deve ser uma lista." }, { status: 400 });
      }
      const allowed = new Set(["email", "whatsapp"]);
      const channels = automation_channels
        .map((item: unknown) => String(item || "").trim().toLowerCase())
        .filter((item: string) => Boolean(item) && allowed.has(item));
      updates.automation_channels = Array.from(new Set(channels));
    }

    if (Object.keys(updates).length === 0) {
      if (!templateWasRequested) {
        return NextResponse.json({ error: "Nenhum campo para atualização foi informado" }, { status: 400 });
      }
    }

    const dashboard = Object.keys(updates).length > 0
      ? await DashboardService.updateDashboard(dashboardId, updates)
      : templateUpdatedDashboard;

    const shouldReprocess = templateWasRequested ? reprocess_template !== false : false;
    let reprocessResult: any = null;

    if (shouldReprocess) {
      const sources = await DataSourceService.getActiveGoogleSheetsSources().catch(() => []);
      const dashboardSources = (sources || []).filter((source: any) => source.dashboard_id === dashboardId);
      const results: Array<{ sourceId: string; spreadsheetId: string; success: boolean; error?: string }> = [];

      for (const source of dashboardSources) {
        const gsheet = Array.isArray(source.google_sheet_sources)
          ? source.google_sheet_sources[0]
          : source.google_sheet_sources;
        const spreadsheetId = gsheet?.spreadsheet_id;
        if (!spreadsheetId) {
          results.push({ sourceId: source.id, spreadsheetId: "", success: false, error: "spreadsheet_id ausente" });
          continue;
        }

        try {
          const result = await GoogleSheetsImportService.importDashboardData(
            source.client_id,
            dashboardId,
            spreadsheetId,
            source.id
          );

          results.push({
            sourceId: source.id,
            spreadsheetId,
            success: Boolean(result.success),
          });
        } catch (error: any) {
          results.push({
            sourceId: source.id,
            spreadsheetId,
            success: false,
            error: error instanceof Error ? error.message : "Erro ao reprocessar a fonte.",
          });
        }
      }

      reprocessResult = {
        total: results.length,
        success: results.filter((item) => item.success).length,
        failed: results.filter((item) => !item.success).length,
        results,
      };
    }

    return NextResponse.json({ success: true, dashboard, reprocess: reprocessResult });
  } catch (error: any) {
    console.error("Erro ao atualizar dashboard:", error);
    return apiErrorResponse(error);
  }
}
