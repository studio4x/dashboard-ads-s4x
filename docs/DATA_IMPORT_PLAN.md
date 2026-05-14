# DATA_IMPORT_PLAN.md
## Plano de Importação de Dados

A plataforma utiliza um fluxo de importação em camadas para garantir estabilidade e performance.

### Camadas
1. **Google Sheets Client:** Autenticação via JWT/Service Account.
2. **Reader:** Lê intervalos específicos (ex: overview!A1:Z1000).
3. **Validator:** Garante que as colunas obrigatórias existem e os tipos básicos são válidos.
4. **Normalizer:** Converte formatos brasileiros (BRL, datas BR) para tipos primitivos (number, ISO date).
5. **Store:** Armazena o dado processado (Cache/Banco).

### Estratégia de Atualização
- **Manual:** O administrador dispara a sincronização no painel.
- **Automática (Futuro):** Webhooks ou CRON Jobs diários.

### Resiliência
- Se uma aba falhar, o sistema loga o erro mas continua processando as outras abas.
- O dashboard usa a última versão bem-sucedida dos dados.
