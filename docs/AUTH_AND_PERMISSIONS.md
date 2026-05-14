# Autenticação e Permissões — Dashboard ADS S4X

Este documento descreve o sistema de controle de acesso da plataforma, implementado na Fase 4.1.

## 1. Níveis de Acesso (Roles)

A plataforma utiliza três níveis de permissão definidos na tabela `public.profiles`:

| Role | Descrição | Acesso |
| --- | --- | --- |
| **owner** | Proprietário da agência/plataforma. | Acesso total a todas as áreas, APIs e dados de todos os clientes. |
| **admin** | Administrador da plataforma. | Acesso total (similar ao owner, mas sem privilégios de faturamento futuro). |
| **client** | Cliente final da agência. | Acesso restrito apenas aos dashboards vinculados via `client_users`. |

## 2. Camadas de Proteção

### 2.1. Middleware (Edge)
O arquivo `src/middleware.ts` (delegando para `src/lib/supabase/middleware.ts`) intercepta todas as requisições para garantir:
- **Autenticação**: Redireciona usuários deslogados tentando acessar `/admin` ou `/app` para `/login`.
- **Autorização**: Bloqueia usuários com role `client` de acessarem qualquer rota iniciada por `/admin`.

### 2.2. Helpers de Servidor (Guards)
Localizados em `src/lib/auth/guards.ts`, esses helpers são usados em **Server Components** e **API Routes**:
- `requireAdmin()`: Valida se o usuário é `admin` ou `owner`.
- `requireDashboardAccess(dashboardId)`: Valida se o usuário tem permissão para ver os dados de um dashboard específico.

### 2.3. Banco de Dados (RLS)
O Supabase aplica **Row Level Security (RLS)** em todas as tabelas. Isso garante que, mesmo que uma API falhe, o banco de dados não entregará dados indevidos.
- Políticas definidas em `supabase/migrations/20240514000002_rls_policies.sql`.

## 3. Fluxo de Acesso do Cliente

1. O cliente faz login.
2. O middleware verifica que ele é um `client` e o redireciona para `/app/dashboards`.
3. Ao tentar abrir um dashboard, a API `/api/dashboards/[dashboardId]/data` verifica se existe uma entrada na tabela `client_users` vinculando o `user_id` do cliente ao `client_id` do dashboard.
4. Se vinculado, os dados são entregues. Caso contrário, retorna `403 Forbidden`.

## 4. Como promover um usuário a Admin

Por padrão, novos usuários criados via Auth recebem a role `client`. Para promover um usuário a Admin, execute o seguinte comando no SQL Editor do Supabase:

```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'email-do-usuario@exemplo.com';
```

## 5. Compartilhamento Público (Links Seguros)

A partir da Fase 6, administradores podem gerar links de acesso público e seguro para dashboards específicos (`/share/[token]`).
- Este link **ignora a necessidade de login** (bypassa o Auth), mas a validação ocorre na API através do token hash (SHA-256).
- A tabela `dashboard_share_links` gerencia o ciclo de vida do token (active, revoked, expired).
- A API `/api/dashboards/[dashboardId]/data` foi ajustada para aceitar a query string `?share_token=[token]` e permitir a leitura se validado, impedindo navegação para áreas ou dashboards não autorizados.
