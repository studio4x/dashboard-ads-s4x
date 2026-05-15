# Fase 6 — Compartilhamento Seguro e Templates Operacionais

## Fase 6.1 — Links Seguros de Dashboard ✅

### Objetivo
Permitir que um dashboard seja acessado por clientes através de um link privado e seguro, sem a obrigatoriedade de criação de conta (login).

### O que foi implementado:
1. **Nova Tabela e RLS (`dashboard_share_links`)**:
   - Migration criada para armazenar os links de forma segura.
   - Armazena apenas o `token_hash` (SHA-256), garantindo que vazamentos de banco não exponham links ativos.
   - Políticas RLS rigorosas onde apenas Admins/Owners podem criar e gerenciar links.

2. **ShareService (`src/services/share-service.ts`)**:
   - `createShareLink(dashboardId)`: Gera o token bruto para a URL e salva o hash no banco de dados.
   - `validateShareToken(token)`: Valida o acesso (status, expiração) via Server Actions, usando o client `admin` (bypass RLS apenas para leitura controlada do dashboard correspondente).
   - `increment_share_access`: Função RPC que contabiliza visitas de forma assíncrona.

3. **Rota Pública (`/share/[token]`)**:
   - Rota fora dos grupos `(app)` e `(admin)`. Totalmente livre do middleware de autenticação.
   - Em caso de erro/expiração/revogação, exibe um `EmptyState` amigável de "Link Indisponível".
   - Passa por cima da injeção de ID de URL usando as props `overrideDashboardId` e `shareToken` no provedor principal de contexto do Dashboard (`DashboardDataProvider`).

4. **Proteção da Rota de Dados (`/api/dashboards/[id]/data`)**:
   - A API de consulta de snapshots agora aceita uma query string opcional `?share_token=[token]`.
   - Se o `share_token` for validado com sucesso e pertencer ao `dashboardId` solicitado, ele permite a devolução do snapshot JSON sem exigir sessão ativa do Supabase Auth.

5. **Interface Segura do Cliente**:
   - Componente `SharedHeaderActions` criado para remover o menu de Admin e funcionalidades técnicas.
   - O cabeçalho exibe "Modo Leitura / Compartilhamento Seguro" para transparência.

## Fase 6.2 — Admin de Compartilhamento ✅

### Objetivo
Criar uma interface administrativa para gerenciar os links seguros de dashboard gerados na Fase 6.1.

### O que foi implementado:
1. **APIs Administrativas (`/api/admin/share-links`)**:
   - `GET /api/admin/share-links`: Lista os links de um dashboard, mas oculta o `token_hash` para evitar vazamentos de segurança para a camada client.
   - `POST /api/admin/share-links/create`: Cria um novo link, retornando o `rawToken` apenas nessa primeira e única resposta.
   - `POST /api/admin/share-links/revoke`: Revoga um link permanentemente.
   - Todas protegidas por `requireAdmin`.

2. **Componente de Gestão (`ShareLinksManager`)**:
   - Desenvolvido como componente cliente reutilizável.
   - Permite criar link com expiração opcional (7, 30, 90 dias ou nunca).
   - Apresenta os links organizados com selos de status ("Ativo", "Expirado", "Revogado").
   - Informações visuais úteis (data de criação, contagem de acessos e data de expiração).
   - Função nativa de **Copiar Link**, apenas disponível durante o ato da criação (quando o `rawToken` é retornado pela API). Após fechar o modal, o token original nunca mais é visualizável por segurança.

3. **Integração na UI do Admin**:
   - **Hub do Cliente**: Adicionado o card "Links de Compartilhamento" listando cada dashboard do cliente e renderizando o manager para acesso direto sem sair do painel do cliente.
   - **Listagem de Dashboards**: Substituído o botão fixo "Copiar Link" por "Compartilhar", que abre um Modal com o componente `ShareLinksManager` para o dashboard focado.

### Como funciona na prática
- **Onde gerar links**: Acesse o Hub de um cliente ou a página "Dashboards", clique em "Compartilhar", digite um nome e escolha a expiração. Clique em gerar.
- **Como copiar**: O link completo (com token) aparecerá na tela de sucesso. Clique no ícone verde de cópia. Se a janela for fechada, não haverá como ver o token novamente.
- **Como revogar**: Na mesma interface, em frente ao link gerado, clique em "Revogar". O acesso daquele token `/share/...` será imediatamente interrompido.
- **Expiração**: Automática. O Supabase avalia o campo `expires_at` em tempo real durante o carregamento de `/share/[token]`.

