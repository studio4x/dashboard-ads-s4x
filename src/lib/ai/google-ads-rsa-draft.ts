type RsaDraftInput = {
  objective: string;
  keywords: string[];
  currentAd: { headlines: string[]; descriptions: string[]; finalUrls: string[] };
  evidence: Array<{ text: string; qualityScore: number | null; clicks: number; conversions: number }>;
  landingPage?: string;
};

export type RsaDraftResult = {
  headlines: string[];
  descriptions: string[];
  provider: "openai" | "gemini" | "automatic";
  generatedWithAi: boolean;
  fallbackUsed: boolean;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function clean(value: unknown, max: number) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function unique(values: unknown, maxLength: number, maxItems: number) {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const item = clean(value, maxLength);
    const key = item.toLocaleLowerCase("pt-BR");
    if (!item || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length >= maxItems) break;
  }
  return result;
}

function titleCase(value: string) {
  return value.toLocaleLowerCase("pt-BR").replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase("pt-BR"));
}

function fallbackDraft(input: RsaDraftInput) {
  const keywordIdeas = input.keywords.map((item) => titleCase(clean(item, 30)));
  const headlines = unique([
    ...keywordIdeas,
    "Atendimento Especializado",
    "Fale Com Nossa Equipe",
    "Solicite Mais Informações",
    "Atendimento Com Cuidado",
    ...input.currentAd.headlines,
  ], 30, 15);
  const descriptions = unique([
    "Conheça nossas soluções e fale com a equipe para receber mais informações.",
    "Atendimento profissional para entender sua necessidade. Entre em contato.",
    ...input.currentAd.descriptions,
  ], 90, 4);
  return { headlines: headlines.slice(0, Math.max(3, headlines.length)), descriptions: descriptions.slice(0, Math.max(2, descriptions.length)) };
}

function sameList(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value.toLocaleLowerCase("pt-BR") === right[index]?.toLocaleLowerCase("pt-BR"));
}

function extractJson(value: string) {
  const fenced = value.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("A IA não retornou um rascunho estruturado.");
  return JSON.parse(fenced.slice(start, end + 1)) as Record<string, unknown>;
}

function normalizeDraft(value: unknown, fallback: ReturnType<typeof fallbackDraft>, currentAd: RsaDraftInput["currentAd"]) {
  const draft = record(value);
  const headlines = unique(draft.headlines, 30, 15);
  const descriptions = unique(draft.descriptions, 90, 4);
  const normalized = {
    headlines: headlines.length >= 3 ? headlines : fallback.headlines,
    descriptions: descriptions.length >= 2 ? descriptions : fallback.descriptions,
  };
  return sameList(normalized.headlines, currentAd.headlines) && sameList(normalized.descriptions, currentAd.descriptions) ? fallback : normalized;
}

function prompt(input: RsaDraftInput) {
  return `Crie um rascunho editável de anúncio responsivo de pesquisa em português brasileiro.

Regras obrigatórias:
- Retorne somente JSON válido: {"headlines":[...],"descriptions":[...]}.
- Gere entre 8 e 12 títulos únicos, cada um com no máximo 30 caracteres.
- Gere entre 2 e 4 descrições únicas, cada uma com no máximo 90 caracteres.
- Preserve fatos; não invente preço, desconto, certificação, localização ou promessa de resultado.
- Use as palavras-chave e evidências apenas como contexto.
- Melhore variedade, clareza e alinhamento com a intenção de busca.
- Não inclua URLs no texto.

Objetivo: ${clean(input.objective, 500)}
Palavras-chave: ${JSON.stringify(input.keywords.slice(0, 20))}
Anúncio atual: ${JSON.stringify(input.currentAd)}
Evidências do período: ${JSON.stringify(input.evidence.slice(0, 20))}
Página de destino: ${clean(input.landingPage, 500) || "não informada"}`;
}

async function openAiDraft(input: RsaDraftInput, apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: process.env.OPENAI_REPORT_MODEL || "gpt-4.1-mini", input: prompt(input) }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}`);
  const json = await response.json() as Record<string, unknown>;
  return extractJson(String(json.output_text || ""));
}

async function geminiDraft(input: RsaDraftInput, apiKey: string) {
  const model = process.env.GEMINI_REPORT_MODEL || "gemini-2.0-flash-lite";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt(input) }] }], generationConfig: { temperature: 0.35, maxOutputTokens: 1000, responseMimeType: "application/json" } }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
  const json = await response.json() as Record<string, unknown>;
  const candidates = Array.isArray(json.candidates) ? json.candidates : [];
  const content = record(record(candidates[0]).content);
  const parts = Array.isArray(content.parts) ? content.parts : [];
  return extractJson(String(record(parts[0]).text || ""));
}

export async function generateGoogleAdsRsaDraft(input: RsaDraftInput): Promise<RsaDraftResult> {
  const fallback = fallbackDraft(input);
  const openAiKey = String(process.env.OPENAI_API_KEY || "").trim();
  const geminiKey = String(process.env.GEMINI_API_KEY || "").trim();
  if (openAiKey) {
    try {
      const draft = normalizeDraft(await openAiDraft(input, openAiKey), fallback, input.currentAd);
      const fallbackUsed = sameList(draft.headlines, fallback.headlines) && sameList(draft.descriptions, fallback.descriptions);
      return { ...draft, provider: fallbackUsed ? "automatic" : "openai", generatedWithAi: !fallbackUsed, fallbackUsed };
    } catch { /* tenta o provedor secundário */ }
  }
  if (geminiKey) {
    try {
      const draft = normalizeDraft(await geminiDraft(input, geminiKey), fallback, input.currentAd);
      const fallbackUsed = sameList(draft.headlines, fallback.headlines) && sameList(draft.descriptions, fallback.descriptions);
      return { ...draft, provider: fallbackUsed ? "automatic" : "gemini", generatedWithAi: !fallbackUsed, fallbackUsed };
    } catch { /* mantém um rascunho local e editável */ }
  }
  return { ...fallback, provider: "automatic", generatedWithAi: false, fallbackUsed: true };
}
