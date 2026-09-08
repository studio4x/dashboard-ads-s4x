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

function isWeeklyWindow(input: ClientPerformanceSummaryInput) {
  return input.period.days >= 5 && input.period.days <= 8;
}

function movementSentence(input: ClientPerformanceSummaryInput) {
  const clickDelta = pctChange(input.current.clicks, input.previous.clicks);
  const conversionDelta = pctChange(input.current.conversions, input.previous.conversions);
  const cpcDelta = pctChange(input.current.cpc, input.previous.cpc);
  const weekly = isWeeklyWindow(input);
  const comparison = weekly ? "da semana anterior" : "do período anterior";
  const pieces: string[] = [];

  if (clickDelta != null && Math.abs(clickDelta) >= 10) {
    pieces.push(`o volume de acessos ficou ${clickDelta < 0 ? "abaixo" : "acima"} ${comparison}`);
  }
  if (conversionDelta != null && Math.abs(conversionDelta) >= 10) {
    if (input.current.conversions === 0) pieces.push("não tivemos novos resultados registrados pela campanha");
    else pieces.push(`os resultados registrados ficaram ${conversionDelta < 0 ? "abaixo" : "acima"} ${comparison}`);
  }
  if (cpcDelta != null && Math.abs(cpcDelta) >= 20) {
    pieces.push(`o custo dos acessos ficou ${cpcDelta > 0 ? "mais alto" : "mais baixo"}`);
  }

  if (!pieces.length) {
    return weekly
      ? "De forma geral, o desempenho ficou próximo ao da semana anterior nas principais métricas."
      : "De forma geral, o desempenho ficou próximo ao período anterior nas principais métricas.";
  }

  const [first, ...rest] = pieces;
  return `${first.charAt(0).toUpperCase()}${first.slice(1)}${rest.length ? `; ${rest.join("; ")}` : ""}.`;
}

function expectationSentence(input: ClientPerformanceSummaryInput) {
  const clickDelta = pctChange(input.current.clicks, input.previous.clicks);
  const conversionDelta = pctChange(input.current.conversions, input.previous.conversions);
  const deteriorated = input.current.conversions === 0 || (clickDelta != null && clickDelta <= -10) || (conversionDelta != null && conversionDelta <= -10);
  const improved = input.current.conversions > 0 && conversionDelta != null && conversionDelta >= 15;

  if (deteriorated) {
    return "A expectativa é começar a ver sinais de recuperação no volume e na qualidade dos acessos ao longo dos próximos dias, acompanhando também se os novos resultados voltam a aparecer.";
  }
  if (improved) {
    return "A expectativa é manter essa evolução e entender se o desempenho consegue ganhar consistência ao longo dos próximos dias.";
  }
  return "A expectativa é acompanhar como a campanha responde ao longo dos próximos dias e buscar uma evolução gradual dos resultados.";
}

