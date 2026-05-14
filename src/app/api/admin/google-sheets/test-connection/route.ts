import { NextResponse } from "next/server";
import { getSpreadsheetMetadata } from "@/lib/google-sheets/google-sheets-client";

export async function POST(request: Request) {
  try {
    const { spreadsheetId } = await request.json();

    if (!spreadsheetId) {
      return NextResponse.json({ error: "Spreadsheet ID é obrigatório." }, { status: 400 });
    }

    const metadata = await getSpreadsheetMetadata(spreadsheetId);
    
    return NextResponse.json({
      success: true,
      title: metadata.properties?.title,
      tabs: metadata.sheets?.map(s => s.properties?.title) || []
    });
  } catch (error: any) {
    console.error("Test Connection Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Erro desconhecido ao conectar." 
    }, { status: 500 });
  }
}
