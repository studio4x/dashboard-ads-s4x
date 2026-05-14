# SUPABASE_SETUP.md
## Configuração do Supabase

Siga estes passos para configurar o backend do projeto.

### 1. Criar Projeto no Supabase
1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard).
2. Crie um novo projeto chamado Dashboard ADS S4X.

### 2. Rodar Migrations
1. No menu lateral, vá em **SQL Editor**.
2. Clique em **New Query**.
3. Copie o conteúdo de supabase/migrations/20240514000000_initial_schema.sql e execute.

### 3. Configurar Auth
1. Vá em **Authentication** > **Providers**.
2. Garanta que o provedor **Email** esteja habilitado.
3. (Opcional) Desabilite a confirmação de e-mail para testes locais.

### 4. Variáveis de Ambiente
Copie as chaves de **Project Settings** > **API**:
- Project URL -> NEXT_PUBLIC_SUPABASE_URL
- non public key -> NEXT_PUBLIC_SUPABASE_ANON_KEY
- service_role key -> SUPABASE_SERVICE_ROLE_KEY (Mantenha em segredo!)
