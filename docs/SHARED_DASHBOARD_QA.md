# Dashboard Compartilhado — Guia de QA

## URLs de Acesso
- **Base:** `/share/[token]`
- **Páginas Específicas (Query Params):**
  - `?page=executive-summary` (Default)
  - `?page=campaigns`
  - `?page=ad-groups`
  - `?page=keywords`
  - `?page=search-terms`
  - `?page=ads-assets`
  - `?page=negative-keywords`

## Casos de Teste (Checklist)

### 1. Token Ativo
- [ ] Acessar `/share/[token]`
- [ ] Validar carregamento do nome do cliente no header.
- [ ] Validar carregamento do nome do dashboard.
- [ ] Validar se KPIs do Resumo Executivo batem com a planilha.
- [ ] Alternar entre abas (Campanhas, Keywords, etc) via menu.

### 2. Segurança e Somente Leitura
- [ ] Confirmar ausência do botão "Importar Planilha".
- [ ] Confirmar ausência de links para o Admin.
- [ ] Tentar acessar `/api/dashboards/[id]/data` sem o token (deve retornar 401/403).

### 3. Estados de Erro
- [ ] **Token Inválido:** Acessar `/share/token_inexistente`. Deve mostrar erro amigável.
- [ ] **Token Revogado:** Criar um link, revogar no admin e tentar acessar. Deve mostrar "Link Revogado".
- [ ] **Sem Snapshot:** Criar dashboard novo sem importar dados e acessar o link. Deve mostrar "Nenhum dado importado".

### 4. Parâmetros de URL
- [ ] **Page Inválida:** `/share/[token]?page=qualquercoisa`. Deve cair no Resumo Executivo.
- [ ] **Filtro de Data:** Alterar o período no header e validar se os dados das subpáginas respeitam o filtro.

### 5. Responsividade
- [ ] Validar visualização em largura mobile (< 640px).
- [ ] Validar scroll horizontal em tabelas largas nas páginas detalhadas.
