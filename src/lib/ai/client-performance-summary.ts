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

function normalizeAction(value: string) {
  return String(value || "")
    .trim()
    .replace(/[.!;:]+$/g, "")
    .replace(/\s+/g, " ");
}

function humanizeAction(value: string) {
  const raw = normalizeAction(value);
  const lower = raw.toLowerCase();

  if (lower.includes("ad rank") || lower.includes("relevância keyword") || lower.includes("relevancia keyword")) {
    return "melhorar a presença e a relevância dos anúncios nas buscas";
  }
  if (lower.includes("negativas") || lower.includes("correspondências") || lower.includes("correspondencias")) {
    return "reduzir buscas pouco alinhadas ao serviço";
  }
  if (lower.includes("keywords com gasto") || lower.includes("palavras-chave com gasto")) {
    return "revisar as palavras-chave que estão consumindo investimento sem gerar resultado";
  }
  if (lower.includes("eficiência antes de escalar") || lower.includes("eficiencia antes de escalar")) {
    return "melhorar a eficiência da campanha antes de pensar em aumentar o investimento";
  }
  if (lower.includes("não aumentar orçamento") || lower.includes("nao aumentar orçamento") || lower.includes("nao aumentar orcamento")) {
    return "manter o investimento sob controle enquanto trabalhamos na eficiência da campanha";
  }
  if (lower.includes("horários") || lower.includes("horarios")) {
    return "revisar os horários em que os anúncios estão trazendo acessos";
  }
  if (lower.includes("dispositivo")) {
    return "entender melhor o desempenho entre celular e computador";
  }
  if (lower.includes("preservar estrutura") || lower.includes("acumular evidência") || lower.includes("acumular evidencia")) {
    return "acompanhar o comportamento da campanha antes de fazer mudanças maiores";
  }

  return raw
    .replace(/\bAd Rank\b/gi, "presença dos anúncios nas buscas")
    .replace(/\bkeywords?\b/gi, "palavras-chave")
    .replace(/\blanding page\b/gi, "página de destino")
    .replace(/\bcompetitividade\b/gi, "presença nas buscas");
}

function humanizeOptimization(value: string) {
  const action = humanizeAction(value);
  return action
    .replace(/^melhorar /i, "melhorias em ")
    .replace(/^reduzir /i, "ajustes para reduzir ")
    .replace(/^revisar /i, "revisões em ")
    .replace(/^manter /i, "ajustes para manter ")
    .replace(/^entender /i, "análises para entender ");
}

function uniqueActions(values: string[], humanizer: (value: string) => string) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const humanized = humanizer(value).trim();
    if (!humanized) continue;
    const key = humanized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(humanized);
  }
  return result;
}

function summarizeNextActions(values: string[]) {
  const actions = uniqueActions(values, humanizeAction);
  const normalized = values.map((value) => normalizeAction(value).toLowerCase());
  const hasRank = normalized.some((item) => item.includes("ad rank") || item.includes("relevância keyword") || item.includes("relevancia keyword"));
  const hasSearchQuality = normalized.some((item) => item.includes("negativas") || item.includes("correspond") || item.includes("keywords com gasto") || item.includes("palavras-chave com gasto"));

  if (hasRank && hasSearchQuality) {
    return "melhorar a presença e a relevância dos anúncios nas buscas, ao mesmo tempo em que reduzimos buscas pouco alinhadas e direcionamos melhor o investimento";
  }

  if (!actions.length) {
    return "acompanhar a qualidade dos acessos e a geração de novos resultados antes de fazer mudanças maiores";
  }
  if (actions.length === 1) return actions[0];

  return `${actions[0]}; além disso, vamos ${actions[1].replace(/^(melhorar|reduzir|revisar|manter|entender|acompanhar) /i, "$1 ")}`;
}

function summarizeExecutedOptimizations(values: string[]) {
  const actions = uniqueActions(values, humanizeOptimization).slice(0, 2);
  if (!actions.length) return "";
  if (actions.length === 1) return actions[0];
  return `${actions[0]} e ${actions[1]}`;
}

function hasSearchQualitySignal(values: string[]) {
  return values.some((value) => {
    const item = normalizeAction(value).toLowerCase();
    return (
      item.includes("negativas") ||
      item.includes("correspond") ||
      item.includes("keywords com gasto") ||
      item.includes("palavras-chave com gasto") ||
      item.includes("termos de pesquisa") ||
      item.includes("buscas pouco alinhadas")
    );
  });
}

