# Centro de otimização Google Ads

O centro usa um único fluxo para preparar, validar, confirmar e auditar alterações. O código atual não executa mutações automaticamente: o preview relê a conta, calcula o diff, chama `validateOnly` quando o método permite e grava uma solicitação `validated`. A execução exige nova leitura, hash idempotente, lock por estado `validated`, confirmação explícita, segunda validação, mutação e read-back.

## Operações cobertas

- Palavras-chave: negativas existentes, criação exata/frase/ampla, duplicidade/conflito e lote de até 100 operações.
- Lances: CPC manual compatível com a estratégia; alterações acima de 20% são alto risco e acima de 50% são bloqueadas. Target CPA/ROAS exigem estratégia compatível e pelo menos 30 conversões recentes.
- Programação: adicionar, editar e remover faixas de 15 minutos, com fuso da conta, intervalo válido, sobreposição bloqueada e proteção contra campanha sem faixa.
- Localizações: busca por `GeoTargetConstant` oficial, adição/remoção e proteção contra campanha sem cobertura.
- RSA: títulos, descrições, URLs finais e URLs mobile, com limites, duplicidade e diff. Campos pinned não são apagados silenciosamente. A IA gera apenas rascunho.
- Assets: sitelink, callout e call; criação/vínculo, vínculo existente e desvínculo separado de exclusão. Quando há campanha, criação e vínculo usam uma mutação atômica com resource name temporário.
- Recomendações: listar recomendações oficiais, revisar/aplicar/dispensar individualmente; não há aplicação automática. Esses métodos não oferecem `validateOnly`, por isso a revisão humana e a auditoria continuam obrigatórias.
- Estratégia e conversões: mudança de estratégia de lances, `primary_for_goal`, campo legado `include_in_conversions_metric` com aviso, e `biddable` em metas do cliente/campanha. São operações críticas e restritas a owner.

## Travas e permissões

`GOOGLE_ADS_WRITES_ENABLED` e `GOOGLE_ADS_HIGH_RISK_WRITES_ENABLED` são server-side. Além delas, cada fonte possui `google_ads_sources.write_enabled`, alterável somente por owner. Operações críticas exigem owner e a confirmação textual `CONFIRMAR ALTERAÇÃO CRÍTICA`; operações high exigem `CONFIRMAR ALTERAÇÃO DE LANCES`.

As rotas `/api/admin/google-ads/changes/*` continuam protegidas por sessão admin, same-origin, rate limit e política de mudança. A migration `20260909150000_google_ads_safe_write_controls.sql` adiciona a trava por fonte e amplia a auditoria com origem, operação, risco, hash, confirmação, request ID e recursos afetados.

## Rotas de apoio

- `GET /api/admin/google-ads/recommendations`: recomendações oficiais da conta.
- `GET /api/admin/google-ads/geo-targets`: sugestões oficiais para seleção de localização.
- `POST /api/admin/google-ads/suggestions`: rascunho RSA sem autorização de escrita.

O cliente REST mantém `partialFailure=false` tanto nas mutações de coleção quanto no endpoint atômico `customers/{customer}:googleAds:mutate`. O estado aplicado continua sujeito ao atraso de propagação do Google; o histórico registra `postWriteVerification` como `verified_by_google_readback`, `pending_sync_readback` ou `readback_failed_after_google_ack`.

## Limites deliberados

Assets são imutáveis: desvincular não exclui. Reversão automática só aparece quando o payload inverso é seguro; programação, localização, assets e lote não recebem um “desfazer” cego. A disponibilidade real depende das credenciais OAuth, developer token, permissões da conta e das travas de ambiente.

Referências oficiais: [mutate](https://developers.google.com/google-ads/api/rest/common/mutate), [boas práticas de mutação](https://developers.google.com/google-ads/api/docs/mutating/best-practices?hl=en), [CampaignCriterion](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignCriterion), [Recommendation](https://developers.google.com/google-ads/api/reference/rpc/v25/Recommendation), [assets](https://developers.google.com/google-ads/api/reference/rpc/v25/Asset) e [metas de conversão](https://developers.google.com/google-ads/api/docs/conversions/goals/overview?hl=en).
