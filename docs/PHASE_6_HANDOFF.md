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

### Pendências para a Fase 6.2:
- Criar a Interface de Usuário no Painel Admin (provavelmente dentro do *Hub do Cliente* ou na página de *Dashboards*) para disparar o `createShareLink` e exibir a lista de links gerados.
- Implementar botões de "Copiar Link", "Revogar" e definir Data de Expiração opcional.

---

## Compartilhamento sem login

**Por que clientes não precisam criar conta?**
A decisão de negócio prioriza a baixa fricção. Em vez de forçar clientes a gerenciar senhas para visualizar um dashboard ocasionalmente, o administrador gera um link de acesso seguro que age como uma chave de leitura temporária ou permanente para aquele dashboard.

**Como o admin gera o link? (Na Fase 6.2)**
Através de um botão no painel administrativo que chamará `ShareService.createShareLink()`, gerando um hash e retornando o link bruto `https://.../share/token-cru`.

**Como o token funciona?**
O token bruto (semelhante a uma chave de API) viaja na URL. O backend o criptografa em SHA-256 e compara com o banco de dados. O banco de dados nunca vê o token original. 

**Limitações e Segurança:**
- O link não dá acesso a outras áreas (arquivos, importação, configurações do admin).
- O acesso do link requer a API `GET /api/dashboards/[id]/data`, que é rigorosamente validada de volta contra o hash do token para evitar injeção de IDs.
- Links podem ser revogados a qualquer momento pelo admin.
