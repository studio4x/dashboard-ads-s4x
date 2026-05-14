# ENVIRONMENT_VARIABLES.md
## Variáveis de Ambiente — Fase 2

### Google Auth
- GOOGLE_SERVICE_ACCOUNT_EMAIL: E-mail da Service Account do Google Cloud.
- GOOGLE_PRIVATE_KEY: Chave privada RSA (começa com -----BEGIN PRIVATE KEY-----).
- GOOGLE_PROJECT_ID: ID do projeto no Google Cloud.

### Controle de Fonte
- GOOGLE_SHEETS_USE_MOCKS: 	rue (padrão) usa os arquivos em src/data/. alse tenta conectar na API.

### Notas de Segurança
- Nunca commite o arquivo .env.local.
- No Vercel/Produção, certifique-se de tratar as quebras de linha (\n) da chave privada corretamente.
