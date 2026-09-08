type SummaryMetricSnapshot = {
  cost: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  cvr: number;
  cpa: number | null;
};

export type ClientPerformanceSummaryInput = {
  clientName: string;
  period: { from: string; to: string; days: number };
  previousPeriod: { from: string; to: string };
  current: SummaryMetricSnapshot;
  previous: SummaryMetricSnapshot;
  auction?: {
    searchImpressionShare: number | null;
    budgetLostImpressionShare: number | null;
    rankLostImpressionShare: number | null;
  } | null;
  executedOptimizations: string[];
  nextActions: string[];
};

export type ClientPerformanceSummaryResult = {
  text: string;
  provider: "openai" | "gemini" | "automatic";
  model: string | null;
  generatedWithAi: boolean;
  fallbackUsed: boolean;
  error?: string;
};

const OPENAI_ENV_KEY = "OPENAI_API_KEY";
const GEMINI_ENV_KEY = "GEMINI_API_KEY";

function isPlaceholderCredential(value: string) {
  if (!value) return true;
  const normalized = value.trim().toUpperCase();
  return (
    normalized.includes("SEU_") ||
    normalized.includes("PLACEHOLDER") ||
    normalized.includes("TOKEN_AQUI") ||
    normalized.includes("CHAVE_AQUI") ||
    normalized.includes("API_KEY_AQUI")
  );
}

