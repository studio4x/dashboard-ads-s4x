# Centro de otimização Google Ads

O centro usa um único fluxo para preparar, validar, confirmar e auditar alterações. O código atual não executa mutações automaticamente: o preview relê a conta, calcula o diff, chama `validateOnly` quando o método permite e grava uma solicitação `validated`. A execução exige nova leitura, hash idempotente, lock por estado `validated`, confirmação explícita, segunda validação, mutação e read-back.

## Operação vinculada à análise

O período selecionado na página alimenta diretamente o centro. Campanhas, grupos, palavras-chave, termos de pesquisa, anúncios e horários vêm dos mesmos snapshots normalizados usados na análise; orçamento, estratégia de lances, conversões e assets vêm do último snapshot de configuração da conta.

O motor de decisão transforma esses dados em ações preenchidas e justificadas, sempre exibindo motivo, evidência, risco e estado de prontidão. Hoje ele cobre: negativação de buscas com baixa intenção, inclusão exata de termos que converteram, pausa controlada de palavras-chave sem resultado, aumento de orçamento quando a perda por orçamento e a eficiência sustentam a decisão, revisão de CPA desejado, rascunho RSA contextual, revisão de horários e lacunas de sitelink/callout.

Negativas, novas palavras-chave e pausas podem ser selecionadas nos próprios cards e preparadas em lote atômico (`partialFailure=false`). A seleção não executa nada: ela gera uma única revisão Antes → Depois e continua sujeita às mesmas travas e confirmações.

As recomendações oficiais do Google são carregadas automaticamente e ficam separadas das decisões S4X. Os atalhos do plano de ação abrem diretamente o grupo operacional correspondente. Quando não há amostra suficiente ou inventário confiável, a interface informa que a ação deve aguardar ou ser assistida em vez de inferir uma alteração.

O inventário de assets usa a associação oficial `campaign_asset`; `asset_daily`, que representa assets observados em anúncios, não é tratado como prova de ausência em uma campanha.

A origem também acompanha a solicitação e a auditoria: `S4X_ANALYSIS`, `AI_DRAFT`, `GOOGLE_RECOMMENDATION` ou `MANUAL`.

## Operações cobertas

- Palavras-chave: negativas existentes, criação exata/frase/ampla, duplicidade/conflito e lote de até 100 operações.
- Lances: CPC manual compatível com a estratégia; alterações acima de 20% são alto risco e acima de 50% são bloqueadas. Target CPA/ROAS exigem estratégia compatível e pelo menos 30 conversões recentes.
- Programação: adicionar, editar e remover faixas de 15 minutos, com fuso da conta, intervalo válido, sobreposição bloqueada e proteção contra campanha sem faixa.
- Localizações: busca por `GeoTargetConstant` oficial, adição/remoção e proteção contra campanha sem cobertura.
- RSA: títulos, descrições, URLs finais e URLs mobile, com limites, duplicidade e diff. É possível substituir o conteúdo no mesmo anúncio, criar outro mantendo o atual ativo ou criar outro pausando o atual no mesmo lote. Fixações/pins são preservadas para textos idênticos. A IA gera apenas rascunho.
- Assets: sitelink, callout e call; criação/vínculo, vínculo existente e desvínculo separado de exclusão. Quando há campanha, criação e vínculo usam uma mutação atômica com resource name temporário.
- Recomendações: listar recomendações oficiais, revisar/aplicar/dispensar individualmente; não há aplicação automática. Esses métodos não oferecem `validateOnly`, por isso a revisão humana e a auditoria continuam obrigatórias.
- Estratégia e conversões: mudança de estratégia de lances, `primary_for_goal`, campo legado `include_in_conversions_metric` com aviso, e `biddable` em metas do cliente/campanha. São operações críticas e restritas a owner.

## Travas e permissões

`GOOGLE_ADS_WRITES_ENABLED` e `GOOGLE_ADS_HIGH_RISK_WRITES_ENABLED` são server-side. Além delas, cada fonte possui `google_ads_sources.write_enabled`, alterável somente por owner. Operações críticas exigem owner e a confirmação textual `CONFIRMAR ALTERAÇÃO CRÍTICA`; alterações de anúncios exigem `CONFIRMAR ALTERAÇÃO DE ANÚNCIO`; as demais operações high mantêm `CONFIRMAR ALTERAÇÃO DE LANCES`.

As rotas `/api/admin/google-ads/changes/*` continuam protegidas por sessão admin, same-origin, rate limit e política de mudança. A migration `20260909150000_google_ads_safe_write_controls.sql` adiciona a trava por fonte e amplia a auditoria com origem, operação, risco, hash, confirmação, request ID e recursos afetados.

## Rotas de apoio

- `GET /api/admin/google-ads/recommendations`: recomendações oficiais da conta.
- `GET /api/admin/google-ads/geo-targets`: sugestões oficiais para seleção de localização.
- `POST /api/admin/google-ads/suggestions`: rascunho RSA sem autorização de escrita.

O cliente REST mantém `partialFailure=false` tanto nas mutações de coleção quanto no endpoint atômico `customers/{customer}:googleAds:mutate`. O estado aplicado continua sujeito ao atraso de propagação do Google; o histórico registra `postWriteVerification` como `verified_by_google_readback`, `pending_sync_readback` ou `readback_failed_after_google_ack`.

## Limites deliberados

Assets são imutáveis: desvincular não exclui. Reversão automática só aparece quando o payload inverso é seguro; programação, localização, assets e lote não recebem um “desfazer” cego. A disponibilidade real depende das credenciais OAuth, developer token, permissões da conta e das travas de ambiente.

Referências oficiais: [mutate](https://developers.google.com/google-ads/api/rest/common/mutate), [boas práticas de mutação](https://developers.google.com/google-ads/api/docs/mutating/best-practices?hl=en), [CampaignCriterion](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignCriterion), [Recommendation](https://developers.google.com/google-ads/api/reference/rpc/v25/Recommendation), [campaign_asset](https://developers.google.com/google-ads/api/fields/v25/campaign_asset), [assets](https://developers.google.com/google-ads/api/reference/rpc/v25/Asset) e [metas de conversão](https://developers.google.com/google-ads/api/docs/conversions/goals/overview?hl=en).
