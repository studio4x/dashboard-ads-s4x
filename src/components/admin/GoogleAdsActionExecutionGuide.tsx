"use client";

import { useEffect } from "react";

type Guide = {
  where: string;
  steps: string[];
  finish: string;
  avoid?: string;
};

function normalize(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function findActionPlan() {
  return Array.from(document.querySelectorAll<HTMLElement>("section.card")).find((section) => {
    return normalize(section.querySelector("h2")?.textContent || "") === "plano de acao priorizado";
  }) || null;
}

function getCards(section: HTMLElement) {
  const grid = section.children.item(1) as HTMLElement | null;
  if (!grid) return [];
  return Array.from(grid.children).filter((item): item is HTMLElement => item instanceof HTMLElement);
}

function getTitle(card: HTMLElement) {
  const header = card.firstElementChild as HTMLElement | null;
  return header?.querySelector("strong")?.textContent?.trim() || "";
}

function guideForTitle(title: string): Guide {
  const value = normalize(title);

  if (value.includes("recuperar eficiencia antes de escalar")) {
    return {
      where: "Google Ads → Campanhas → selecione a campanha → Termos de pesquisa, Palavras-chave, Anúncios e Ações de conversão.",
      steps: [
        "Não aumente o orçamento enquanto a eficiência estiver abaixo do período anterior. Mantenha a verba atual para que a próxima leitura não seja contaminada por uma mudança simultânea de orçamento.",
        "Abra Termos de pesquisa e ordene por custo. Comece pelos termos que consumiram mais verba e não geraram conversão. Separe em três grupos: intenção claramente válida, intenção duvidosa e intenção claramente inadequada.",
        "Abra Palavras-chave e revise primeiro as que aparecem no campo Motivo deste card. Para cada uma, confira correspondência, cliques, custo, conversões e quais termos ela acionou antes de decidir manter, restringir ou pausar.",
        "Confira Ações de conversão para garantir que a queda está acontecendo na ação principal que realmente representa o objetivo da campanha. Não use conversões secundárias como evidência de recuperação.",
        "Compare os anúncios ativos: mantenha o anúncio que melhor cobre a intenção principal da busca e revise títulos/descrições que estejam genéricos, pouco específicos ou desalinhados com a página de destino.",
        "Faça um conjunto pequeno de mudanças por vez. Priorize primeiro termos/negativas e relevância; só depois avalie orçamento ou mudanças maiores de estratégia de lances.",
        "Registre no campo Observação deste card exatamente o que foi alterado e marque Em andamento. Isso cria a referência para validar a resposta da campanha depois.",
      ],
      finish: "Considere esta ação concluída quando as correções prioritárias tiverem sido aplicadas. Marque como Validado apenas depois de comparar um novo período equivalente e verificar recuperação de conversões/CVR e redução do CPA, sem depender apenas de mais investimento.",
      avoid: "Evite aumentar orçamento, trocar estratégia de lances, anúncios, palavras-chave e segmentações ao mesmo tempo. Muitas alterações simultâneas dificultam identificar o que realmente melhorou ou piorou o resultado.",
    };
  }

  if (value.includes("atacar ad rank") || value.includes("atacar classificacao do anuncio")) {
    return {
      where: "Google Ads → Campanhas → Grupos de anúncios → Palavras-chave de pesquisa. Adicione as colunas Índice de qualidade, CTR esperado, Relevância do anúncio e Experiência na página de destino.",
      steps: [
        "Comece pelas palavras-chave com maior gasto e Índice de qualidade 4 ou menor. Não tente corrigir todas de uma vez; priorize as que realmente recebem impressões e cliques.",
        "Para cada palavra-chave prioritária, confira os termos de pesquisa que ela acionou. Se a palavra estiver trazendo intenções diferentes, restrinja a correspondência ou separe essas intenções em grupos de anúncios distintos.",
        "Garanta que o grupo de anúncios tenha uma única intenção principal. Se um mesmo grupo mistura, por exemplo, psicoterapia, ansiedade, bariátrica e localização, separe quando houver volume suficiente para que anúncio e página possam responder melhor a cada intenção.",
        "Revise o anúncio responsivo do grupo: inclua a intenção principal nos títulos, mencione o serviço de forma direta e use a localização quando ela for relevante. Evite repetir variações quase idênticas apenas para preencher títulos.",
        "Compare anúncio e página de destino. A promessa do anúncio precisa estar claramente presente no primeiro bloco da página. Se a busca é específica e a página responde de forma genérica, melhore o texto da página ou leve o tráfego para uma página mais aderente.",
        "Revise extensões/recursos ativos: links de site, frases de destaque e outros recursos devem reforçar diferenciais reais e aumentar a utilidade do anúncio, não apenas ocupar espaço.",
        "Depois das mudanças de relevância, mantenha o orçamento estável durante a primeira validação. O objetivo é observar se a campanha recupera participação sem mascarar o efeito com mais verba.",
      ],
      finish: "Valide quando a perda de impressões por classificação cair de forma consistente e houver melhora conjunta de participação de impressões, CTR e/ou CPC. Um único dia melhor não é suficiente para encerrar a ação.",
      avoid: "Não tente resolver perda por classificação simplesmente aumentando orçamento. Orçamento e classificação são gargalos diferentes; se a perda por orçamento é baixa, mais verba não corrige relevância.",
    };
  }

  if (value.includes("revisar keywords") || value.includes("revisar palavras-chave com gasto")) {
    return {
      where: "Google Ads → Campanhas → Grupos de anúncios → Palavras-chave de pesquisa. Use também a aba Termos de pesquisa para entender o que cada palavra-chave realmente acionou.",
      steps: [
        "Comece exatamente pelas palavras-chave citadas no campo Motivo deste card. Elas foram priorizadas porque concentraram gasto sem conversão no período analisado.",
        "Antes de pausar qualquer palavra-chave, confira a planilha/CRM de leads reais para verificar se houve contato que não apareceu como conversão na plataforma. Se houver divergência, investigue rastreamento antes de cortar tráfego.",
        "Abra cada palavra-chave e identifique a correspondência atual. Em correspondência ampla, verifique se ela está acionando buscas excessivamente abertas; em frase, veja quais complementos estão desviando intenção; em exata, avalie se o problema é custo, anúncio ou pós-clique.",
        "Analise os termos acionados por essa palavra. Se a maior parte do gasto vem de termos inadequados, priorize negativas ou restrição de correspondência antes de pausar a palavra inteira.",
        "Se a palavra tem intenção válida, mas gasto alto sem resultado e volume suficiente, mantenha-a sob revisão apenas se houver uma hipótese concreta de melhoria em anúncio/página. Caso contrário, reduza sua exposição ou pause de forma controlada.",
        "Se a palavra já gerou leads/conversões em períodos anteriores, não a trate igual a uma palavra que nunca gerou resultado. Compare pelo menos 30 a 90 dias antes de uma pausa definitiva quando houver histórico disponível.",
        "Após cada decisão, registre na Observação: palavra-chave, correspondência, ação tomada e motivo. Exemplo: ‘psicólogo online — frase — mantida; negativados termos de emprego e curso’.",
      ],
      finish: "Conclua quando todas as palavras citadas tiverem uma decisão explícita: manter, restringir, otimizar ou pausar. Valide depois comparando gasto sem conversão, volume de leads e CPA no mesmo intervalo de dias.",
      avoid: "Não pause palavras-chave apenas porque tiveram zero conversões em uma semana com poucos cliques. Use custo, volume, histórico, intenção e leads reais em conjunto.",
    };
  }

  if (value.includes("revisar negativas e correspondencias")) {
    return {
      where: "Google Ads → Campanhas → Insights e relatórios/Termos de pesquisa → Palavras-chave negativas e Palavras-chave de pesquisa.",
      steps: [
        "Use os termos citados no campo Motivo como primeira fila de revisão. Leia cada busca exatamente como o usuário pesquisou e pergunte: essa pessoa poderia realisticamente contratar o serviço anunciado?",
        "Marque como negativa apenas buscas claramente incompatíveis: emprego, curso, gratuito, significado, plataforma concorrente sem interesse comercial, preço incompatível com a oferta, localização não atendida ou outro serviço diferente.",
        "Escolha o tipo de negativa com cuidado. Use negativa exata quando apenas aquela consulta específica é inadequada; use negativa de frase somente quando qualquer busca contendo aquela expressão também seria indesejada.",
        "Evite negativar palavras genéricas importantes isoladamente. Exemplo: negativar ‘online’ ou ‘psicólogo’ como frase pode bloquear buscas boas junto com as ruins.",
        "Abra a coluna de palavra-chave correspondente ao termo. Se vários termos ruins vêm da mesma palavra-chave ampla, avalie migrá-la para frase/exata ou dividir a intenção em uma palavra mais específica.",
        "Procure padrões, não apenas consultas individuais. Se aparecem várias cidades fora da área atendida, corrija também a segmentação geográfica; se aparecem buscas de baixo preço, revise mensagem/oferta além das negativas.",
        "Depois da limpeza, não faça uma lista gigantesca de negativas de uma vez sem revisar conflitos. Confirme se nenhuma negativa bloqueia as principais palavras e termos que já geraram resultado.",
      ],
      finish: "Considere concluído quando os termos prioritários tiverem sido classificados e as negativas/correspondências necessárias estiverem aplicadas. Valide observando se a participação do gasto em buscas inadequadas cai sem reduzir indevidamente cliques de alta intenção e conversões.",
      avoid: "Evite usar negativa ampla ou de frase por conveniência quando houver risco de bloquear intenção válida. Uma limpeza agressiva pode reduzir o volume bom junto com o ruim.",
    };
  }

  if (value.includes("melhorar relevancia")) {
    return {
      where: "Google Ads → Palavras-chave de pesquisa + Anúncios; depois abra a página de destino usada pelo grupo. Priorize as palavras com Índice de qualidade baixo mostradas nos detalhes técnicos.",
      steps: [
        "Liste as palavras com Índice de qualidade 4 ou menor e identifique qual dos três componentes está abaixo da média: CTR esperado, relevância do anúncio ou experiência na página de destino.",
        "Se CTR esperado estiver abaixo da média: revise títulos para responder diretamente à intenção, tornar o benefício mais claro e diferenciar a oferta. Compare também se o termo de pesquisa realmente corresponde ao que o anúncio promete.",
        "Se Relevância do anúncio estiver abaixo da média: reorganize os grupos por intenção e faça o anúncio repetir naturalmente o tema principal daquela palavra-chave. Evite grupos com dezenas de intenções diferentes.",
        "Se Experiência na página de destino estiver abaixo da média: confirme que o conteúdo acima da dobra responde ao termo pesquisado, que a proposta é clara, que o CTA está visível e que a página funciona corretamente no celular.",
        "Cheque a continuidade busca → palavra-chave → anúncio → página. A mesma intenção deve permanecer reconhecível nas quatro etapas; se ela se perde em algum ponto, esse é o primeiro elemento a corrigir.",
        "Não otimize o Índice de qualidade como um número isolado. Dê prioridade às palavras que gastam, participam do leilão e têm potencial real de gerar resultado.",
        "Depois de ajustar anúncios ou página, registre exatamente quais grupos/palavras foram alterados para que a comparação futura não misture mudanças diferentes.",
      ],
      finish: "Valide com novos estados do Índice de qualidade e, principalmente, com redução da perda por classificação, melhora de CTR/CPC e manutenção ou crescimento das conversões. O ganho operacional importa mais que subir o índice por si só.",
      avoid: "Não inserir palavras-chave mecanicamente no texto apenas para aumentar relevância. O anúncio e a página precisam continuar naturais, claros e coerentes para a pessoa que pesquisou.",
    };
  }

  if (value.includes("nao aumentar orcamento")) {
    return {
      where: "Google Ads → Campanha → Configurações/Orçamento e Leilão. Esta ação é principalmente uma regra de controle enquanto as correções de relevância são executadas.",
      steps: [
        "Mantenha o orçamento diário atual enquanto a perda por classificação continuar sendo significativamente maior que a perda por orçamento.",
        "Não use o fato de a campanha gastar abaixo da capacidade teórica como justificativa automática para aumentar verba. Se ela não consegue entrar nos leilões por classificação, dinheiro adicional pode não gerar a entrega desejada.",
        "Execute primeiro as ações de termos de pesquisa, palavras-chave, anúncios e página indicadas nos outros cards de prioridade alta.",
        "Acompanhe semanalmente três sinais em conjunto: perda por classificação, participação de impressões e conversões/CPA. A recuperação precisa ocorrer sem deteriorar a eficiência.",
        "Quando a perda por classificação cair e a campanha voltar a converter, verifique se a perda por orçamento passou a ser relevante. Só nesse cenário o orçamento começa a se tornar um gargalo real de escala.",
        "Se chegar o momento de aumentar, faça incrementos graduais e registre a data. Evite saltos grandes que dificultem distinguir efeito de escala de alteração de eficiência.",
      ],
      finish: "Valide esta ação quando a classificação deixar de ser o principal gargalo. A partir daí, se houver eficiência e perda relevante por orçamento, abra uma nova ação específica de escala.",
      avoid: "Não aumentar orçamento apenas para ‘forçar’ entrega enquanto o principal diagnóstico ainda for classificação/relevância.",
    };
  }

  if (value.includes("revisar horarios")) {
    return {
      where: "Google Ads → Campanha → Programação de anúncios e Relatórios por hora/dia. Cruze com a planilha/CRM de leads reais quando disponível.",
      steps: [
        "Comece pelos horários citados no Motivo deste card e compare gasto, cliques e conversões. Não conclua apenas olhando o custo absoluto; considere quantas oportunidades realmente passaram por cada faixa.",
        "Amplie o período para 30 a 90 dias antes de bloquear uma faixa quando o volume semanal for pequeno. Horário é uma dimensão muito sensível a amostra reduzida.",
        "Cheque se os leads reais chegaram em horários diferentes do horário do clique. O momento da conversão pode não coincidir com a hora da pesquisa, então use o relatório do Google como sinal e não como verdade isolada.",
        "Procure padrões consistentes: várias semanas de gasto sem resultado na mesma faixa têm mais peso do que uma única semana ruim.",
        "Se houver evidência forte de faixa improdutiva, reduza a janela de veiculação de forma conservadora. Não faça cortes grandes em várias faixas ao mesmo tempo.",
        "Após a mudança, registre no card quais dias/horários foram alterados e mantenha as demais variáveis estáveis durante a validação.",
      ],
      finish: "Valide apenas depois de um novo período comparável mostrar redução do gasto improdutivo sem perda desproporcional de conversões ou volume qualificado.",
      avoid: "Não excluir horários com base em 1 ou 2 cliques. Em campanhas de baixo volume isso quase sempre é evidência insuficiente.",
    };
  }

  if (value.includes("investigar diferencas por dispositivo")) {
    return {
      where: "Google Ads → Relatórios/Dispositivos. Compare Computador, Celular e Tablet e, quando possível, teste a página de destino em cada experiência.",
      steps: [
        "Compare por dispositivo: impressões, cliques, CTR, CPC, conversões, taxa de conversão e custo. Identifique se o problema é falta de clique, custo alto ou queda depois do clique.",
        "Para o dispositivo citado no Motivo, abra os termos de pesquisa e confirme se a intenção do tráfego é semelhante à dos demais dispositivos. Diferença de intenção pode explicar desempenho antes de culpar o aparelho.",
        "Teste a página no dispositivo problemático: velocidade percebida, formulário, botão de WhatsApp/CTA, legibilidade, campos, teclado, erros e confirmação de envio.",
        "Se celular converte pior, verifique principalmente formulário e experiência acima da dobra. Se computador converte pior, investigue intenção, distribuição de termos e contexto de navegação antes de excluir.",
        "Compare um período maior antes de qualquer restrição. Dispositivo deve ter volume suficiente para que a diferença seja consistente e não apenas aleatória.",
        "Se a estratégia de lances for automatizada, evite presumir que um simples ajuste manual de lance por dispositivo resolverá o problema. Primeiro corrija tráfego e experiência.",
      ],
      finish: "Conclua a investigação quando houver uma causa provável documentada. Só valide uma intervenção depois de observar melhora da taxa de conversão/custo no dispositivo sem prejudicar o resultado total da campanha.",
      avoid: "Não excluir um dispositivo apenas porque ficou sem conversão em um período curto; isso pode eliminar uma parcela importante de alcance e aprendizagem.",
    };
  }

  if (value.includes("preservar estrutura e acumular evidencia")) {
    return {
      where: "Nenhuma alteração estrutural imediata. Use a própria página de Análise de desempenho para acompanhar o próximo período equivalente.",
      steps: [
        "Mantenha campanha, orçamento, estratégia de lances e estrutura sem mudanças relevantes durante a coleta do próximo bloco de dados.",
        "Revise apenas erros evidentes, como termo claramente inadequado, anúncio reprovado, página quebrada ou rastreamento com falha. Não faça otimizações baseadas em pequenas oscilações.",
        "Acompanhe semanalmente impressões, cliques, CTR, CPC, conversões, taxa de conversão, CPA e participação/perda de impressões.",
        "Espere volume suficiente para que uma dimensão específica possa ser julgada. Para horários, dispositivos e palavras individuais, prefira ampliar o intervalo quando houver poucos cliques.",
        "Registre qualquer mudança inevitável no campo Observação para que ela seja considerada na próxima comparação.",
        "Assim que surgir um sinal consistente — gasto relevante sem resultado, perda de classificação, deterioração de CVR ou oportunidade clara de escala — substitua esta ação por uma intervenção específica.",
      ],
      finish: "Valide quando houver dados suficientes para tomar uma decisão com confiança maior ou quando o desempenho mostrar estabilidade sem necessidade de intervenção.",
      avoid: "Evite ‘otimizar por ansiedade’. Alterações frequentes com pouco volume podem destruir a referência que precisamos para saber o que realmente funciona.",
    };
  }

  return {
    where: "Google Ads → abra a dimensão diretamente relacionada ao título desta recomendação e use o campo Motivo como ponto inicial da investigação.",
    steps: [
      "Confirme primeiro se o problema aparece também em um período maior e se o volume de dados é suficiente para uma decisão.",
      "Abra os itens citados no Motivo deste card e ordene pelo indicador que originou a recomendação: custo, cliques, conversões, taxa de conversão ou perda de impressões.",
      "Separe o que é fato do período do que ainda é hipótese. Faça apenas mudanças que tenham uma justificativa clara nos dados.",
      "Execute uma mudança pequena e rastreável, registre-a na Observação e marque a ação Em andamento.",
      "Mantenha as demais variáveis estáveis sempre que possível para conseguir atribuir a mudança de desempenho ao ajuste realizado.",
    ],
    finish: "Marque como Validado somente depois de comparar um novo período equivalente e confirmar que o indicador que motivou a ação melhorou sem criar deterioração importante em outras métricas.",
    avoid: "Evite alterações estruturais amplas quando o volume ainda for pequeno ou quando houver várias causas possíveis não investigadas.",
  };
}

function createGuide(card: HTMLElement, guide: Guide) {
  const details = document.createElement("details");
  details.dataset.s4xActionExecutionGuide = "true";
  details.style.marginTop = "10px";
  details.style.borderTop = "1px solid rgba(148,163,184,.30)";
  details.style.paddingTop = "9px";

  const summary = document.createElement("summary");
  summary.style.cursor = "pointer";
  summary.style.listStyle = "none";
  summary.style.display = "flex";
  summary.style.alignItems = "center";
  summary.style.justifyContent = "space-between";
  summary.style.gap = "10px";
  summary.style.fontSize = "11px";
  summary.style.fontWeight = "800";
  summary.style.color = "#334155";
  summary.innerHTML = `<span>Como executar esta ação</span><span style="font-size:9.5px;color:#64748B;font-weight:700">${guide.steps.length} passos</span>`;

  const content = document.createElement("div");
  content.style.marginTop = "10px";
  content.style.padding = "12px";
  content.style.borderRadius = "9px";
  content.style.background = "rgba(255,255,255,.72)";
  content.style.border = "1px solid rgba(148,163,184,.24)";

  const where = document.createElement("p");
  where.style.fontSize = "11px";
  where.style.lineHeight = "1.55";
  where.style.color = "#475569";
  where.innerHTML = `<strong style="color:#334155">Onde fazer:</strong> ${guide.where}`;
  content.appendChild(where);

  const list = document.createElement("ol");
  list.style.margin = "10px 0 0 18px";
  list.style.padding = "0";
  list.style.display = "grid";
  list.style.gap = "7px";
  for (const step of guide.steps) {
    const item = document.createElement("li");
    item.style.fontSize = "11px";
    item.style.lineHeight = "1.58";
    item.style.color = "#475569";
    item.style.paddingLeft = "3px";
    item.textContent = step;
    list.appendChild(item);
  }
  content.appendChild(list);

  const finish = document.createElement("p");
  finish.style.marginTop = "11px";
  finish.style.paddingTop = "9px";
  finish.style.borderTop = "1px solid rgba(148,163,184,.24)";
  finish.style.fontSize = "11px";
  finish.style.lineHeight = "1.58";
  finish.style.color = "#166534";
  finish.innerHTML = `<strong>Quando considerar resolvido:</strong> ${guide.finish}`;
  content.appendChild(finish);

  if (guide.avoid) {
    const avoid = document.createElement("p");
    avoid.style.marginTop = "8px";
    avoid.style.fontSize = "11px";
    avoid.style.lineHeight = "1.58";
    avoid.style.color = "#92400E";
    avoid.innerHTML = `<strong>Evite:</strong> ${guide.avoid}`;
    content.appendChild(avoid);
  }

  details.append(summary, content);
  card.appendChild(details);
}

export function GoogleAdsActionExecutionGuide() {
  useEffect(() => {
    let disposed = false;
    let scheduled = false;

    const apply = () => {
      scheduled = false;
      if (disposed) return;
      const section = findActionPlan();
      if (!section) return;

      for (const card of getCards(section)) {
        if (card.querySelector("[data-s4x-action-execution-guide='true']")) continue;
        const title = getTitle(card);
        if (!title) continue;
        createGuide(card, guideForTitle(title));
      }
    };

    const schedule = () => {
      if (scheduled || disposed) return;
      scheduled = true;
      window.requestAnimationFrame(apply);
    };

    apply();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, []);

  return null;
}
