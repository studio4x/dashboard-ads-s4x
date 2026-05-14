# IMPLEMENTATION_HANDOFF.md
## Handoff de Implementação — Dashboard ADS S4X

### Estado Atual (Fase 1 — Concluída)
- Projeto Next.js 16 inicializado
- Stack: TypeScript + Tailwind v4 + Recharts
- Todos os mocks criados em src/data/
- Todos os tipos em src/types/
- Componentes em src/components/dashboard/ e /admin/
- Todas as rotas implementadas
- Documentação em /docs/

### Para Continuar (Fase 2)
1. Criar projeto no Google Cloud Console
2. Habilitar Google Sheets API
3. Criar Service Account e baixar JSON de credenciais
4. Adicionar .env.local com GOOGLE_SERVICE_ACCOUNT_KEY
5. Criar src/lib/google-sheets.ts
6. Criar src/lib/sheet-parser.ts
7. Substituir imports de mock por chamadas reais
8. Adicionar UI de vinculação de planilha no admin

### Arquivos Chave
- src/data/ — todos os mocks (substituir na Fase 2)
- src/types/ — contratos de dados (manter)
- src/lib/constants.ts — configurações centrais
- src/lib/formatters.ts — formatação de valores
- docs/GOOGLE_SHEETS_SCHEMA.md — schema das planilhas

### Convenções de Código
- Componentes: PascalCase, sufixo Widget/Card/Shell
- Hooks: camelCase com prefixo use
- Tipos: PascalCase, sufixo Row/Config/Summary
- Arquivos mock: mock-sheet-[nome].ts
- Dados: nunca hardcode nas páginas, sempre importar de data/