function diagnosisSentence(input: ClientPerformanceSummaryInput) {
  const clickDelta = pctChange(input.current.clicks, input.previous.clicks);
  const impressionDelta = pctChange(input.current.impressions, input.previous.impressions);
  const conversionDelta = pctChange(input.current.conversions, input.previous.conversions);
  const rankLost = input.auction?.rankLostImpressionShare;
  const budgetLost = input.auction?.budgetLostImpressionShare;

  const rankIsMainBottleneck =
    rankLost != null &&
    rankLost >= 0.25 &&
    (budgetLost == null || rankLost > budgetLost);

  const lowVolume =
    input.current.clicks <= 15 ||
    (clickDelta != null && clickDelta <= -20) ||
    (impressionDelta != null && impressionDelta <= -20);

  const lowResults =
    input.current.conversions === 0 ||
    (conversionDelta != null && conversionDelta <= -20);

  const searchQualityIssue = hasSearchQualitySignal(input.nextActions);

  if (rankIsMainBottleneck && lowVolume && searchQualityIssue && lowResults) {
    return "A análise indica que o principal problema esteve na entrega: a campanha perdeu espaço nas buscas e, com isso, recebeu poucos acessos. Também identificamos buscas menos alinhadas ao serviço, o que reduz a qualidade do tráfego. Com poucas oportunidades qualificadas chegando ao site, a chance de gerar novos resultados também caiu.";
  }

  if (rankIsMainBottleneck && lowVolume && lowResults) {
    return "A análise indica que a campanha perdeu espaço nas buscas e, com isso, recebeu poucos acessos. Com poucas pessoas chegando ao site, tivemos menos oportunidades para transformar essas visitas em novos resultados.";
  }

  if (lowVolume && searchQualityIssue && lowResults) {
    return "O baixo volume de acessos foi um dos principais fatores para o resultado da semana. Além disso, identificamos buscas menos alinhadas ao serviço, o que reduziu a qualidade das oportunidades que chegaram ao site.";
  }

  if (lowVolume && lowResults) {
    return "O volume de acessos ficou baixo e isso reduziu bastante o número de oportunidades disponíveis para gerar novos resultados. Com poucas visitas na semana, a ausência de novas conversões fica mais provável, mesmo sem indicar sozinha um problema definitivo na procura pelo serviço.";
  }

  if (searchQualityIssue && lowResults) {
    return "O volume de acessos não explica sozinho a queda nos resultados. A análise também mostrou buscas menos alinhadas ao serviço, então parte do trabalho agora é melhorar a qualidade de quem chega ao site e aumentar a chance dessas visitas avançarem.";
  }

  if (lowResults) {
    return "Os resultados ficaram abaixo do esperado mesmo com tráfego no período, então a análise aponta espaço para melhorar tanto a qualidade dos acessos quanto o caminho até a conversão. Esse ponto será acompanhado nos próximos dias antes de qualquer conclusão mais forte.";
  }

  return "A análise não mostrou um único fator isolado explicando o desempenho. Por isso, estamos olhando em conjunto para volume de acessos, qualidade das buscas e capacidade da campanha de transformar essas visitas em resultado.";
}