async function getProjectEnvVarFromVercel(key: string) {
  const projectId = process.env.VERCEL_PROJECT_ID;
  const token = process.env.VERCEL_TOKEN;
  if (!projectId || !token) return null;

  try {
    const response = await fetch(`https://api.vercel.com/v8/projects/${projectId}/env?decrypt=true`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const json = await response.json();
    const envs = Array.isArray(json?.envs) ? json.envs : [];
    const hit = envs.find((item: any) => item?.key === key);
    const value = String(hit?.value || "").trim();
    return value || null;
  } catch {
    return null;
  }
}

async function resolveCredential(key: string, runtimeValue: string | undefined) {
  const fromVercel = String((await getProjectEnvVarFromVercel(key)) || "").trim();
  if (fromVercel && !isPlaceholderCredential(fromVercel)) return fromVercel;
  const fromRuntime = String(runtimeValue || "").trim();
  return fromRuntime && !isPlaceholderCredential(fromRuntime) ? fromRuntime : "";
}

function brl(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "não disponível";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function integer(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
}

function percent(value: number | null | undefined, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "não disponível";
  return `${value.toFixed(digits).replace(".", ",")}%`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

function pctChange(current: number, previous: number): number | null {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function clientFirstName(name: string) {
  return String(name || "").trim().split(/\s+/)[0] || "Olá";
}

function movementSentence(input: ClientPerformanceSummaryInput) {
  const clickDelta = pctChange(input.current.clicks, input.previous.clicks);
  const conversionDelta = pctChange(input.current.conversions, input.previous.conversions);
  const cpcDelta = pctChange(input.current.cpc, input.previous.cpc);
  const pieces: string[] = [];

  if (clickDelta != null && Math.abs(clickDelta) >= 10) {
    pieces.push(`${clickDelta < 0 ? "menos" : "mais"} cliques que no período anterior`);
  }
  if (conversionDelta != null && Math.abs(conversionDelta) >= 10) {
    if (input.current.conversions === 0) pieces.push("nenhuma nova conversão registrada");
    else pieces.push(`${conversionDelta < 0 ? "menos" : "mais"} conversões registradas`);
  }
  if (cpcDelta != null && Math.abs(cpcDelta) >= 15) {
    pieces.push(`custo por clique ${cpcDelta > 0 ? "mais alto" : "mais baixo"}`);
  }

  if (!pieces.length) return "O desempenho ficou relativamente próximo ao período anterior nas principais métricas.";
  return `Em relação ao período anterior, tivemos ${pieces.join(", ")}.`;
}

export function buildAutomaticClientPerformanceSummary(input: ClientPerformanceSummaryInput) {
  const firstName = clientFirstName(input.clientName);
  const periodLabel = `${formatDate(input.period.from)} a ${formatDate(input.period.to)}`;
  const resultLine = input.current.conversions === 0
    ? `No período de ${periodLabel}, a campanha investiu ${brl(input.current.cost)}, gerou ${integer(input.current.clicks)} cliques e não registrou novas conversões.`
    : `No período de ${periodLabel}, a campanha investiu ${brl(input.current.cost)}, gerou ${integer(input.current.clicks)} cliques e ${integer(input.current.conversions)} conversão(ões) registrada(s).`;

  const optimizationLine = input.executedOptimizations.length
    ? `Também foram realizados ajustes em ${input.executedOptimizations.slice(0, 3).join(", ")}, buscando melhorar a qualidade das buscas e a eficiência da campanha.`
    : "Neste período, o foco ficou na análise dos dados e na identificação dos pontos que mais estão limitando a campanha, sem atribuir como concluído nenhum ajuste que não esteja registrado no histórico da conta.";

  const nextFocus = input.nextActions.length
    ? input.nextActions.slice(0, 3).join(", ")
    : "acompanhar a qualidade do tráfego, os custos e a geração de novas conversões";

  return `${firstName}, ${resultLine} ${movementSentence(input)}\n\n${optimizationLine}\n\nPara a próxima semana, o foco será ${nextFocus}. A expectativa é observar sinais graduais de melhora na qualidade do tráfego e na capacidade de gerar novos resultados, sem fazer mudanças agressivas antes de termos dados suficientes para validar a evolução.`;
}

function cleanAiText(value: string) {
  return value
    .replace(/```(?:text|markdown|html)?/gi, "")
    .replace(/```/g, "")
    .replace(/<[^>]+>/g, "")
    .trim()
    .slice(0, 2200);
}

function buildPrompt(input: ClientPerformanceSummaryInput, fallback: string) {
  const current = input.current;
  const previous = input.previous;
  const auction = input.auction;

  return `Você é um analista de mídia paga da S4X. Escreva uma mensagem curta para ser enviada diretamente à cliente pelo WhatsApp após a análise do período.

OBJETIVO
Explicar, em linguagem amigável e humana:
1. como foi o resultado do período analisado;
2. quais otimizações realmente foram registradas como executadas;
3. o que será priorizado e o que esperamos observar na próxima semana.

REGRAS OBRIGATÓRIAS
- Responda somente com o texto da mensagem, sem título, markdown, bullets ou explicações extras.
- Use 3 parágrafos curtos, aproximadamente 500 a 900 caracteres no total.
- Linguagem simples, próxima e profissional. Evite jargões como Ad Rank, Search IS, GAQL, API, Quality Score ou Smart Bidding.
- Não prometa resultados. Use termos como expectativa, objetivo, tendência, buscar, acompanhar.
- Não invente nenhuma otimização. Só diga que algo foi executado se estiver na lista "Otimizações registradas".
- Se a lista de otimizações estiver vazia, diga apenas que o período foi usado para análise/revisão e que os próximos ajustes foram definidos.
- Não trate conversões do Google Ads como leads confirmados. Use "conversões registradas" ou "resultados registrados".
- Não diga que falta orçamento se os dados de leilão indicarem perda maior por ranking/competitividade.
- Não exponha ferramentas, banco de dados, API, IA ou processos internos.
- Não despeje muitos números: escolha no máximo 3 números relevantes.
- Preserve os fatos e não atribua causalidade sem evidência.

CLIENTE: ${input.clientName}
PERÍODO: ${input.period.from} a ${input.period.to} (${input.period.days} dias)
PERÍODO ANTERIOR: ${input.previousPeriod.from} a ${input.previousPeriod.to}

DADOS DO PERÍODO
Investimento: ${brl(current.cost)} | anterior: ${brl(previous.cost)}
Impressões: ${integer(current.impressions)} | anterior: ${integer(previous.impressions)}
Cliques: ${integer(current.clicks)} | anterior: ${integer(previous.clicks)}
CTR: ${percent(current.ctr, 2)} | anterior: ${percent(previous.ctr, 2)}
CPC: ${brl(current.cpc)} | anterior: ${brl(previous.cpc)}
Conversões registradas: ${integer(current.conversions)} | anterior: ${integer(previous.conversions)}
Taxa de conversão: ${percent(current.cvr, 2)} | anterior: ${percent(previous.cvr, 2)}
CPA: ${brl(current.cpa)} | anterior: ${brl(previous.cpa)}
${auction ? `Participação de impressões: ${auction.searchImpressionShare == null ? "n/d" : percent(auction.searchImpressionShare * 100)} | perda por orçamento: ${auction.budgetLostImpressionShare == null ? "n/d" : percent(auction.budgetLostImpressionShare * 100)} | perda por competitividade/ranking: ${auction.rankLostImpressionShare == null ? "n/d" : percent(auction.rankLostImpressionShare * 100)}` : "Dados de leilão: não disponíveis"}

OTIMIZAÇÕES REGISTRADAS
${input.executedOptimizations.length ? input.executedOptimizations.map((item) => `- ${item}`).join("\n") : "Nenhuma alteração estrutural comprovada no período selecionado."}

PRÓXIMAS AÇÕES PRIORIZADAS
${input.nextActions.length ? input.nextActions.map((item) => `- ${item}`).join("\n") : "- acompanhar desempenho e acumular mais dados antes de mudanças relevantes"}

TEXTO AUTOMÁTICO DE REFERÊNCIA
${fallback}

Reescreva a mensagem deixando-a mais natural, clara e amigável, sem acrescentar fatos.`;
}

async function tryOpenAi(prompt: string, apiKey: string) {
  const model = process.env.OPENAI_REPORT_MODEL || "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input: prompt }),
    cache: "no-store",
  });
  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`OpenAI HTTP ${response.status}: ${raw.slice(0, 240)}`);
  }
  const json = await response.json();
  const text = cleanAiText(String(json?.output_text || ""));
  if (!text) throw new Error("OpenAI retornou texto vazio.");
  return { text, model };
}

