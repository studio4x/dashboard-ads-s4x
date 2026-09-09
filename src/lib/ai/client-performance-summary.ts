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

function resultCountLabel(value: number) {
  const count = Math.round(value);
  return `${integer(value)} ${count === 1 ? "resultado registrado" : "resultados registrados"}`;
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
    return "melhorar a forma como os anúncios aparecem para pessoas que procuram pelo serviço";
  }
  if (lower.includes("negativas") || lower.includes("correspondências") || lower.includes("correspondencias")) {
    return "reduzir pesquisas pouco relacionadas ao serviço";
  }
  if (lower.includes("keywords com gasto") || lower.includes("palavras-chave com gasto")) {
    return "revisar quais pesquisas estão consumindo investimento sem trazer resultado";
  }
  if (lower.includes("eficiência antes de escalar") || lower.includes("eficiencia antes de escalar")) {
    return "melhorar o aproveitamento do investimento antes de aumentar o valor aplicado";
  }
  if (lower.includes("não aumentar orçamento") || lower.includes("nao aumentar orçamento") || lower.includes("nao aumentar orcamento")) {
    return "manter o investimento atual enquanto corrigimos os pontos que estão limitando os resultados";
  }
  if (lower.includes("horários") || lower.includes("horarios")) {
    return "revisar os horários em que os anúncios aparecem e geram acessos";
  }
  if (lower.includes("dispositivo")) {
    return "ver se celular ou computador está trazendo acessos mais adequados";
  }
  if (lower.includes("preservar estrutura") || lower.includes("acumular evidência") || lower.includes("acumular evidencia")) {
    return "aguardar mais dados antes de fazer mudanças maiores";
  }

  return raw
    .replace(/\bAd Rank\b/gi, "forma como os anúncios aparecem nas buscas")
    .replace(/\bkeywords?\b/gi, "pesquisas")
    .replace(/\blanding page\b/gi, "página acessada pelo anúncio")
    .replace(/\bcompetitividade\b/gi, "capacidade dos anúncios de aparecer nas buscas")
    .replace(/\btráfego\b/gi, "acessos")
    .replace(/\bconversões?\b/gi, "resultados");
}

function humanizeOptimization(value: string) {
  const action = humanizeAction(value);
  return action
    .replace(/^melhorar /i, "melhorias para ")
    .replace(/^reduzir /i, "ajustes para reduzir ")
    .replace(/^revisar /i, "revisões para ")
    .replace(/^manter /i, "ajustes para manter ")
    .replace(/^ver /i, "análises para entender ")
    .replace(/^aguardar /i, "acompanhamento para aguardar ");
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
    return "ajustar as pesquisas em que os anúncios aparecem e melhorar a forma como eles são apresentados, buscando reduzir acessos pouco relacionados ao serviço";
  }

  if (!actions.length) {
    return "acompanhar os acessos gerados pelos anúncios e os resultados registrados antes de fazer mudanças maiores";
  }
  if (actions.length === 1) return actions[0];

  return `${actions[0]}; também vamos ${actions[1]}`;
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
    return "O principal ponto que identificamos é que os anúncios apareceram menos para pessoas que estavam procurando por serviços como o seu. Além disso, algumas das pesquisas que acionaram os anúncios não estavam tão alinhadas ao serviço oferecido. Com poucas pessoas acessando a partir dos anúncios, tivemos menos chances de gerar novos resultados.";
  }

  if (rankIsMainBottleneck && lowVolume && lowResults) {
    return "O principal ponto que identificamos é que os anúncios apareceram menos para pessoas que estavam procurando por serviços como o seu. Com menos pessoas acessando a partir dos anúncios, tivemos menos chances de gerar novos resultados.";
  }

  if (lowVolume && searchQualityIssue && lowResults) {
    return "Um dos principais pontos foi o baixo número de acessos gerados pelos anúncios. Também identificamos algumas pesquisas pouco relacionadas ao serviço, o que pode fazer parte do investimento ser usado em buscas menos alinhadas ao atendimento oferecido.";
  }

  if (lowVolume && lowResults) {
    return "O principal ponto foi o baixo número de acessos gerados pelos anúncios. Com poucas pessoas acessando a partir deles, tivemos menos oportunidades de gerar novos resultados. Isso, por si só, não significa que tenha havido menos procura pelo serviço.";
  }

  if (searchQualityIssue && lowResults) {
    return "Mesmo com acessos no período, parte das pesquisas que acionaram os anúncios estava menos alinhada ao serviço. Isso pode reduzir a chance de esses acessos se transformarem em resultados, por isso esse é um dos pontos que precisa ser corrigido agora.";
  }

  if (lowResults) {
    return "Os anúncios geraram acessos, mas poucos deles avançaram para um resultado registrado pela campanha. Os dados disponíveis ainda não permitem apontar uma única causa, então vamos corrigir os pontos mais claros e observar a resposta nos próximos dias.";
  }

  return "Não encontramos um único motivo isolado para o desempenho. O cenário precisa ser entendido em conjunto: quantas pessoas viram e acessaram os anúncios, que tipo de pesquisa acionou esses anúncios e quantos resultados foram registrados.";
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
    pieces.push(`o custo de cada acesso ficou ${cpcDelta > 0 ? "mais alto" : "mais baixo"}`);
  }

  if (!pieces.length) {
    return weekly
      ? "De forma geral, os números ficaram próximos aos da semana anterior."
      : "De forma geral, os números ficaram próximos aos do período anterior.";
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
    return "A ideia agora é melhorar primeiro a qualidade e o volume desses acessos e, a partir disso, aumentar novamente as chances de novos resultados aparecerem.";
  }
  if (improved) {
    return "A ideia agora é preservar o que funcionou e verificar se essa melhora continua nos próximos dias.";
  }
  return "A ideia agora é fazer ajustes pontuais e observar se eles ajudam a melhorar gradualmente os resultados.";
}