export function buildAutomaticClientPerformanceSummary(input: ClientPerformanceSummaryInput) {
  const firstName = clientFirstName(input.clientName);
  const weekly = isWeeklyWindow(input);
  const periodLabel = `${formatDate(input.period.from)} a ${formatDate(input.period.to)}`;

  const resultLine = weekly
    ? input.current.conversions === 0
      ? `passando um retorno da semana passada: tivemos ${brl(input.current.cost)} investidos e ${integer(input.current.clicks)} acessos gerados pelos anúncios, mas sem novos resultados registrados pela campanha.`
      : `passando um retorno da semana passada: tivemos ${brl(input.current.cost)} investidos, ${integer(input.current.clicks)} acessos pelos anúncios e ${integer(input.current.conversions)} resultado(s) registrado(s) pela campanha.`
    : input.current.conversions === 0
      ? `no período de ${periodLabel}, tivemos ${brl(input.current.cost)} investidos e ${integer(input.current.clicks)} acessos gerados pelos anúncios, mas sem novos resultados registrados pela campanha.`
      : `no período de ${periodLabel}, tivemos ${brl(input.current.cost)} investidos, ${integer(input.current.clicks)} acessos pelos anúncios e ${integer(input.current.conversions)} resultado(s) registrado(s) pela campanha.`;

  const optimizationLine = input.executedOptimizations.length
    ? `${weekly ? "Na semana passada" : "Nesse período"}, também fizemos ajustes em ${input.executedOptimizations.slice(0, 2).join(" e ")}, com o objetivo de melhorar a qualidade do tráfego e aproveitar melhor o investimento.`
    : `${weekly ? "A revisão da semana passada" : "A revisão desse período"} ajudou a identificar com mais clareza os pontos que estão segurando o desempenho e onde vale concentrar os próximos ajustes.`;

  const nextFocus = input.nextActions.length
    ? input.nextActions.slice(0, 2).join(" e ")
    : "acompanhar a qualidade dos acessos, os custos e a geração de novos resultados";

  const nextLine = weekly
    ? `Esta semana, vamos focar principalmente em ${nextFocus}. ${expectationSentence(input)}`
    : `Nos próximos dias, vamos focar principalmente em ${nextFocus}. ${expectationSentence(input)}`;

  return `${firstName}, ${resultLine} ${movementSentence(input)}\n\n${optimizationLine}\n\n${nextLine}`;
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
  const weekly = isWeeklyWindow(input);

  return `Você é responsável pela comunicação de performance da S4X com seus clientes. Escreva uma mensagem de WhatsApp curta, informal, clara e profissional, como se ela fosse enviada na segunda-feira ou no começo da semana.

OBJETIVO
Explicar de forma natural:
1. como foi o resultado da semana passada;
2. o que realmente foi ajustado ou o que a revisão identificou;
3. o que será feito esta semana e o que esperamos observar.

CONTEXTO TEMPORAL
- ${weekly ? "O período analisado deve ser chamado de \"semana passada\"." : "O período selecionado não corresponde exatamente a uma semana; use \"período analisado\" quando necessário."}
- As ações futuras devem ser chamadas de "esta semana" quando o período for semanal; caso contrário, use "nos próximos dias".
- Para comparação, use "semana anterior" em vez de "período anterior" quando o período for semanal.
- Não escreva "para a próxima semana".
- Não precisa repetir as datas na mensagem quando estiver falando de semana passada.

TOM E ESTILO
- A mensagem deve parecer escrita por uma pessoa da agência, não por um relatório ou por uma IA.
- Pode começar de forma natural, por exemplo: "${clientFirstName(input.clientName)}, passando um retorno da semana passada...".
- Use linguagem próxima e simples, sem ficar formal demais.
- Prefira "acessos" a "cliques" quando isso deixar a frase mais natural.
- Prefira "resultados registrados pela campanha" a "conversões", quando possível.
- Use 3 parágrafos curtos, aproximadamente 450 a 800 caracteres no total.
- Não use título, markdown, listas, bullets, emojis ou explicações extras.

REGRAS DE SEGURANÇA E PRECISÃO
- Não prometa resultados. Fale em expectativa, objetivo, buscar, acompanhar ou sinais de melhora.
- Não invente nenhuma otimização. Só diga que um ajuste foi feito se estiver na lista "Otimizações registradas".
- Se não houver otimizações registradas, NÃO escreva frases defensivas como "não houve alteração comprovada" ou "não atribuir como concluído". Diga naturalmente que a revisão ajudou a identificar os pontos de atenção e definir os ajustes desta semana.
- Separe claramente o que aconteceu na semana passada do que será feito esta semana.
- Não trate conversões do Google Ads como leads ou contatos confirmados. Use "resultados registrados pela campanha".
- Não diga que falta orçamento se os dados de leilão indicarem perda maior por ranking/competitividade.
- Não exponha ferramentas, histórico da conta, banco de dados, API, IA, critérios internos ou processos técnicos.
- Não use termos como Ad Rank, Search IS, GAQL, Quality Score, Smart Bidding, criterion, asset ou change event.
- Não despeje números. Escolha no máximo 3 números que ajudem a entender o resultado.
- Evite redundâncias como "menos cliques que no período anterior".
- Preserve os fatos e não atribua causalidade sem evidência.

CLIENTE: ${input.clientName}
PERÍODO: ${input.period.from} a ${input.period.to} (${input.period.days} dias)
PERÍODO ANTERIOR: ${input.previousPeriod.from} a ${input.previousPeriod.to}

DADOS
Investimento: ${brl(current.cost)} | anterior: ${brl(previous.cost)}
Impressões: ${integer(current.impressions)} | anterior: ${integer(previous.impressions)}
Cliques/acessos: ${integer(current.clicks)} | anterior: ${integer(previous.clicks)}
CTR: ${percent(current.ctr, 2)} | anterior: ${percent(previous.ctr, 2)}
CPC: ${brl(current.cpc)} | anterior: ${brl(previous.cpc)}
Resultados registrados: ${integer(current.conversions)} | anterior: ${integer(previous.conversions)}
Taxa de conversão: ${percent(current.cvr, 2)} | anterior: ${percent(previous.cvr, 2)}
CPA: ${brl(current.cpa)} | anterior: ${brl(previous.cpa)}
${auction ? `Participação de impressões: ${auction.searchImpressionShare == null ? "n/d" : percent(auction.searchImpressionShare * 100)} | perda por orçamento: ${auction.budgetLostImpressionShare == null ? "n/d" : percent(auction.budgetLostImpressionShare * 100)} | perda por competitividade/ranking: ${auction.rankLostImpressionShare == null ? "n/d" : percent(auction.rankLostImpressionShare * 100)}` : "Dados de leilão: não disponíveis"}

OTIMIZAÇÕES REGISTRADAS NA SEMANA PASSADA
${input.executedOptimizations.length ? input.executedOptimizations.map((item) => `- ${item}`).join("\n") : "Nenhuma alteração estrutural registrada no período; a mensagem deve falar apenas da revisão/diagnóstico, sem expor essa regra interna à cliente."}

AÇÕES PRIORIZADAS PARA ESTA SEMANA
${input.nextActions.length ? input.nextActions.map((item) => `- ${item}`).join("\n") : "- acompanhar o desempenho e acumular dados antes de mudanças relevantes"}

REFERÊNCIA DE TOM
${fallback}

Reescreva apenas a mensagem final, deixando-a mais natural, informal e fluida, sem acrescentar fatos.`;
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
      generationConfig: { temperature: 0.45, maxOutputTokens: 650 },
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