function movementSentence(input: ClientPerformanceSummaryInput) {
  const clickDelta = pctChange(input.current.clicks, input.previous.clicks);
  const cpcDelta = pctChange(input.current.cpc, input.previous.cpc);
  const weekly = isWeeklyWindow(input);
  const comparison = weekly ? "da semana anterior" : "do período anterior";
  const pieces: string[] = [];

  if (clickDelta != null && Math.abs(clickDelta) >= 10) {
    pieces.push(`o volume de acessos ficou ${clickDelta < 0 ? "abaixo" : "acima"} ${comparison}`);
  }
  if (cpcDelta != null && Math.abs(cpcDelta) >= 25) {
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
    return "A expectativa é recuperar aos poucos o volume de acessos mais qualificados e criar melhores condições para os resultados voltarem a aparecer.";
  }
  if (improved) {
    return "A expectativa é manter essa evolução e ver se os resultados ganham mais consistência ao longo dos próximos dias.";
  }
  return "A expectativa é acompanhar como a campanha responde e buscar uma evolução gradual dos resultados ao longo dos próximos dias.";
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

  const executed = summarizeExecutedOptimizations(input.executedOptimizations);
  const diagnosis = diagnosisSentence(input);
  const optimizationLine = executed
    ? `${diagnosis} ${weekly ? "Na semana passada" : "Nesse período"}, também fizemos ${executed}, buscando melhorar a qualidade dos acessos e aproveitar melhor o investimento.`
    : `${diagnosis} Com essa análise, conseguimos definir com mais clareza os ajustes que precisam ser feitos agora.`;

  const nextFocus = summarizeNextActions(input.nextActions);
  const nextLine = weekly
    ? `Esta semana, vamos focar em ${nextFocus}. ${expectationSentence(input)}`
    : `Nos próximos dias, vamos focar em ${nextFocus}. ${expectationSentence(input)}`;

  return `${firstName}, ${resultLine} ${movementSentence(input)}\n\n${optimizationLine}\n\n${nextLine}`;
}