export function buildAutomaticClientPerformanceSummary(input: ClientPerformanceSummaryInput) {
  const firstName = clientFirstName(input.clientName);
  const weekly = isWeeklyWindow(input);
  const periodLabel = `${formatDate(input.period.from)} a ${formatDate(input.period.to)}`;

  const resultLine = weekly
    ? input.current.conversions === 0
      ? `passando um retorno da semana passada: tivemos ${brl(input.current.cost)} investidos nos anúncios e ${integer(input.current.clicks)} acessos gerados por eles, mas sem novos resultados registrados pela campanha.`
      : `passando um retorno da semana passada: tivemos ${brl(input.current.cost)} investidos nos anúncios, ${integer(input.current.clicks)} acessos gerados por eles e ${resultCountLabel(input.current.conversions)} pela campanha.`
    : input.current.conversions === 0
      ? `no período de ${periodLabel}, tivemos ${brl(input.current.cost)} investidos nos anúncios e ${integer(input.current.clicks)} acessos gerados por eles, mas sem novos resultados registrados pela campanha.`
      : `no período de ${periodLabel}, tivemos ${brl(input.current.cost)} investidos nos anúncios, ${integer(input.current.clicks)} acessos gerados por eles e ${resultCountLabel(input.current.conversions)} pela campanha.`;

  const executed = summarizeExecutedOptimizations(input.executedOptimizations);
  const diagnosis = diagnosisSentence(input);
  const diagnosisLine = executed
    ? `${diagnosis} ${weekly ? "Na semana passada" : "Nesse período"}, também fizemos ${executed}.`
    : diagnosis;

  const nextFocus = summarizeNextActions(input.nextActions);
  const actionLine = weekly
    ? `Esta semana, vamos ${nextFocus}.`
    : `Nos próximos dias, vamos ${nextFocus}.`;

  return `${firstName}, ${resultLine} ${movementSentence(input)}\n\n${diagnosisLine}\n\n${actionLine}\n\n${expectationSentence(input)}`;
}