async function tryGemini(prompt: string, apiKey: string) {
  const model = process.env.GEMINI_REPORT_MODEL || "gemini-2.0-flash-lite";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.35, maxOutputTokens: 650 },
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`Gemini HTTP ${response.status}: ${raw.slice(0, 240)}`);
  }
  const json = await response.json();
  const text = cleanAiText(String(json?.candidates?.[0]?.content?.parts?.[0]?.text || ""));
  if (!text) throw new Error("Gemini retornou texto vazio.");
  return { text, model };
}

export async function generateClientPerformanceSummary(input: ClientPerformanceSummaryInput): Promise<ClientPerformanceSummaryResult> {
  const fallback = buildAutomaticClientPerformanceSummary(input);
  const [openAiApiKey, geminiApiKey] = await Promise.all([
    resolveCredential(OPENAI_ENV_KEY, process.env.OPENAI_API_KEY),
    resolveCredential(GEMINI_ENV_KEY, process.env.GEMINI_API_KEY),
  ]);

  if (!openAiApiKey && !geminiApiKey) {
    return {
      text: fallback,
      provider: "automatic",
      model: null,
      generatedWithAi: false,
      fallbackUsed: true,
      error: "Nenhuma credencial de IA configurada.",
    };
  }

  const prompt = buildPrompt(input, fallback);
  let openAiError = "";

  if (openAiApiKey) {
    try {
      const generated = await tryOpenAi(prompt, openAiApiKey);
      return {
        text: generated.text,
        provider: "openai",
        model: generated.model,
        generatedWithAi: true,
        fallbackUsed: false,
      };
    } catch (error) {
      openAiError = error instanceof Error ? error.message : String(error);
    }
  }

  if (geminiApiKey) {
    try {
      const generated = await tryGemini(prompt, geminiApiKey);
      return {
        text: generated.text,
        provider: "gemini",
        model: generated.model,
        generatedWithAi: true,
        fallbackUsed: !!openAiError,
        error: openAiError || undefined,
      };
    } catch (error) {
      const geminiError = error instanceof Error ? error.message : String(error);
      return {
        text: fallback,
        provider: "automatic",
        model: null,
        generatedWithAi: false,
        fallbackUsed: true,
        error: [openAiError, geminiError].filter(Boolean).join(" | "),
      };
    }
  }

  return {
    text: fallback,
    provider: "automatic",
    model: null,
    generatedWithAi: false,
    fallbackUsed: true,
    error: openAiError || "Não foi possível gerar o texto com IA.",
  };
}
