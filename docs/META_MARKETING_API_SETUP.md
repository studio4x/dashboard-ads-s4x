# Configuração da Meta Marketing API

## O que fica em cada lugar

- Painel `/admin/meta-marketing`: App ID, Login Configuration ID, versão da Graph API, histórico inicial, janela de reprocessamento e frequência padrão.
- Vercel: `META_APP_SECRET` (obrigatório e server-side). `META_APP_ID` e `META_GRAPH_API_VERSION` são apenas fallbacks opcionais.
- Supabase Vault: tokens OAuth de cada usuário conectado. A aplicação grava, lê e revoga esses tokens por funções acessíveis somente à `service_role`.

## Configuração no Meta for Developers

1. Crie ou selecione um aplicativo do tipo Business.
2. Adicione o produto Facebook Login for Business.
3. Cadastre exatamente a URI mostrada no painel em **Valid OAuth Redirect URIs**. Em produção ela é:
   `https://dashboardads.studio4x.com.br/api/admin/meta/oauth/callback`
4. Crie uma configuração de login solicitando `ads_read` e `business_management` e informe o ID dessa configuração no painel. Sem Login Configuration ID, a aplicação solicita os mesmos escopos diretamente.
5. Para conectar contas de clientes externos em produção, conclua a Verificação da Empresa e solicite Advanced Access para as permissões necessárias no App Review.
6. Configure `META_APP_SECRET` nos ambientes desejados da Vercel e faça um novo deploy.

## Vincular uma fonte

1. Abra `/admin/meta-marketing`, preencha e salve a configuração pública.
2. Clique em **Conectar com Facebook** e autorize o usuário que possui acesso aos negócios.
3. Clique em **Ver negócios e contas**. O sistema consulta contas diretas, `owned_ad_accounts` e `client_ad_accounts`.
4. Selecione cliente, dashboard compatível com Meta, gerenciador (opcional) e uma ou mais contas.
5. Crie a fonte e execute **Sincronizar agora** para validar a primeira importação.

## Operação e segurança

- O conector é somente leitura e não solicita `ads_management`.
- O App Secret e os tokens nunca são enviados ao frontend nem incluídos nos logs.
- O token é acompanhado por `appsecret_proof` nas requisições à Graph API.
- A primeira sincronização usa o histórico configurado; as seguintes substituem apenas a janela móvel recente, preservando o histórico anterior.
- O job `sync-meta-marketing-api-cron` roda a cada hora no Supabase e respeita a frequência individual de cada fonte.
- Erro Meta de token inválido/expirado (código 190) marca a conexão como expirada e exige uma nova autorização.

## Financial / Billing Data

Na sincronização, cada conta de anúncios é consultada com `balance`, `amount_spent`, `spend_cap`, `currency`, `funding_source_details` e `is_prepay_account`. Os valores monetários da resposta são tratados na unidade da moeda da conta; não são convertidos como micros do Google Ads.

`spend_cap` com valor positivo e `amount_spent` válido gera `Disponível até o limite`, com limite e gasto acumulado. A cobertura estimada usa somente esse valor restante e a média dos dias recentes com gasto positivo.

`balance` não é automaticamente exibido como saldo disponível. Em conta identificada como pré-paga (`is_prepay_account`), ele pode ser exibido como `Saldo pré-pago disponível`; nos demais casos aparece como `Saldo / valor de faturamento informado pela Meta`, sem estimativa de cobertura. A ausência ou falha de campos financeiros não invalida o snapshot de performance.

`balance, spend_cap and amount_spent have different meanings and must not be presented as interchangeable values.`