function cleanAiText(value: string) {
  return value
    .replace(/```(?:text|markdown|html)?/gi, "")
    .replace(/```/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim()
    .slice(0, 2200);
}

function hasExcessiveJargon(value: string) {
  return /\b(Ad Rank|Search IS|GAQL|Quality Score|Smart Bidding|criterion|change event|competitividade|ranking)\b/i.test(value);
}

function buildPrompt(input: ClientPerformanceSummaryInput, fallback: string) {
  const current = input.current;
  const previous = input.previous;
  const auction = input.auction;
  const weekly = isWeeklyWindow(input);
  const friendlyNextActions = uniqueActions(input.nextActions, humanizeAction);
  const friendlyExecuted = uniqueActions(input.executedOptimizations, humanizeOptimization);
  const friendlyDiagnosis = diagnosisSentence(input);

  return `Você é responsável pela comunicação de performance da S4X com seus clientes. Escreva uma mensagem de WhatsApp curta, informal, clara e profissional, como se ela fosse enviada na segunda-feira ou no começo da semana.

OBJETIVO
Explicar de forma natural:
1. como foi o resultado da semana passada;
2. por que provavelmente o volume de acessos/resultados ficou baixo ou mudou;
3. o que realmente foi ajustado ou o que a revisão identificou;
4. o que será feito esta semana e o que esperamos observar.

EXPLICAÇÃO DO MOTIVO — OBRIGATÓRIA
- A mensagem NÃO pode apenas dizer que houve menos acessos ou menos resultados; precisa explicar o motivo provável de forma simples.
- Diferencie demanda de mercado de entrega da campanha: não diga que "houve menos procura pelo serviço" apenas porque a campanha teve menos cliques.
- Quando os dados de leilão mostrarem perda maior por ranking/relevância do que por orçamento, explique para a cliente que os anúncios perderam espaço/apareceram menos nas buscas. Não use a palavra "ranking".
- Quando houver sinais de termos de pesquisa pouco alinhados, explique que parte das buscas trouxe acessos menos alinhados ao serviço, reduzindo a qualidade das oportunidades.
- Quando houver poucos acessos, conecte isso à conversão: poucas visitas significam poucas oportunidades de gerar resultado. Não diga que isso garante ou explica 100% das conversões.
- Se os dados não permitirem confirmar uma causa, use linguagem como "a análise indica", "um dos fatores" ou "provavelmente".

CONTEXTO TEMPORAL
- ${weekly ? "O período analisado deve ser chamado de \"semana passada\"." : "O período selecionado não corresponde exatamente a uma semana; use \"período analisado\" quando necessário."}
- Use "semana anterior" na comparação quando o recorte for semanal.
- Use "esta semana" para as ações futuras quando o recorte for semanal.
- Não escreva "para a próxima semana".
- Não repita datas quando estiver falando de semana passada.

TOM E FLUIDEZ
- A mensagem deve parecer escrita por uma pessoa da agência em uma conversa de WhatsApp.
- Pode começar com: "${clientFirstName(input.clientName)}, passando um retorno da semana passada...".
- Use linguagem próxima, simples e objetiva.
- Prefira "acessos" a "cliques" quando ficar mais natural.
- Prefira "resultados registrados pela campanha" a "conversões".
- Use 3 parágrafos curtos, aproximadamente 550 a 950 caracteres no total.
- Não use título, markdown, listas, bullets ou emojis.
- NÃO copie ou cole os nomes das ações um após o outro.
- Resuma as ações em no máximo 2 ideias principais e transforme-as em uma frase natural.
- Evite sequências como "... e reduzir... e concentrar...". Se houver várias ações relacionadas, una-as pelo objetivo comum.
- Evite a palavra "competitividade" para a cliente. Prefira "presença dos anúncios nas buscas", "qualidade dos acessos" ou "relevância dos anúncios".
- Não use "concentrar a verba" de forma solta. Quando fizer sentido, prefira "direcionar melhor o investimento".

PRECISÃO
- Não prometa resultados.
- Não invente nenhuma otimização.
- Só diga que um ajuste foi feito se estiver na lista de otimizações registradas.
- Se a lista estiver vazia, diga naturalmente que a revisão mostrou os pontos de atenção e definiu os ajustes desta semana.
- Separe claramente o que aconteceu na semana passada do que será feito esta semana.
- Não trate conversões do Google Ads como leads ou contatos confirmados.
- Não diga que falta orçamento se a maior perda estiver ligada a ranking/relevância.
- Não exponha ferramentas, histórico da conta, banco, API, IA ou processos internos.
- Não use Ad Rank, Search IS, GAQL, Quality Score, Smart Bidding, criterion, change event, competitividade ou ranking.
- Use no máximo 3 números relevantes.
- Preserve os fatos e não atribua causalidade sem evidência.

CLIENTE: ${input.clientName}
PERÍODO: ${input.period.from} a ${input.period.to} (${input.period.days} dias)
PERÍODO ANTERIOR: ${input.previousPeriod.from} a ${input.previousPeriod.to}

DADOS
Investimento: ${brl(current.cost)} | anterior: ${brl(previous.cost)}
Impressões: ${integer(current.impressions)} | anterior: ${integer(previous.impressions)}
Acessos: ${integer(current.clicks)} | anterior: ${integer(previous.clicks)}
CTR: ${percent(current.ctr, 2)} | anterior: ${percent(previous.ctr, 2)}
CPC: ${brl(current.cpc)} | anterior: ${brl(previous.cpc)}
Resultados registrados: ${integer(current.conversions)} | anterior: ${integer(previous.conversions)}
Taxa de conversão: ${percent(current.cvr, 2)} | anterior: ${percent(previous.cvr, 2)}
CPA: ${brl(current.cpa)} | anterior: ${brl(previous.cpa)}
${auction ? `Participação de impressões: ${auction.searchImpressionShare == null ? "n/d" : percent(auction.searchImpressionShare * 100)} | perda por orçamento: ${auction.budgetLostImpressionShare == null ? "n/d" : percent(auction.budgetLostImpressionShare * 100)} | perda por ranking/relevância: ${auction.rankLostImpressionShare == null ? "n/d" : percent(auction.rankLostImpressionShare * 100)}` : "Dados de leilão: não disponíveis"}

DIAGNÓSTICO EM LINGUAGEM AMIGÁVEL — USE COMO BASE, SEM COPIAR DE FORMA ROBÓTICA
${friendlyDiagnosis}

OTIMIZAÇÕES REGISTRADAS — JÁ EXECUTADAS
${friendlyExecuted.length ? friendlyExecuted.map((item) => `- ${item}`).join("\n") : "Nenhuma alteração estrutural registrada no período. Fale apenas da revisão e do diagnóstico, sem expor esta regra."}

AÇÕES PARA ESTA SEMANA — AINDA NÃO TRATAR COMO EXECUTADAS
${friendlyNextActions.length ? friendlyNextActions.map((item) => `- ${item}`).join("\n") : "- acompanhar desempenho antes de mudanças maiores"}

REFERÊNCIA DE TOM
${fallback}

Entregue somente a mensagem final, natural e fluida, sem acrescentar fatos.`;
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
  if (hasExcessiveJargon(text)) throw new Error("OpenAI retornou linguagem técnica demais para a mensagem da cliente.");
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
  if (hasExcessiveJargon(text)) throw new Error("Gemini retornou linguagem técnica demais para a mensagem da cliente.");
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
