import { NextResponse } from "next/server";
import { DataSourceService } from "@/services/data-source-service";
import { GoogleSheetsImportService } from "@/lib/google-sheets/google-sheets-import-service";

export const dynamic = 'force-dynamic';

/**
 * Endpoint de Cron para importação automática de Google Sheets.
 * GET ou POST são aceitos (Vercel Cron usa GET por padrão, mas POST é mais seguro para disparos manuais).
 */
export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}

async function handleCron(request: Request) {
  try {
    // 1. Validação do CRON_SECRET
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    console.log("[CRON] Iniciando processamento de importações agendadas...");

    // 2. Busca todas as fontes Google Sheets ativas
    const activeSources = await DataSourceService.getActiveGoogleSheetsSources();
    
    if (!activeSources || activeSources.length === 0) {
      return NextResponse.json({ 
        message: "Nenhuma fonte ativa encontrada para processamento.",
        processed: 0 
      });
    }

    const summary = {
      total: activeSources.length,
      success: 0,
      warnings: 0,
      errors: 0,
      details: [] as any[]
    };

    // 3. Processa cada fonte individualmente
    // Usamos for...of para processar sequencialmente e evitar estourar limites de cota da API do Google se houver muitas fontes
    for (const source of activeSources) {
      // Pode vir como array ou objeto dependendo da versão do Supabase/PostgREST
      const gSheetConfig = Array.isArray(source.google_sheet_sources) 
        ? source.google_sheet_sources[0] 
        : source.google_sheet_sources;
      
      if (!gSheetConfig || !gSheetConfig.spreadsheet_id) {
        summary.errors++;
        summary.details.push({
          sourceId: source.id,
          status: "error",
          message: "Configuração de planilha não encontrada ou Spreadsheet ID ausente."
        });
        continue;
      }

      try {
        console.log(`[CRON] Importando: Client ${source.client_id} | Dashboard ${source.dashboard_id} | Sheet ${gSheetConfig.spreadsheet_id}`);
        
        const result = await GoogleSheetsImportService.importDashboardData(
          source.client_id,
          source.dashboard_id,
          gSheetConfig.spreadsheet_id,
          source.id
        );

        if (result.success) {
          if (result.warnings.length > 0) {
            summary.warnings++;
          } else {
            summary.success++;
          }
        } else {
          summary.errors++;
        }

        summary.details.push({
          sourceId: source.id,
          status: result.success ? (result.warnings.length > 0 ? "success_with_warnings" : "success") : "failed",
          warnings: result.warnings.length,
          errors: result.errors.length
        });

      } catch (error: any) {
        console.error(`[CRON] Erro ao processar fonte ${source.id}:`, error);
        summary.errors++;
        summary.details.push({
          sourceId: source.id,
          status: "failed",
          error: error.message
        });
      }
    }

    console.log("[CRON] Processamento concluído.", summary);

    return NextResponse.json({
      message: "Processamento de cron finalizado.",
      summary
    });

  } catch (error: any) {
    console.error("[CRON FATAL ERROR]:", error);
    return NextResponse.json({ 
      error: "Erro interno durante o processamento do cron.",
      details: error.message 
    }, { status: 500 });
  }
}