function cleanAiText(value: string) {
  return value
    .replace(/```(?:text|markdown|html)?/gi, "")
    .replace(/```/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim()
    .slice(0, 2400);
}

function hasExcessiveJargon(value: string) {
  return /\b(Ad Rank|Search IS|GAQL|Quality Score|Smart Bidding|criterion|change event|competitividade|ranking|tráfego|entrega|funil|convers(?:ão|ões)|CTR|CPC|CPA|ROAS|impressões|segmentação|otimização|leads?|palavras?-chave)\b/i.test(value);
}

function buildPrompt(input: ClientPerformanceSummaryInput, fallback: string) {
  const current = input.current;
  const previous = input.previous;
  const auction = input.auction;
  const weekly = isWeeklyWindow(input);
  const friendlyNextActions = uniqueActions(input.nextActions, humanizeAction);
  const friendlyExecuted = uniqueActions(input.executedOptimizations, humanizeOptimization);
  const friendlyDiagnosis = diagnosisSentence(input);

  return `Você escreve a mensagem que a S4X envia diretamente ao cliente após analisar a semana de Google Ads.

PÚBLICO
Imagine que o destinatário é um profissional excelente na própria área, mas não entende nada de mídia paga. Ele não deve precisar conhecer Google Ads para entender a mensagem. Escreva como uma pessoa da agência explicaria por WhatsApp, com tranquilidade, clareza e segurança.

OBJETIVO DA MENSAGEM
Ao terminar a leitura, o cliente precisa entender sem esforço:
1. o que aconteceu na semana passada;
2. por que isso provavelmente aconteceu;
3. o que a S4X vai fazer esta semana;
4. o que esperamos melhorar com esses ajustes, sem prometer resultado.

ESTRUTURA OBRIGATÓRIA — 4 PARÁGRAFOS CURTOS
PARÁGRAFO 1 — RESULTADO
- Comece de forma natural, por exemplo: "${clientFirstName(input.clientName)}, passando um retorno da semana passada...".
- Informe somente os números realmente úteis para o cliente: investimento, acessos gerados pelos anúncios e resultados registrados.
- Compare com a semana anterior apenas quando a diferença for relevante.
- Não transforme cliques em "visitas ao site". Use "acessos gerados pelos anúncios" quando não houver dado de sessão/visita.

PARÁGRAFO 2 — O QUE ACONTECEU E POR QUÊ
- Explique o diagnóstico em linguagem concreta, como se estivesse respondendo à pergunta: "Tá, mas o que aconteceu com meus anúncios?".
- Não diga apenas "houve problema de entrega", "queda de tráfego" ou "perda de relevância". Traduza isso para o que a pessoa consegue visualizar.
- Quando a perda por classificação/relevância for o principal gargalo, prefira frases como: "os anúncios apareceram menos para pessoas que estavam procurando por serviços como o seu".
- Quando houver buscas pouco alinhadas, prefira: "algumas das pesquisas que acionaram os anúncios não estavam tão alinhadas ao serviço oferecido".
- Quando houver poucos acessos, explique de forma simples que, com poucas pessoas acessando a partir dos anúncios, existiram menos chances de gerar novos resultados.
- Não diga que houve menos procura pelo serviço apenas porque houve menos acessos.
- Não diga "pessoas qualificadas", "pessoas certas" ou "oportunidades qualificadas" sem dados externos que comprovem qualidade dos contatos.
- Se a causa não puder ser confirmada, use "o principal ponto que identificamos", "um dos fatores" ou "os dados indicam".

PARÁGRAFO 3 — O QUE VAMOS FAZER
- Diga exatamente o que será trabalhado nesta semana, mas traduza a ação técnica para algo que o cliente entenda.
- Exemplo: em vez de "negativar termos e ajustar correspondência", diga "ajustar as pesquisas em que os anúncios aparecem e reduzir pesquisas pouco relacionadas ao serviço".
- Em vez de "melhorar Ad Rank/relevância", diga "melhorar a forma como os anúncios são apresentados para pessoas que procuram pelo serviço".
- Resuma em no máximo 2 frentes principais.
- Só trate uma ação como já realizada se ela estiver em OTIMIZAÇÕES REGISTRADAS. As ações de AÇÕES PARA ESTA SEMANA ainda são futuras.

PARÁGRAFO 4 — EXPECTATIVA
- Feche explicando o objetivo dos ajustes em uma frase humana.
- Use lógica semelhante a: "A ideia agora é melhorar primeiro a qualidade e o volume desses acessos e, a partir disso, aumentar as chances de novos resultados aparecerem.".
- Não prometa contatos, vendas, agendamentos ou resultado garantido.

LINGUAGEM
- Tom informal, humano, calmo, profissional e seguro.
- O texto deve soar como uma explicação, não como relatório de marketing.
- Use frases curtas e concretas.
- Aproximadamente 650 a 1.050 caracteres no total.
- Não use título, markdown, listas, bullets ou emojis na mensagem final.
- Use no máximo 3 números relevantes.
- Evite repetições e frases defensivas.
- Não exponha banco, API, IA, tracking interno, histórico técnico ou processos internos.

NÃO USAR NA MENSAGEM FINAL
Evite jargões e expressões de mídia paga como: tráfego, entrega, conversão, CTR, CPC, CPA, ROAS, funil, segmentação, otimização, lead, palavra-chave, Ad Rank, Search IS, Quality Score, Smart Bidding, ranking, competitividade, "qualidade do tráfego", "intenções com maior potencial", "oportunidades qualificadas" e "campanha perdeu espaço".
Quando algum desses conceitos for necessário, explique o efeito prático em palavras comuns.

PRECISÃO
- Não invente causas, ações ou resultados.
- Não trate resultados registrados pelo Google Ads como contatos, leads, pacientes, vendas ou agendamentos confirmados.
- Se não houver fonte externa de qualidade, não afirme que os acessos eram qualificados ou desqualificados; diga apenas que determinadas pesquisas estavam mais ou menos alinhadas ao serviço.
- Não diga que o problema é orçamento quando os dados indicarem que a principal perda ocorreu porque os anúncios apareceram menos por classificação/relevância.
- Separe claramente passado, diagnóstico, ação futura e expectativa.

CONTEXTO TEMPORAL
- ${weekly ? "Chame o período analisado de \"semana passada\" e o período de comparação de \"semana anterior\"." : "O período selecionado não corresponde exatamente a uma semana; use \"período analisado\" e \"período anterior\" quando necessário."}
- ${weekly ? "Use \"esta semana\" para as ações futuras." : "Use \"nos próximos dias\" para as ações futuras."}
- Não escreva "para a próxima semana" quando o período for semanal.

CLIENTE: ${input.clientName}
PERÍODO: ${input.period.from} a ${input.period.to} (${input.period.days} dias)
PERÍODO ANTERIOR: ${input.previousPeriod.from} a ${input.previousPeriod.to}

DADOS DISPONÍVEIS PARA RACIOCÍNIO — NÃO COPIE TODOS PARA A MENSAGEM
Investimento: ${brl(current.cost)} | anterior: ${brl(previous.cost)}
Impressões: ${integer(current.impressions)} | anterior: ${integer(previous.impressions)}
Acessos: ${integer(current.clicks)} | anterior: ${integer(previous.clicks)}
CTR: ${percent(current.ctr, 2)} | anterior: ${percent(previous.ctr, 2)}
CPC: ${brl(current.cpc)} | anterior: ${brl(previous.cpc)}
Resultados registrados: ${integer(current.conversions)} | anterior: ${integer(previous.conversions)}
Taxa de conversão: ${percent(current.cvr, 2)} | anterior: ${percent(previous.cvr, 2)}
CPA: ${brl(current.cpa)} | anterior: ${brl(previous.cpa)}
${auction ? `Participação de impressões: ${auction.searchImpressionShare == null ? "n/d" : percent(auction.searchImpressionShare * 100)} | perda por orçamento: ${auction.budgetLostImpressionShare == null ? "n/d" : percent(auction.budgetLostImpressionShare * 100)} | perda por classificação/relevância: ${auction.rankLostImpressionShare == null ? "n/d" : percent(auction.rankLostImpressionShare * 100)}` : "Dados de leilão: não disponíveis"}

DIAGNÓSTICO JÁ TRADUZIDO PARA LINGUAGEM DE CLIENTE — USE COMO BASE
${friendlyDiagnosis}

OTIMIZAÇÕES REGISTRADAS — JÁ EXECUTADAS
${friendlyExecuted.length ? friendlyExecuted.map((item) => `- ${item}`).join("\n") : "Nenhuma alteração registrada no período. Não diga que algo já foi ajustado."}

AÇÕES PARA ESTA SEMANA — AINDA NÃO FORAM EXECUTADAS
${friendlyNextActions.length ? friendlyNextActions.map((item) => `- ${item}`).join("\n") : "- acompanhar os acessos e resultados antes de mudanças maiores"}

REFERÊNCIA DE TOM E ESTRUTURA
${fallback}

TESTE FINAL ANTES DE RESPONDER
Imagine que o cliente pergunte: "Eu não entendo de anúncios. Depois de ler isso, eu consigo explicar para outra pessoa o que aconteceu e o que vocês vão fazer?". Se a resposta não for claramente sim, simplifique mais.

Entregue somente a mensagem final em 4 parágrafos, sem acrescentar fatos.`;
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
      generationConfig: { temperature: 0.35, maxOutputTokens: 700 },
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
