# AGENTS.md — Dashboard Ads S4X

## Função deste arquivo

Este arquivo orienta o Codex dentro deste repositório.

Ele não substitui a documentação funcional/técnica.  
Fontes principais:

- `docs/APP_SPEC.md`
- `docs/EXECUTION_PLAN.md`
- `docs/DATA_IMPORT_PLAN.md`
- `docs/PRODUCT_PLAYBOOK.md`
- `docs/DEPLOYMENT.md`

Antes de implementar mudanças relevantes, consulte esses documentos.

---

## Projeto

Dashboard Ads S4X é uma plataforma de dashboards de marketing com foco em:

- ingestão via Google Sheets;
- processamento e normalização dos dados;
- visualização por dashboards compartilháveis;
- operação administrativa (clientes, dashboards, fontes e logs).

Fluxo central:

1. admin vincula uma planilha a um dashboard;
2. sistema valida/importa abas e colunas por modelo;
3. snapshot é salvo;
4. dashboard consome os dados normalizados.

---

## Stack obrigatória

Usar, salvo instrução contrária:

- Next.js (App Router)
- TypeScript
- React
- Supabase (Auth, Database, RLS)
- Vercel

---

## This Is NOT the Next.js You Know

Esta versão do Next.js pode ter mudanças relevantes de API, convenções e estrutura.

Antes de codar em áreas sensíveis do framework:

1. consultar `node_modules/next/dist/docs/`;
2. respeitar avisos de depreciação;
3. evitar padrões antigos sem validação.

---

## Estrutura esperada

Manter organização e responsabilidades existentes:

- `src/app` (rotas, páginas, route handlers)
- `src/components`
- `src/lib`
- `src/services`
- `src/types`
- `supabase/migrations`
- `docs`

Evitar mover arquivos sem necessidade clara.

---

## Modo de trabalho

Antes de implementar:

1. entender o escopo exato;
2. mapear arquivos afetados;
3. validar impacto em importação, dashboards e admin;
4. implementar somente o necessário;
5. não ampliar escopo silenciosamente.

Em tarefas grandes, explicitar:

- resumo da solução;
- arquivos alterados;
- premissas e riscos.

---

## Regras de escopo

- Priorizar correção e consistência do fluxo de dados.
- Não criar features paralelas fora do pedido.
- Preservar compatibilidade com modelos de dashboard existentes sempre que possível.

Se houver conflito entre instruções:

1. instrução direta do usuário;
2. documentação do projeto;
3. defaults técnicos.

---

## Segurança

Nunca colocar regra crítica apenas no frontend.

Sempre considerar:

- autenticação em áreas privadas;
- autorização por perfil/permissão;
- RLS nas tabelas sensíveis;
- uso de service role apenas no backend;
- segredos nunca no cliente.

---

## Banco de dados

Toda mudança estrutural deve ser feita por migration SQL em `supabase/migrations`.

Sempre revisar:

- foreign keys;
- índices;
- constraints;
- políticas RLS.

Não depender de ajuste manual no painel como fonte de verdade.

---

## Importação e validação de dados

Mudanças em importação devem preservar:

- logs claros de erro/aviso;
- distinção entre erro bloqueante e aviso;
- consistência dos payloads por template;
- comportamento por modelo de dashboard.

Ao alterar regras de schema/template, validar impacto em:

- `src/lib/google-sheets/*`
- páginas/admin de Google Sheets
- snapshots consumidos no dashboard.

---

## Publicação

Para entregas que afetam o produto:

1. commit;
2. push;
3. deploy necessário;
4. validação de produção.

Antes de encerrar, confirmar:

- deploy `READY`;
- domínio canônico apontando para release correta;
- comportamento básico validado em produção.

---

## Resposta esperada do Codex

Responder de forma objetiva, informando quando útil:

- o que foi alterado;
- arquivos impactados;
- premissas;
- pendências/riscos.
