# DATABASE.md
## Estrutura do Banco de Dados (PostgreSQL)

### Tabelas Principais
- **profiles:** Dados estendidos dos usuários (roles: owner, admin, client).
- **clients:** Empresas atendidas.
- **dashboards:** Instâncias de dashboards vinculados a clientes.
- **data_sources:** Configurações de conexão (Google Sheets, etc).
- **import_logs:** Histórico de execuções de importação.
- **dashboard_data_snapshots:** Snapshots dos dados normalizados em formato JSONB.

### JSONB Storage
O campo dashboard_data_snapshots.payload_json armazena o objeto consolidado com todas as abas processadas da planilha, permitindo renderização instantânea do dashboard sem consultar a API do Google a cada carregamento.
