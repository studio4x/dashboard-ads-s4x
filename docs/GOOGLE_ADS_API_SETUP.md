# Configuração da Google Ads API

## Arquitetura implementada

O conector nativo usa OAuth 2.0 de aplicação Web e a API REST oficial do Google Ads. As chamadas são exclusivamente server-side.

Fluxo:

1. o administrador autoriza uma conta Google com o escopo `https://www.googleapis.com/auth/adwords` e acesso offline;
2. o refresh token é salvo no Supabase Vault;
3. a aplicação chama `ListAccessibleCustomers` e percorre recursivamente `customer_client` nos MCCs e sub-MCCs;
4. uma conta cliente é vinculada ao dashboard, mantendo `customer_id` e `login_customer_id` separados;
5. a sincronização executa consultas GAQL e normaliza o resultado para `GoogleAdsS4XPayload`;
6. o snapshot usa o mesmo contrato dos snapshots do Google Sheets.

A implementação usa REST com `googleapis` apenas para OAuth. Não foi adicionado o pacote `google-ads-api`: a API REST oficial permite centralizar a versão (`v25`) e evita acoplar o Next.js 16 a uma biblioteca comunitária que pode ficar defasada em relação às versões rapidamente promovidas/descontinuadas pelo Google.

## 1. Google Cloud

1. Abra o Google Cloud Console e selecione ou crie o projeto da integração.
2. Em **APIs e serviços → Biblioteca**, ative **Google Ads API**.
3. Em **Google Auth Platform / Tela de consentimento OAuth**, configure:
   - nome do aplicativo;
   - e-mail de suporte;
   - público interno ou externo conforme a operação;
   - domínio autorizado `studio4x.com.br`;
   - escopo `https://www.googleapis.com/auth/adwords`.
4. Se o aplicativo estiver em modo de teste, adicione as contas Google que farão a homologação como usuários de teste.
5. Em **Clientes → Criar cliente → Aplicativo da Web**, crie o OAuth Client ID.
6. Cadastre exatamente esta URI de redirecionamento autorizada:

   `https://dashboardads.studio4x.com.br/api/admin/google-ads/oauth/callback`

7. Copie o Client ID e o Client Secret. Não coloque o Client Secret no painel da aplicação nem no repositório.

## 2. Developer Token no Google Ads Manager

O Developer Token é obtido em uma conta gerenciadora (MCC), não em uma conta cliente comum.

1. Entre no Google Ads com a conta gerenciadora que será responsável pela integração.
2. Abra **Administração/Ferramentas → Central da API (API Center)**.
3. Se ainda não houver token, preencha o formulário de acesso à Google Ads API.
4. Para homologação, use uma conta de teste compatível com o nível de acesso disponível.
5. Para consultar contas de produção, solicite e aguarde o nível de acesso exigido pelo Google.
6. Copie o Developer Token somente para a variável server-side da Vercel.

O Developer Token identifica a aplicação. O OAuth identifica o usuário Google. O `login-customer-id` identifica o MCC usado para alcançar a conta cliente. Esses três conceitos não são intercambiáveis.

## 3. Variáveis na Vercel

Configure em Production (e também Preview/Development se esses ambientes forem usados):

```text
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_API_VERSION=v25
```

- `GOOGLE_ADS_CLIENT_SECRET`: obrigatório e secreto.
- `GOOGLE_ADS_DEVELOPER_TOKEN`: obrigatório e secreto.
- `GOOGLE_ADS_CLIENT_ID`: fallback opcional; normalmente é salvo no painel `/admin/google-ads-api`.
- `GOOGLE_ADS_API_VERSION`: fallback opcional. A configuração persistida no painel tem precedência.

Também devem continuar configurados `NEXT_PUBLIC_SITE_URL`, credenciais Supabase, `SUPABASE_SERVICE_ROLE_KEY` e `CRON_SECRET`.

Depois de alterar variáveis, faça um novo deploy.

## 4. Supabase

A migration `add_google_ads_api_connector` cria:

- `google_ads_settings`;
- `google_ads_connections`;
- `google_ads_sources`;
- RPCs `google_ads_vault_store_refresh_token`, `google_ads_vault_read_refresh_token` e `google_ads_vault_delete_refresh_token`;
- job global `sync-google-ads-api-cron` no `pg_cron`.

As tabelas usam RLS e grants explícitos. As RPCs do Vault têm execução revogada de `public`, `anon` e `authenticated`, ficando disponíveis somente para `service_role`.

