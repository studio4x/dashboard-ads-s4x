"use client";

import { useLayoutEffect } from "react";

const ENUM_TRANSLATIONS: Array<[string, string]> = [
  ["MAXIMIZE_CONVERSION_VALUE", "Maximizar valor das conversões"],
  ["TARGET_IMPRESSION_SHARE", "Parcela de impressões desejada"],
  ["RESPONSIVE_SEARCH_AD", "Anúncio responsivo de pesquisa"],
  ["EXPANDED_DYNAMIC_SEARCH_AD", "Anúncio dinâmico expandido de pesquisa"],
  ["EXPANDED_TEXT_AD", "Anúncio de texto expandido"],
  ["PERFORMANCE_MAX", "Performance Max"],
  ["MAXIMIZE_CONVERSIONS", "Maximizar conversões"],
  ["TARGET_SPEND", "Investimento desejado"],
  ["TARGET_CPA", "CPA desejado"],
  ["TARGET_ROAS", "ROAS desejado"],
  ["MANUAL_CPC", "CPC manual"],
  ["MANUAL_CPM", "CPM manual"],
  ["MANUAL_CPV", "CPV manual"],
  ["ENHANCED_CPC", "CPC otimizado"],
  ["AD_GROUP_CRITERION", "Critério do grupo de anúncios"],
  ["CAMPAIGN_CRITERION", "Critério da campanha"],
  ["AD_GROUP_ASSET", "Recurso do grupo de anúncios"],
  ["CAMPAIGN_ASSET", "Recurso da campanha"],
  ["CUSTOMER_ASSET", "Recurso da conta"],
  ["CAMPAIGN_BUDGET", "Orçamento da campanha"],
  ["AD_GROUP_AD", "Anúncio do grupo de anúncios"],
  ["BIDDING_STRATEGY", "Estratégia de lances"],
  ["AD_GROUP", "Grupo de anúncios"],
  ["CAMPAIGN", "Campanha"],
  ["CONNECTED_TV", "TV conectada"],
  ["SEARCH_PARTNERS", "Parceiros de pesquisa"],
  ["GOOGLE_SEARCH", "Pesquisa Google"],
  ["YOUTUBE_SEARCH", "Pesquisa no YouTube"],
  ["YOUTUBE_WATCH", "Vídeos do YouTube"],
  ["NEAR_PHRASE", "Variação próxima da frase"],
  ["NEAR_EXACT", "Variação próxima da exata"],
  ["ABOVE_AVERAGE", "Acima da média"],
  ["BELOW_AVERAGE", "Abaixo da média"],
  ["AVERAGE", "Na média"],
  ["RESPONSIVE_DISPLAY_AD", "Anúncio responsivo de display"],
  ["VIDEO_AD", "Anúncio em vídeo"],
  ["IMAGE_AD", "Anúncio gráfico"],
  ["TEXT_AD", "Anúncio de texto"],
  ["APP_AD", "Anúncio de aplicativo"],
  ["SHOPPING_PRODUCT_AD", "Anúncio de produto do Shopping"],
  ["SHOPPING_SMART_AD", "Anúncio inteligente do Shopping"],
  ["MOBILE", "Celular"],
  ["DESKTOP", "Computador"],
  ["TABLET", "Tablet"],
  ["EXACT", "Exata"],
  ["PHRASE", "Frase"],
  ["BROAD", "Ampla"],
  ["ENABLED", "Ativo"],
  ["PAUSED", "Pausado"],
  ["REMOVED", "Removido"],
  ["ELIGIBLE", "Qualificado"],
  ["LIMITED", "Limitado"],
  ["PENDING", "Pendente"],
  ["ACTIVE", "Ativo"],
  ["INACTIVE", "Inativo"],
  ["UNKNOWN", "Desconhecido"],
  ["UNSPECIFIED", "Não especificado"],
  ["CREATE", "Criação"],
  ["UPDATE", "Atualização"],
  ["REMOVE", "Remoção"],
  ["ASSET", "Recurso"],
  ["CONTENT", "Rede de Display"],
];

const TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/Análise de Performance/gi, "Análise de desempenho"],
  [/\bPerformance\b/gi, "Desempenho"],
  [/\bQuality Score\b/gi, "Índice de qualidade"],
  [/\bAd Rank\b/gi, "Classificação do anúncio"],
  [/\bLost IS Rank\b/gi, "Perda de impressões por classificação"],
  [/\bSearch IS\b/gi, "Parcela de impressões na pesquisa"],
  [/\bChange Events\b/gi, "Histórico de alterações"],
  [/\bLanding pages\b/gi, "Páginas de destino"],
  [/\blanding page\b/gi, "página de destino"],
  [/\bKeywords\b/gi, "Palavras-chave"],
  [/\bKeyword\b/gi, "Palavra-chave"],
  [/\branking\b/gi, "classificação"],
  [/\bleads\b/gi, "contatos"],
  [/\bGoogle Ads API\b/gi, "API do Google Ads"],
  [/\bCRM\/planilha\b/gi, "sistema de leads/planilha"],
  [/\bCRM\b/g, "sistema de leads (CRM)"],
  [/\bADMIN\b/g, "ADMINISTRADOR"],
  [/\bSnapshot\b/gi, "Estado"],
  [/\bcampaign_daily\b/g, "dados diários de campanha"],
  [/\bkeyword_daily\b/g, "dados diários de palavras-chave"],
  [/\bsearch_terms_daily\b/g, "dados diários de termos de pesquisa"],
  [/\bvs\. período anterior\b/gi, "comparado ao período anterior"],
  [/\bAbrir no dashboard\b/gi, "Abrir no painel"],
  [/\bdashboard\b/gi, "painel"],
  [/\bAD (?=\d)/g, "Anúncio "],
  [/\bstatus n\/d\b/gi, "status não disponível"],
  [/\bn\/d\b/gi, "não disponível"],
];

function translateText(value: string) {
  let result = value;

  for (const [source, target] of ENUM_TRANSLATIONS) {
    if (result.includes(source)) result = result.split(source).join(target);
  }

  for (const [pattern, target] of TEXT_REPLACEMENTS) {
    result = result.replace(pattern, target);
  }

  return result;
}

function translateElement(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    if (parent && !["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA"].includes(parent.tagName)) {
      const current = node.nodeValue || "";
      const translated = translateText(current);
      if (translated !== current) node.nodeValue = translated;
    }
    node = walker.nextNode();
  }

  root.querySelectorAll<HTMLElement>("[title], [aria-label], [placeholder], [alt]").forEach((element) => {
    for (const attribute of ["title", "aria-label", "placeholder", "alt"] as const) {
      const current = element.getAttribute(attribute);
      if (!current) continue;
      const translated = translateText(current);
      if (translated !== current) element.setAttribute(attribute, translated);
    }
  });
}

export function GoogleAdsPerformancePortuguese() {
  useLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-google-ads-performance-page='true']");
    if (!root) return;

    let scheduled = false;
    const apply = () => {
      scheduled = false;
      translateElement(root);
    };

    translateElement(root);

    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(apply);
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["title", "aria-label", "placeholder", "alt"] });

    return () => observer.disconnect();
  }, []);

  return null;
}
