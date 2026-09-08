"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, MessageCircle, RefreshCw, Sparkles } from "lucide-react";

type Props = {
  text: string;
  periodLabel: string;
  provider: "openai" | "gemini" | "automatic";
  model?: string | null;
  generatedWithAi: boolean;
};

function sanitizeClientText(value: string) {
  return String(value || "")
    // Corrige primeiro construções completas para não gerar duplicidades como
    // "presença nas buscas dos anúncios nas buscas".
    .replace(/melhorar a relevância e a presença nas buscas dos anúncios nas buscas/gi, "melhorar a presença e a relevância dos anúncios nas buscas")
    .replace(/melhorar a relevância e a competitividade dos anúncios nas buscas/gi, "melhorar a presença e a relevância dos anúncios nas buscas")
    .replace(/relevância e presença nas buscas dos anúncios nas buscas/gi, "presença e relevância dos anúncios nas buscas")
    .replace(/competitividade dos anúncios(?: nas buscas)?/gi, "presença dos anúncios nas buscas")
    // Se a palavra aparecer isolada, use apenas "presença" para não duplicar "nas buscas".
    .replace(/\bcompetitividade\b/gi, "presença")
    .replace(/concentrar a verba/gi, "direcionar melhor o investimento")
    .replace(/concentrar o investimento/gi, "direcionar melhor o investimento")
    .replace(/reduzir buscas pouco alinhadas e direcionar melhor o investimento nas intenções com maior potencial/gi, "reduzir buscas pouco alinhadas e direcionar melhor o investimento para as buscas com maior potencial")
    .replace(/nas buscas\s+e\s+reduzir buscas pouco alinhadas\s+e\s+direcionar melhor o investimento/gi, "nas buscas, ao mesmo tempo em que reduzimos buscas pouco alinhadas e direcionamos melhor o investimento")
    // Garante leitura em 3 blocos quando a IA devolve tudo em um único parágrafo.
    .replace(/\.\s+(A revisão da semana passada|A revisão desse período|Na semana passada|Nesse período)/gi, ".\n\n$1")
    .replace(/\.\s+(Esta semana|Nos próximos dias)/gi, ".\n\n$1")
    .replace(/\s+([,.!?;:])/g, "$1")
    // Normaliza apenas espaços/tabs; não remove quebras de parágrafo.
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function GoogleAdsClientSummaryCard({ text, periodLabel, provider, model, generatedWithAi }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();
  const [currentText, setCurrentText] = useState(() => sanitizeClientText(text));

  useEffect(() => {
    setCurrentText(sanitizeClientText(text));
  }, [text]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(currentText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = currentText;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  function handleRefresh() {
    startRefresh(() => {
      router.refresh();
    });
  }

  const providerLabel = provider === "openai"
    ? "OpenAI"
    : provider === "gemini"
      ? "Gemini"
      : "Resumo automático";

  return (
    <section
      className="card"
      style={{
        padding: 22,
        marginTop: 18,
        marginBottom: 24,
        border: "1px solid #BFDBFE",
        background: "linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 11, alignItems: "flex-start", minWidth: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#DBEAFE", color: "#1D4ED8", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
            <MessageCircle size={19} />
          </div>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 760, color: "#0F172A", lineHeight: 1.3 }}>
              O que enviar para a cliente sobre a análise da última semana
            </h2>
            <p style={{ marginTop: 4, fontSize: 11, color: "#64748B" }}>
              Texto sugerido com base no período selecionado: {periodLabel}.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span
            title={model || undefined}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 10,
              fontWeight: 700,
              color: generatedWithAi ? "#6D28D9" : "#475569",
              background: generatedWithAi ? "#F3E8FF" : "#F1F5F9",
              border: `1px solid ${generatedWithAi ? "#E9D5FF" : "#E2E8F0"}`,
              borderRadius: 999,
              padding: "5px 8px",
            }}
          >
            <Sparkles size={12} />
            {providerLabel}
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              height: 34,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "0 11px",
              borderRadius: 8,
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              color: "#475569",
              fontSize: 11,
              fontWeight: 750,
              cursor: isRefreshing ? "wait" : "pointer",
              opacity: isRefreshing ? 0.65 : 1,
            }}
          >
            <RefreshCw size={14} />
            {isRefreshing ? "Gerando..." : "Gerar novamente"}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              height: 34,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "0 11px",
              borderRadius: 8,
              border: "1px solid #BFDBFE",
              background: copied ? "#ECFDF5" : "#EFF6FF",
              color: copied ? "#047857" : "#1D4ED8",
              fontSize: 11,
              fontWeight: 750,
              cursor: "pointer",
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copiado" : "Copiar texto"}
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          border: "1px solid #E2E8F0",
          borderRadius: 10,
          background: "#FFFFFF",
          padding: "16px 17px",
          whiteSpace: "pre-wrap",
          color: "#334155",
          fontSize: 13.5,
          lineHeight: 1.7,
        }}
      >
        {currentText}
      </div>

      <p style={{ marginTop: 9, fontSize: 10.5, lineHeight: 1.45, color: "#94A3B8" }}>
        A sugestão é gerada a partir dos dados e alterações registradas no período. Revise antes de enviar, principalmente quando houver informações externas de CRM ou qualidade dos leads que ainda não estejam integradas ao dashboard.
      </p>
    </section>
  );
}