O segredo `CRON_SECRET` também precisa existir no Supabase Vault com esse nome, conforme `docs/ENVIRONMENT_VARIABLES.md`.

## 5. Primeira conexão

1. Publique a migration e o deploy com as variáveis configuradas.
2. Abra `/admin/google-ads-api`.
3. Informe o OAuth Client ID, confirme a versão e salve os padrões.
4. Confirme que Client Secret e Developer Token aparecem somente como **configurado na Vercel**.
5. Clique em **Conectar com Google** e conclua o consentimento.
6. Na conexão criada, clique em **Ver contas**.
7. Selecione o MCC pai imediato da conta; hierarquias com sub-MCC são percorridas automaticamente, enquanto o MCC raiz autorizado continua sendo usado no `login-customer-id`.
8. Selecione uma conta cliente; contas MCC não podem ser escolhidas como fonte de relatório.
9. Selecione o Cliente do Dashboard ADS, o dashboard Google correspondente e crie a fonte.
10. Clique em **Sincronizar agora**.
11. Verifique o período, as contagens por recurso, warnings e o snapshot no dashboard.

## 6. Histórico e reprocessamento

Na primeira versão, a sincronização reconsulta todo o período de `history_days` em cada execução. O `lookback_days` é armazenado e configurável, mas não é usado para somar agregados sobrepostos.

Essa escolha preserva a correção de campanhas, grupos, keywords, termos, anúncios e assets, que não possuem data em todas as coleções do contrato atual. Uma evolução futura pode criar staging diário e aplicar lookback incremental sem risco matemático.

## 7. Prioridade e fallback

- Google Ads API ativa com sincronização bem-sucedida: fonte prioritária do papel `google_ads`.
- Sem snapshot nativo válido: Google Sheets continua como fallback.
- No dashboard integrado, exatamente uma fonte é escolhida por papel: Google e Meta.
- Sincronizar a planilha durante a transição não soma a planilha com a API.
- Nenhuma fonte antiga é removida ou migrada automaticamente.

## 8. Comparar API e Google Sheets

1. Mantenha a fonte Google Sheets ativa no mesmo dashboard.
2. Sincronize as duas fontes em sequência e confirme que cobrem o mesmo período.
3. Na fonte Google Ads API, clique em **Comparar Sheets**.
4. A comparação verifica impressões, cliques, custo, conversões, valor de conversão, CTR, CPC, CPA e ROAS, além das contagens de campanhas, grupos, keywords, termos e negativas.
5. Investigue divergências considerando timezone da conta, atraso de atribuição e dados atualizados após a sincronização da planilha.
6. Desative a planilha apenas depois de validar paridade operacional.

## 9. Erros comuns

- `DEVELOPER_TOKEN_NOT_APPROVED` ou acesso insuficiente: revise o nível do token na API Center.
- `USER_PERMISSION_DENIED`: confirme o usuário OAuth, o Customer ID e o MCC usado como `login-customer-id`.
- `INVALID_CUSTOMER_ID`: use o ID de 10 dígitos; a aplicação remove hífens automaticamente.
- `invalid_grant`: o refresh token foi revogado/expirou; conecte novamente.
- erro GAQL: consulte o request ID salvo no log e valide o campo contra a versão configurada.
- conta manager escolhida: selecione uma conta cliente sob o MCC.
- termos de pesquisa ausentes: o Google pode omitir consultas por privacidade/baixo volume; isso não é tratado como falha.

## 10. Financial / Billing Data

Durante a sincronização, a aplicação faz uma consulta opcional ao recurso `account_budget` usando `adjusted_spending_limit_micros`, `amount_served_micros`, `adjusted_spending_limit_type` e `status`. Campos `*_micros` são convertidos dividindo por 1.000.000 e a moeda vem de `customer.currency_code`/da fonte.

Quando há um AccountBudget aprovado e finito, o dashboard exibe `Orçamento de conta restante`, calculado como limite ajustado menos `amount_served_micros`, limitado a zero. Esse valor é um orçamento de conta aplicável ao recurso, não um saldo financeiro universal ou saldo pré-pago.

Quando o tipo é `INFINITE`, a UI exibe `Sem limite de orçamento de conta definido`. Sem recurso aplicável, ou quando a consulta opcional falha, a performance continua sendo sincronizada e o status financeiro fica indisponível/temporariamente indisponível com warning no snapshot.

`Account budget remaining is not equivalent to a universal prepaid account balance.`