### Pendências para Fase 6.5:
- Configurações estéticas nos templates (cores, fontes, logos) para total White Label.
- Implementar modelo `meta_ads` e `google_ads_meta_ads`.
- Implementar a página de configurações de cada dashboard para editar o tipo do template.

## Fase 6.4 — Templates e Duplicação ✅

### Objetivo
Acelerar a criação de dashboards para novos clientes através de modelos predefinidos (templates) e permitir a duplicação rápida de estruturas de dashboards existentes sem copiar dados sensíveis.

### O que foi implementado:
1. **Modelos de Dashboard (Dashboard Type)**:
   - Adicionado o campo `dashboard_type` na tabela `dashboards` via migration (`20260515120759_add_dashboard_type.sql`).
   - Definidos os tipos: `google_ads`, `meta_ads`, `google_ads_meta_ads` e `custom`.
   - O serviço `DashboardTemplateService` foi criado para gerenciar a geração padronizada de páginas dependendo do tipo selecionado (Ex: modelo "Google Ads" gera automaticamente Resumo Executivo, Campanhas, Palavras-chave, etc).

2. **Criação Rápida por Template**:
   - A página `/admin/dashboards` agora permite escolher o "Modelo" ao criar um novo dashboard.
   - O botão cria automaticamente a estrutura de abas e rotas correspondentes ao modelo, reduzindo o esforço manual a zero.

3. **Duplicação de Dashboards**:
   - Criado endpoint `POST /api/admin/dashboards/[id]/duplicate`.
   - Adicionada a ação "Duplicar" na interface `/admin/dashboards`.
   - **Regra de Segurança Garantida**: A duplicação clona as configurações do dashboard e as páginas (`dashboard_pages`), mas **NÃO COPIA**:
     - Links de compartilhamento (`dashboard_share_links`)
     - Snapshots de dados (`dashboard_data_snapshots`)
     - Logs de importação (`import_logs`)
     - Fontes de dados vinculadas (`google_sheet_sources`)

4. **Onboarding Visual por Dashboard**:
   - Atualizado o `/admin/clients/[clientId]` para mostrar um mini-checklist dentro do card de cada dashboard, informando visualmente:
     - Dashboard criado
     - Fonte de dados vinculada
     - Primeira importação realizada

5. **Páginas Adicionais (Placeholders)**:
   - Criados placeholders elegantes para `campaigns`, `keywords`, `search-terms`, e `ads-assets` em conformidade com o template Google Ads, já linkados na visualização pública (`/share/[token]`).

## Fase 6.3 — Visualização Compartilhada do Cliente ✅

### Objetivo
Refinar a UX da página `/share/[token]`, implementando navegação entre páginas (abas) do dashboard e mensagens amigáveis de erros.

### O que foi implementado:
1. **Navegação (SharedDashboardTabs)**:
   - Suporte completo às abas de navegação do dashboard compartilhado.
   - Preservação do `period` através dos URLs das abas.
   - Navegação gerida pelo parâmetro `?page=` na própria rota para manter simplicidade técnica e proteger a identidade visual.

2. **Empty States & Tratamento de Erro**:
   - Respostas de `token inválido`, `expirado` ou `revogado` possuem títulos limpos para orientar o cliente.
   - Se um dashboard não tiver dados (`needsImport`), a `DashboardPageShell` exibe apenas a mensagem "Nenhum dado importado", ocultando o botão restrito "Ir para Área Admin" baseando-se na flag nativa `isShared`.

3. **Identidade Visual e Isolamento (Header)**:
   - Adicionada a marca **Studio 4x (S4X)** no cabeçalho compartilhado para transmitir confiança e autoridade.
   - Remoção de qualquer traço administrativo (sem sidebar, sem breadcrumbs confusos).
   - Somente as abas pertinentes aparecem e navegam via `query params`.
   - Acesso seguro ao backend: Snapshot servido somente via autenticação com o hash correspondente na query string, validado internamente.
