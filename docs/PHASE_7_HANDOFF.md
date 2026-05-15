# Dashboard ADS S4X — Fase 7 Handoff

## Resumo da Fase 7
A Fase 7 consolidou a transição para o novo motor de dados **Google Ads S4X**, permitindo importações automatizadas via cron, snapshots estruturados e compartilhamento seguro via links públicos.

### Fases Concluídas
- **7.1 — Dashboard_Config e Validação:** Implementação da validação rígida de template e estrutura da planilha.
- **7.2 — Importador S4X:** Motor de importação com normalização de dados, cálculos de métricas derivadas e bloqueio de erros críticos.
- **7.3 — Snapshot S4X:** Estruturação do JSON de snapshot seguindo o contrato `GoogleAdsS4XPayload`.
- **7.4 — Páginas Detalhadas:** Visualização completa de Campanhas, Grupos, Palavras-Chave, Termos, Anúncios e Negativas.
- **7.5 — Validação do Share:** Testes de segurança, responsividade e navegação pública sem login.
- **7.6 — Deploy Final:** Limpeza, documentação e preparação para produção.

## Decisões Técnicas
1. **Normalização na Fonte:** Os dados são normalizados durante a importação para evitar lógica pesada no cliente.
2. **Escala de Percentuais:** Todos os percentuais (CTR, Conversão) são armazenados em escala 0-100 no JSON.
3. **Segurança de Compartilhamento:** Tokens SHA-256 no banco de dados. O usuário final não precisa de conta no Supabase.
4. **Navegação via Query Params:** `/share/[token]?page=...` permite carregar subpáginas sem múltiplos endpoints ou reloads.
5. **Mapeamento de Fallback:** O `DashboardDataProvider` mapeia `dailyPerformance` para `overview` no S4X para manter compatibilidade com componentes legados.

## Fluxo Operacional
1. Admin cria/seleciona um dashboard.
2. Conecta uma planilha baseada no template S4X.
3. Executa a importação (Manual ou via Cron).
4. O sistema gera um snapshot atômico no banco.
5. Admin gera um link de compartilhamento.
6. O cliente acessa o link e visualiza o dashboard em modo somente leitura.

## Arquivos Principais
- `src/lib/dashboard/google-ads-s4x-importer.ts`: Lógica central de importação.
- `src/services/dashboard-service.ts`: Gerenciamento de snapshots.
- `src/services/share-service.ts`: Gestão de tokens e acessos.
- `src/app/share/[token]/page.tsx`: Entry point do modo compartilhado.

## Limitações Conhecidas
- **Tabelas Grandes:** Em dispositivos móveis de entrada, tabelas com >500 linhas podem apresentar lentidão (necessária virtualização no futuro).
- **Meta Ads:** O template S4X para Meta Ads está planejado para a Fase 9+.
- **Agregação de Anúncios:** A aba de Anúncios (Recursos) não é agregável para KPIs gerais devido à natureza granular dos dados.

## Próximos Passos
- **Fase 8:** Refinamento visual, performance e alertas de importação.
- **Histórico:** Comparação entre snapshots anteriores.
- **Customização:** Possibilidade de ocultar abas específicas por link de share.
