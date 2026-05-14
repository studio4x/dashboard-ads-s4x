# Plano de Execução — Fase 3: Supabase, Auth e Persistência

## 🎯 Objetivo
Transformar a plataforma em uma aplicação persistente e segura, utilizando Supabase para banco de dados (PostgreSQL) e autenticação, protegendo áreas administrativas e de clientes.

---

## 🏗️ Etapa 1: Configuração e Infraestrutura (Supabase)
- [ ] Configurar variáveis de ambiente no `.env.local` e `.env.example`.
- [ ] Criar cliente Supabase (Server, Client e Middleware clients).
- [ ] Criar documentação inicial: `docs/SUPABASE_SETUP.md`.

## 🗄️ Etapa 2: Esquema do Banco de Dados
- [ ] Criar migration SQL consolidada (`supabase/migrations/20240514000000_initial_schema.sql`).
- [ ] Configurar Row Level Security (RLS) básico.
- [ ] Criar documentação: `docs/DATABASE.md`.

## 🔐 Etapa 3: Autenticação e Proteção de Rotas
- [ ] Implementar página de Login em `/login`.
- [ ] Configurar Next.js Middleware para proteção de rotas.
- [ ] Criar hooks de auth (ex: `useUser`, `useProfile`).
- [ ] Criar documentação: `docs/AUTH_AND_PERMISSIONS.md`.

## 💼 Etapa 4: Persistência de Entidades (Admin)
- [ ] Refatorar APIs de Clientes para CRUD no Supabase.
- [ ] Refatorar APIs de Dashboards para CRUD no Supabase.
- [ ] Refatorar APIs de Google Sheets para persistir a configuração no banco.

## 📊 Etapa 5: Refatoração do Fluxo de Dados (Fase 2 -> Fase 3)
- [ ] Atualizar `GoogleSheetsImportService` para salvar logs e snapshots no banco.
- [ ] Atualizar `DashboardDataProvider` para buscar snapshots do banco.
- [ ] Desativar `DashboardStore` (em memória).

## 🏁 Etapa 6: Finalização e Handoff
- [ ] Rodar build completo.
- [ ] Atualizar `PHASE_3_HANDOFF.md`.
- [ ] Realizar commit final da fase.
