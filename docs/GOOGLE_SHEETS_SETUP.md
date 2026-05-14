# GOOGLE_SHEETS_SETUP.md
## Configuração do Google Sheets API

Este guia explica como conectar a plataforma Dashboard ADS S4X ao Google Sheets.

### 1. Criar Projeto no Google Cloud
1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um novo projeto chamado Dashboard ADS S4X.

### 2. Habilitar a API
1. Vá em \"APIs & Services\" > \"Library\".
2. Pesquise por \"Google Sheets API\" e clique em **Enable**.

### 3. Criar Service Account
1. Vá em \"APIs & Services\" > \"Credentials\".
2. Clique em **Create Credentials** > **Service Account**.
3. Dê o nome dashboard-reader e finalize.
4. Na lista de Service Accounts, clique na conta criada.
5. Vá na aba **Keys** > **Add Key** > **Create new key** > **JSON**.
6. O arquivo JSON será baixado. **Guarde-o com segurança.**

### 4. Configurar Variáveis de Ambiente
Abra o arquivo .env.local e preencha com os dados do JSON:
- GOOGLE_SERVICE_ACCOUNT_EMAIL: o campo client_email do JSON.
- GOOGLE_PRIVATE_KEY: o campo private_key do JSON (incluindo as aspas e \n).
- GOOGLE_PROJECT_ID: o campo project_id do JSON.
- GOOGLE_SHEETS_USE_MOCKS: defina como alse para testar a conexão real.

### 5. Compartilhar a Planilha
Para que o sistema consiga ler a planilha:
1. Abra a planilha do Google Sheets do cliente.
2. Clique em **Compartilhar**.
3. Adicione o e-mail da Service Account (passo 4) com permissão de **Leitor**.

### 6. Obter o Spreadsheet ID
O ID está na URL da planilha:
https://docs.google.com/spreadsheets/d/ID_DA_PLANILHA/edit

Copie este ID e cole na área administrativa da plataforma.
