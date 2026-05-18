# SPEC Completa — Dashboard Google Ads Studio 4x

## 1. Visão Geral

Este documento reúne a especificação completa do dashboard Google Ads criado para a Studio 4x, considerando uma solução própria em:

- React;
- Next.js;
- Tailwind CSS;
- Recharts;
- Google Sheets;
- Google Apps Script ou n8n;
- Geração automática de PDF;
- Envio automático por e-mail.

O objetivo do dashboard é substituir relatórios técnicos e extensos por uma experiência mais visual, executiva e fácil de entender para clientes que acompanham campanhas de Google Ads.

---

# 2. Objetivo do Dashboard

Criar um dashboard executivo para clientes da Studio 4x acompanharem, de forma visual e simples, os principais resultados das campanhas de Google Ads.

O dashboard deve apresentar:

- Métricas principais em cards;
- Gráficos de evolução;
- Comparação com período anterior;
- Resumo interpretativo da semana;
- Próximos passos de otimização;
- Exportação em PDF;
- Envio automático por e-mail;
- Possibilidade de reaproveitamento para vários clientes.

---

# 3. Arquitetura Proposta

## 3.1 Stack Recomendada

```text
Next.js + React
Tailwind CSS
Recharts
Lucide React
Google Sheets
Google Apps Script ou n8n
Puppeteer / Playwright / Browserless para PDF
Serviço de e-mail: SMTP, Brevo, Gmail API ou outro provedor
```

## 3.2 Fluxo Geral

```text
Google Ads / GA4 / Search Console
        ↓
n8n ou Apps Script
        ↓
Google Sheets
        ↓
Dashboard em Next.js / React
        ↓
PDF automático
        ↓
Envio por e-mail ao cliente
```

---

# 4. Página Criada — Resumo Executivo

## 4.1 Finalidade

A página “Resumo Executivo” é a primeira tela do dashboard e deve responder rapidamente:

- Quanto foi investido?
- Quantas impressões foram geradas?
- Quantos cliques foram obtidos?
- A CTR melhorou ou piorou?
- O CPC ficou mais caro ou mais barato?
- Houve conversões?
- Qual foi a leitura geral da semana?
- Quais são os próximos passos de otimização?

---

# 5. Configuração Visual da Página

## 5.1 Dimensão

```text
1920 x 1080 px
Formato: 16:9
Orientação: paisagem
```

## 5.2 Estilo Visual

```text
Fundo geral: #F7F9FC
Cards: #FFFFFF
Bordas: #E5E7EB
Texto principal: #111827
Texto secundário: #6B7280
Cor principal: #2563EB
Verde positivo: #16A34A
Vermelho negativo: #DC2626
```

## 5.3 Identidade Visual

A interface utiliza uma identidade visual limpa, moderna e corporativa, com referência à Studio 4x no topo.

---

# 6. Componentes da Página 1 — Resumo Executivo

## 6.1 Cabeçalho

### Itens incluídos

- Branding: `Studio 4x`;
- Título: `Dashboard Google Ads — Resumo Executivo`;
- Subtítulo: `Visão geral da performance da campanha na última semana`;
- Controle visual de período: `04 mai 2026 - 10 mai 2026`.

### Objetivo

Dar contexto imediato sobre:

- Tipo de relatório;
- Período analisado;
- Identidade da agência;
- Página atual do dashboard.

---

# 7. Cards de KPI

A página possui 7 cards principais.

---

## 7.1 Investimento

### Métrica

```text
Investimento total no período
```

### Valor exibido

```text
R$ 190,04
```

### Comparativo

```text
-29,9% vs. período anterior
```

### Interpretação

Mostra quanto foi consumido em mídia paga durante o período selecionado.

---

## 7.2 Impressões

### Métrica

```text
Total de impressões
```

### Valor exibido

```text
191
```

### Comparativo

```text
-42,1% vs. período anterior
```

### Interpretação

Mostra quantas vezes os anúncios foram exibidos.

---

## 7.3 Cliques

### Métrica

```text
Total de cliques
```

### Valor exibido

```text
31
```

### Comparativo

```text
-6,1% vs. período anterior
```

### Interpretação

Mostra quantas interações diretas os anúncios receberam.

---

## 7.4 CTR

### Métrica

```text
Taxa de cliques
```

### Valor exibido

```text
16,2%
```

### Comparativo

```text
+62,3% vs. período anterior
```

### Interpretação

Mostra a relação entre impressões e cliques.

Neste exemplo, mesmo com menos impressões, a CTR aumentou bastante, indicando que os anúncios foram mais relevantes para quem visualizou.

---

## 7.5 CPC Médio

### Métrica

```text
Custo médio por clique
```

### Valor exibido

```text
R$ 6,13
```

### Comparativo

```text
-25,3% vs. período anterior
```

### Interpretação

Mostra quanto, em média, cada clique custou.

A queda do CPC deve ser interpretada como positiva.

---

## 7.6 Conversões

### Métrica

```text
Total de conversões registradas no Google Ads
```

### Valor exibido

```text
0
```

### Comparativo

```text
-100,0% vs. período anterior
```

### Interpretação

Mostra se a campanha gerou ações finais rastreadas como conversão.

Neste caso, é o principal ponto de atenção.

---

## 7.7 Custo por Conversão

### Métrica

```text
Custo médio por conversão
```

### Valor exibido

```text
R$ 0,00
```

### Comparativo

```text
-100,0% vs. período anterior
```

### Observação Importante

Como não houve conversões, esse valor não deve ser interpretado como positivo. O painel precisa deixar claro que o custo por conversão está zerado porque nenhuma conversão foi registrada.

---

# 8. Gráficos Incluídos na Página 1

---

## 8.1 Evolução diária de investimento e cliques

### Tipo

```text
Gráfico combinado
```

### Dados exibidos

- Investimento por dia;
- Cliques por dia.

### Representação visual

- Barras: investimento;
- Linha: cliques.

### Objetivo

Mostrar se os dias com maior investimento também geraram mais cliques.

### Dados de exemplo

```text
04 mai: R$ 34 / 6 cliques
05 mai: R$ 24 / 4 cliques
06 mai: R$ 29 / 6 cliques
07 mai: R$ 44 / 8 cliques
08 mai: R$ 28 / 5 cliques
09 mai: R$ 21 / 2 cliques
10 mai: R$ 10 / 0 cliques
```

---

## 8.2 Comparativo: semana atual x anterior

### Tipo

```text
Gráfico de barras agrupadas
```

### Métricas comparadas

- Investimento;
- Impressões;
- Cliques;
- Conversões.

### Objetivo

Mostrar visualmente a diferença entre o período atual e o período anterior.

### Dados de exemplo

```text
Investimento:
Semana atual: R$ 190,04
Semana anterior: R$ 271,39

Impressões:
Semana atual: 191
Semana anterior: 330

Cliques:
Semana atual: 31
Semana anterior: 33

Conversões:
Semana atual: 0
Semana anterior: 1
```

---

## 8.3 Cliques por dispositivo

### Tipo

```text
Gráfico de rosca
```

### Dados exibidos

```text
Desktop: 22 cliques / 70%
Mobile: 9 cliques / 30%
```

### Objetivo

Mostrar em quais dispositivos os usuários mais clicaram nos anúncios.

### Interpretação

Neste exemplo, o maior volume de cliques veio de desktop, o que pode indicar uma jornada mais consultiva ou B2B.

---

# 9. Bloco de Análise Textual

## 9.1 Resumo da Semana

### Tipo

```text
Painel textual interpretativo
```

### Conteúdo incluído

```text
1. O alcance caiu, acompanhando a redução nas impressões e no investimento consumido.

2. Apesar do menor volume, a CTR subiu significativamente, indicando anúncios mais relevantes para quem visualizou.

3. O principal ponto de atenção continua sendo a ausência de conversões registradas no período.
```

### Objetivo

Atender à solicitação do cliente de receber uma explicação breve sobre altas e quedas em relação ao período anterior.

---

# 10. Bloco de Próximos Passos

## 10.1 Checklist de ações

### Tipo

```text
Lista de ações recomendadas
```

### Itens incluídos

```text
1. Revisar eventos de conversão
2. Analisar termos de pesquisa
3. Ajustar lances e segmentação
4. Monitorar qualidade da página de destino
```

### Objetivo

Mostrar para o cliente que a análise gera ações práticas de otimização.

---

# 11. Rodapé

## 11.1 Informações incluídas

```text
Comparação com o período anterior: 27 abr 2026 - 03 mai 2026
Valores sujeitos a alterações
```

### Objetivo

Dar transparência sobre o período usado na comparação.

---

# 12. Fontes de Dados Previstas

## 12.1 Google Ads

Usado para:

- Custo;
- Impressões;
- Cliques;
- CTR;
- CPC médio;
- Conversões;
- Custo por conversão;
- Dados por dispositivo;
- Dados por campanha;
- Dados por grupo de anúncios;
- Dados por palavra-chave;
- Termos de pesquisa;
- Orçamento;
- Parcela de impressões;
- Impressões perdidas por orçamento;
- Impressões perdidas por classificação.

---

## 12.2 Google Analytics 4

Usado para:

- Sessões;
- Sessões engajadas;
- Taxa de engajamento;
- Taxa de rejeição;
- Visualizações;
- Eventos;
- Páginas acessadas;
- Eventos de conversão;
- Duração média da sessão.

---

## 12.3 Google Search Console

Usado para:

- Impressões orgânicas;
- Cliques orgânicos;
- CTR orgânica;
- Posição média;
- Consultas de pesquisa;
- Páginas orgânicas;
- Dispositivo;
- País.

---

## 12.4 Google Sheets

Usado como camada intermediária para:

- Consolidar dados;
- Armazenar resumos gerados por IA;
- Controlar histórico semanal;
- Alimentar o dashboard;
- Facilitar geração de PDF;
- Permitir edição manual quando necessário.

---

# 13. Abas Sugeridas no Google Sheets

```text
ads_resumo_semanal
ads_diario
ads_comparativo
ads_dispositivos
ads_campanhas
ads_grupos_anuncios
ads_palavras_chave
ads_termos_pesquisa
ads_anuncios_criativos
ads_localizacao
ads_publico
ads_orcamento_parcela_impressoes
ga4_resumo
ga4_eventos
ga4_paginas
search_console_resumo
search_console_consultas
resumo_ia
recomendacoes
historico_semanal
```

---

# 14. Integrações Previstas

## 14.1 Google Sheets

O dashboard poderá ler dados diretamente de uma planilha estruturada.

## 14.2 Apps Script ou n8n

Responsável por:

- Buscar dados periodicamente;
- Atualizar planilhas;
- Executar rotina semanal;
- Gerar resumo com IA;
- Gerar PDF;
- Enviar e-mail ao cliente.

## 14.3 PDF Automático

O dashboard poderá ser exportado como PDF usando uma das abordagens:

```text
1. Puppeteer no backend Next.js
2. Playwright no backend
3. Browserless
4. Apps Script com HTML Service
5. n8n chamando endpoint de geração
```

### Conteúdo do PDF

O PDF pode incluir:

- Página 1 — Resumo Executivo;
- Página 2 — Desempenho Geral;
- Página 3 — Campanhas;
- Página 4 — Palavras-chave e Termos de Pesquisa;
- Página 5 — Conversões;
- Página 6 — Público e Localização;
- Página 7 — Orçamento e Oportunidades;
- Página 8 — Recomendações e Histórico.

---

# 15. O que já está incluso na versão criada

## Página 1 — Resumo Executivo

```text
✅ Layout 1920 x 1080
✅ Cabeçalho com marca, título e período
✅ 7 cards de KPI
✅ Comparativo visual dos KPIs
✅ Gráfico diário de investimento e cliques
✅ Gráfico comparativo semana atual x anterior
✅ Gráfico de rosca por dispositivo
✅ Bloco de resumo da semana
✅ Bloco de próximos passos
✅ Rodapé informativo
✅ Estilo visual premium e limpo
✅ Código em React
✅ Componentização básica
✅ Uso de Recharts
✅ Uso de ícones Lucide
✅ Dados mockados para validação visual
```

---

# 16. O que ainda precisa ser implementado

## 16.1 Dados dinâmicos

Atualmente os dados estão fixos no código.

Precisa implementar:

```text
- Leitura dos dados via Google Sheets
- Endpoint API no Next.js
- Atualização automática semanal
- Filtros por cliente
- Filtros por período
```

## 16.2 Geração de PDF

Precisa implementar:

```text
- Rota para gerar PDF
- Configuração do tamanho 1920 x 1080 ou A4 horizontal
- Captura da página renderizada
- Download ou envio automático do PDF
```

## 16.3 Envio de e-mail

Precisa implementar:

```text
- Template HTML do e-mail
- Anexo do PDF
- Link do dashboard online
- Resumo IA no corpo do e-mail
- Disparo automático semanal
```

## 16.4 Autenticação

Se o dashboard ficar online, será necessário decidir entre:

```text
- Dashboard público por link
- Dashboard protegido por senha
- Dashboard com login
- Dashboard interno apenas para geração de PDF
```

---

# 17. Abas Recomendadas para o Dashboard Google Ads

## 17.1 Estrutura completa

```text
1. Resumo Executivo
2. Desempenho Geral
3. Campanhas
4. Grupos de Anúncios
5. Palavras-chave
6. Termos de Pesquisa
7. Conversões
8. Anúncios e Criativos
9. Dispositivos
10. Localização
11. Público e Segmentação
12. Orçamento e Parcela de Impressões
13. Qualidade e Diagnóstico
14. Recomendações e Plano de Ação
15. Histórico Semanal
```

## 17.2 Estrutura recomendada para cliente

```text
1. Resumo Executivo
2. Desempenho Geral
3. Campanhas
4. Palavras-chave e Termos de Pesquisa
5. Conversões
6. Público e Localização
7. Orçamento e Oportunidades
8. Recomendações
9. Histórico Semanal
```

## 17.3 Estrutura recomendada para uso interno da Studio 4x

```text
1. Resumo Executivo
2. Desempenho Geral
3. Campanhas
4. Grupos de Anúncios
5. Palavras-chave
6. Termos de Pesquisa
7. Conversões
8. Anúncios e Criativos
9. Dispositivos
10. Localização
11. Público e Segmentação
12. Orçamento e Parcela de Impressões
13. Qualidade e Diagnóstico
14. Recomendações e Plano de Ação
15. Histórico Semanal
```

---

# 18. Detalhamento das Abas

---

## 18.1 Aba 1 — Resumo Executivo

### Objetivo

Apresentar uma visão rápida e clara para o cliente entender o desempenho geral da campanha.

### Conteúdo principal

- Investimento;
- Impressões;
- Cliques;
- CTR;
- CPC médio;
- Conversões;
- Custo por conversão;
- Comparativo com período anterior;
- Gráficos principais;
- Resumo da semana;
- Próximos passos.

---

## 18.2 Aba 2 — Desempenho Geral

### Objetivo

Mostrar a evolução dos principais indicadores da conta/campanha ao longo do tempo.

### Cards principais

- Custo total;
- Impressões;
- Cliques;
- CTR;
- CPC médio;
- Conversões;
- Taxa de conversão;
- Custo por conversão;
- Valor de conversão, se disponível;
- ROAS, se aplicável.

### Gráficos

#### Evolução diária de custo, cliques e conversões

```text
Tipo: Gráfico combinado
Métricas: Custo, Cliques, Conversões
Objetivo: Entender se o investimento está acompanhando a geração de resultados.
```

#### CTR x CPC médio

```text
Tipo: Gráfico de linhas
Métricas: CTR, CPC médio
Objetivo: Avaliar se a melhora da taxa de cliques está reduzindo ou aumentando o custo por clique.
```

#### Conversões x custo por conversão

```text
Tipo: Gráfico combinado
Métricas: Conversões, Custo por conversão
Objetivo: Identificar se a campanha está gerando mais conversões com menor custo.
```

---

## 18.3 Aba 3 — Campanhas

### Objetivo

Avaliar quais campanhas estão consumindo mais orçamento e quais estão entregando melhor resultado.

### Cards

- Campanha com maior investimento;
- Campanha com mais cliques;
- Campanha com menor CPC;
- Campanha com mais conversões;
- Campanha com menor custo por conversão.

### Tabela principal

```text
Campanha
Status
Orçamento diário
Custo
Impressões
Cliques
CTR
CPC médio
Conversões
Taxa de conversão
Custo por conversão
Parcela de impressões
Parcela de impressões perdida por orçamento
Parcela de impressões perdida por classificação
```

### Gráficos

- Ranking de campanhas por custo;
- Ranking de campanhas por conversões;
- Custo x conversões por campanha.

### Alertas úteis

- Campanha com alto custo e zero conversões;
- Campanha com CTR baixo;
- Campanha com CPC elevado;
- Campanha limitada por orçamento;
- Campanha perdendo muita impressão por classificação.

---

## 18.4 Aba 4 — Grupos de Anúncios

### Objetivo

Analisar a performance dentro de cada campanha, identificando quais grupos de anúncios estão funcionando melhor.

### Tabela principal

```text
Campanha
Grupo de anúncios
Custo
Impressões
Cliques
CTR
CPC médio
Conversões
Taxa de conversão
Custo por conversão
```

### Gráficos

- Grupos com maior custo;
- Grupos com maior CTR;
- Grupos com pior custo por conversão.

### Insights esperados

- Quais grupos devem receber mais verba?
- Quais grupos devem ser pausados ou revisados?
- Quais grupos têm tráfego, mas não geram conversão?

---

## 18.5 Aba 5 — Palavras-chave

### Objetivo

Avaliar quais palavras-chave geram tráfego, consomem orçamento e trazem conversões.

### Cards

- Palavra-chave com mais cliques;
- Palavra-chave com maior custo;
- Palavra-chave com maior CTR;
- Palavra-chave com menor CPC;
- Palavra-chave com mais conversões.

### Tabela principal

```text
Campanha
Grupo de anúncios
Palavra-chave
Tipo de correspondência
Status
Custo
Impressões
Cliques
CTR
CPC médio
Conversões
Taxa de conversão
Custo por conversão
Parcela de impressões
Parcela no topo
Parcela na 1ª posição
Índice de qualidade
```

### Gráficos

- Palavras-chave com maior investimento;
- Palavras-chave com mais cliques;
- Palavras-chave com melhor CTR;
- Palavras-chave com pior desempenho.

### Alertas úteis

- Palavra-chave com custo alto e zero conversões;
- Palavra-chave com CTR baixo;
- Palavra-chave com CPC alto;
- Palavra-chave com muitas impressões e poucos cliques;
- Palavra-chave com boa CTR, mas sem conversão.

---

## 18.6 Aba 6 — Termos de Pesquisa

### Objetivo

Mostrar exatamente o que as pessoas pesquisaram antes de clicar no anúncio.

### Cards

- Termo com mais cliques;
- Termo com maior custo;
- Termo com melhor CTR;
- Termos sem conversão;
- Total de termos analisados.

### Tabela principal

```text
Termo de pesquisa
Campanha
Grupo de anúncios
Cliques
Impressões
CTR
CPC médio
Custo
Conversões
Taxa de conversão
Custo por conversão
Status recomendado
```

### Campo: Status recomendado

```text
Adicionar como palavra-chave
Manter em observação
Adicionar como negativa
Revisar intenção
```

### Regras sugeridas

```text
Se termo tem muitos cliques, bom CTR e boa intenção:
Adicionar como palavra-chave

Se termo tem alto custo e zero conversões:
Revisar intenção

Se termo é irrelevante:
Adicionar como negativa

Se termo tem baixo volume:
Manter em observação
```

### Gráficos

- Termos com maior custo;
- Termos com mais cliques;
- Termos com CTR mais alto;
- Termos a negativar.

---

## 18.7 Aba 7 — Conversões

### Objetivo

Avaliar as ações finais geradas pelas campanhas.

Essa aba deve separar bem:

```text
Conversões registradas no Google Ads
Eventos de interação no site
Possíveis problemas de rastreamento
```

### Cards

- Conversões;
- Taxa de conversão;
- Custo por conversão;
- Cliques em WhatsApp;
- Inícios de formulário;
- Envios de formulário;
- Eventos de contato;
- Conversões importadas do GA4.

### Gráficos

#### Funil de conversão

```text
Impressões
Cliques
Sessões
Interações
Conversões
```

#### Conversões por dia

```text
Tipo: Série temporal
```

#### Eventos principais do site

```text
page_view
first_visit
form_start
click_to_chat
generate_lead
conversion_event_contact
phone_click
whatsapp_click
form_submit
```

### Tabela principal

```text
Nome da conversão
Origem
Categoria
Status
Conversões
Taxa de conversão
Custo por conversão
Último disparo
```

### Alertas úteis

- Sem conversões no período;
- Evento existe no GA4, mas não aparece no Google Ads;
- Conversão sem disparo recente;
- Custo elevado sem conversões;
- Alto volume de cliques sem ação final.

---

## 18.8 Aba 8 — Anúncios e Criativos

### Objetivo

Avaliar quais anúncios, títulos, descrições ou assets estão gerando melhor engajamento.

### Cards

- Anúncio com maior CTR;
- Anúncio com mais cliques;
- Anúncio com maior custo;
- Anúncio com menor CPC;
- Anúncio com mais conversões.

### Tabela principal

```text
Campanha
Grupo de anúncios
Anúncio
Tipo de anúncio
Status
Impressões
Cliques
CTR
CPC médio
Custo
Conversões
Custo por conversão
Força do anúncio
```

### Para campanhas responsivas

```text
Título
Descrição
Tipo de asset
Performance
Impressões
Cliques
CTR
Conversões
```

### Gráficos

- Anúncios por CTR;
- Assets com melhor performance;
- Assets com baixa performance.

---

## 18.9 Aba 9 — Dispositivos

### Objetivo

Entender a performance por dispositivo.

### Cards

- Dispositivo com mais cliques;
- Dispositivo com mais conversões;
- Dispositivo com menor CPC;
- Dispositivo com menor custo por conversão.

### Tabela principal

```text
Dispositivo
Custo
Impressões
Cliques
CTR
CPC médio
Conversões
Taxa de conversão
Custo por conversão
```

### Gráficos

- Distribuição de cliques por dispositivo;
- Custo por dispositivo;
- Conversões por dispositivo;
- CPC por dispositivo.

---

## 18.10 Aba 10 — Localização

### Objetivo

Analisar a performance por cidade, região, estado ou país.

### Cards

- Cidade com mais cliques;
- Cidade com maior custo;
- Cidade com mais conversões;
- Estado com melhor desempenho;
- País principal.

### Gráficos

- Mapa de cliques;
- Cidades com mais cliques;
- Cidades com maior custo;
- Cidades com maior taxa de conversão.

### Tabela principal

```text
País
Estado
Cidade
Custo
Impressões
Cliques
CTR
CPC médio
Conversões
Taxa de conversão
Custo por conversão
```

---

## 18.11 Aba 11 — Público e Segmentação

### Objetivo

Avaliar quem está interagindo com os anúncios.

### Cards

- Faixa etária com mais cliques;
- Gênero com mais cliques;
- Público com maior CTR;
- Público com maior conversão;
- Segmentação com pior desempenho.

### Gráficos

- Cliques por idade;
- Cliques por gênero;
- Conversões por idade;
- Custo por conversão por público.

### Tabela principal

```text
Dimensão de público
Segmento
Custo
Impressões
Cliques
CTR
CPC médio
Conversões
Taxa de conversão
Custo por conversão
```

---

## 18.12 Aba 12 — Orçamento e Parcela de Impressões

### Objetivo

Mostrar se a campanha está limitada por orçamento ou perdendo oportunidades por baixa classificação.

### Cards

- Orçamento médio diário;
- Custo total;
- Parcela de impressões;
- Parcela de impressões no topo;
- Parcela de impressões na primeira posição;
- Impressões perdidas por orçamento;
- Impressões perdidas por classificação.

### Gráficos

- Impressões perdidas por orçamento x classificação;
- Parcela de impressões ao longo do tempo;
- Custo x orçamento diário.

### Tabela principal

```text
Campanha
Orçamento diário
Custo
Parcela de impressões
Parcela topo
Parcela primeira posição
Impressões perdidas por orçamento
Impressões perdidas por classificação
```

### Insights esperados

- A campanha está limitada por verba?
- Está perdendo espaço por baixa classificação?
- Precisa aumentar orçamento?
- Precisa melhorar índice de qualidade, anúncio ou landing page?

---

## 18.13 Aba 13 — Qualidade e Diagnóstico

### Objetivo

Identificar problemas técnicos ou estratégicos que afetam o desempenho.

### Indicadores

- Índice de qualidade médio;
- CTR esperado;
- Relevância do anúncio;
- Experiência na página de destino;
- Status das conversões;
- Campanhas limitadas por orçamento;
- Campanhas limitadas por classificação;
- Palavras-chave abaixo da primeira página;
- Anúncios reprovados;
- Anúncios limitados.

### Tabela principal

```text
Tipo de problema
Campanha
Grupo
Item afetado
Métrica relacionada
Diagnóstico
Ação recomendada
Prioridade
```

### Status de prioridade

```text
Alta
Média
Baixa
```

---

## 18.14 Aba 14 — Recomendações e Plano de Ação

### Objetivo

Transformar os dados em ações práticas.

### Cada recomendação deve conter

```text
Categoria
Diagnóstico
Impacto esperado
Ação recomendada
Prioridade
Status
Responsável
Prazo
```

### Categorias sugeridas

```text
Conversões
Palavras-chave
Termos de pesquisa
Anúncios
Orçamento
Segmentação
Landing page
Rastreamento
```

### Exemplo

```text
Categoria: Conversões
Diagnóstico: A campanha gerou cliques, mas nenhuma conversão foi registrada no Google Ads.
Impacto: Alto
Ação: Revisar configuração dos eventos no GA4 e importação para o Google Ads.
Prioridade: Alta
Status: Em análise
```

### Visualizações

- Tabela Kanban por status;
- Cards por prioridade;
- Lista de ações da semana;
- Ações concluídas;
- Ações pendentes.

---

## 18.15 Aba 15 — Histórico Semanal

### Objetivo

Criar uma visão de evolução ao longo das semanas.

### Tabela histórica

```text
Semana
Investimento
Impressões
Cliques
CTR
CPC médio
Conversões
Taxa de conversão
Custo por conversão
Resumo da semana
Ações realizadas
```

### Gráficos

- Evolução semanal de investimento;
- Evolução semanal de conversões;
- Evolução semanal de custo por conversão;
- Evolução semanal de CTR e CPC.

### Insights esperados

- A campanha está melhorando com o tempo?
- O custo por conversão está caindo?
- O volume está crescendo?
- As ações realizadas estão impactando os resultados?

---

# 19. SPEC CSS / Design System

## 19.1 Objetivo do CSS

O CSS do dashboard foi pensado para criar uma interface:

- Limpa;
- Executiva;
- Moderna;
- Fácil de ler;
- Adequada para visualização em tela;
- Adequada para exportação em PDF;
- Com aparência profissional semelhante a dashboards premium de BI.

---

## 19.2 Tecnologia de Estilização

```text
Tailwind CSS
```

Exemplo:

```tsx
<div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
```

Essa abordagem facilita:

- Padronização visual;
- Reaproveitamento de componentes;
- Ajuste rápido de espaçamentos;
- Responsividade futura;
- Conversão para PDF com layout consistente.

---

## 19.3 Dimensão Base do Dashboard

```css
width: 1920px;
height: 1080px;
```

No código:

```tsx
<div className="mx-auto h-[1080px] w-[1920px] overflow-hidden rounded-3xl border border-gray-200 bg-[#F7F9FC] shadow-xl">
```

---

## 19.4 Estrutura Visual Geral

### Fundo externo

```css
background-color: #F7F9FC;
padding: 24px;
```

Tailwind:

```tsx
<main className="min-h-screen bg-[#F7F9FC] p-6 font-sans text-gray-950">
```

### Container principal

```css
width: 1920px;
height: 1080px;
background-color: #F7F9FC;
border-radius: 24px;
border: 1px solid #E5E7EB;
box-shadow: large;
overflow: hidden;
```

Tailwind:

```tsx
mx-auto
h-[1080px]
w-[1920px]
overflow-hidden
rounded-3xl
border
border-gray-200
bg-[#F7F9FC]
shadow-xl
```

---

## 19.5 Paleta de Cores

```css
--blue-main: #2563EB;
--blue-light: #BFDBFE;
--green-positive: #16A34A;
--red-negative: #DC2626;
--text-main: #111827;
--text-muted: #6B7280;
--background-page: #F7F9FC;
--card-background: #FFFFFF;
--border-light: #E5E7EB;
```

### Azul principal

```css
#2563EB
```

Usado em:

- Logo/branding;
- Ícones principais;
- Linhas dos gráficos;
- Destaques;
- Checks;
- Elementos ativos.

### Azul claro

```css
#BFDBFE
```

Usado em:

- Barras secundárias;
- Comparativo com período anterior;
- Fundos suaves de ícones;
- Segmentos secundários de gráficos.

### Verde

```css
#16A34A
```

Usado para indicadores positivos.

### Vermelho

```css
#DC2626
```

Usado para indicadores negativos ou pontos de atenção.

---

## 19.6 Tipografia

### Fonte principal

```css
font-family: sans-serif;
```

Tailwind:

```tsx
font-sans
```

### Logo

```css
font-size: 40px;
font-weight: 800;
letter-spacing: -0.025em;
color: #2563EB;
```

### Título principal

```css
font-size: 38px;
font-weight: 800;
letter-spacing: -0.025em;
color: #111827;
```

### Subtítulo

```css
font-size: 20px;
color: #6B7280;
```

### Título dos cards KPI

```css
font-size: 17px;
font-weight: 600;
color: #111827;
```

### Valor dos cards KPI

```css
font-size: 35px;
font-weight: 700;
line-height: 1;
color: #111827;
```

### Variação percentual

```css
font-size: 17px;
font-weight: 700;
```

A cor muda conforme o status:

```css
positivo: #16A34A;
negativo: #DC2626;
```

### Títulos dos gráficos

```css
font-size: 21px;
font-weight: 700;
color: #111827;
```

### Títulos dos blocos de análise

```css
font-size: 22px;
font-weight: 700;
color: #111827;
```

### Texto dos insights

```css
font-size: 19px;
line-height: 1.35;
color: #111827;
```

### Rodapé

```css
font-size: 15px;
color: #6B7280;
```

---

## 19.7 Header / Cabeçalho

```css
height: 116px;
background-color: #FFFFFF;
border-bottom: 1px solid #E5E7EB;
padding-left: 40px;
padding-right: 40px;
display: flex;
align-items: center;
justify-content: space-between;
```

Tailwind:

```tsx
flex
h-[116px]
items-center
justify-between
border-b
border-gray-200
bg-white
px-10
```

### Divisor vertical

```css
height: 72px;
width: 1px;
background-color: #D1D5DB;
```

Tailwind:

```tsx
h-[72px]
w-px
bg-gray-300
```

### Controle de período

```css
width: 420px;
height: 64px;
border-radius: 16px;
border: 1px solid #D1D5DB;
background-color: #FFFFFF;
padding: 0 24px;
font-size: 18px;
font-weight: 600;
box-shadow: small;
```

---

## 19.8 Sistema de Cards

### Card base

```css
border-radius: 16px;
border: 1px solid #E5E7EB;
background-color: #FFFFFF;
box-shadow: 0 1px 2px rgba(0,0,0,0.05);
```

Tailwind:

```tsx
rounded-2xl
border
border-gray-200
bg-white
shadow-sm
```

### Componente base

```tsx
function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}
```

---

## 19.9 Cards de KPI

### Layout

```css
height: 150px;
padding: 20px;
```

Tailwind:

```tsx
h-[150px]
p-5
```

### Grid dos KPIs

```css
display: grid;
grid-template-columns: repeat(7, 1fr);
gap: 20px;
padding-left: 24px;
padding-right: 24px;
padding-top: 28px;
```

Tailwind:

```tsx
grid
grid-cols-7
gap-5
px-6
pt-7
```

### Ícone do KPI

```css
width: 36px;
height: 36px;
border-radius: 9999px;
background-color: #2563EB;
color: #FFFFFF;
display: flex;
align-items: center;
justify-content: center;
```

---

## 19.10 Grid dos Gráficos

```css
grid-template-columns: 1.45fr 1fr 0.9fr;
gap: 20px;
padding-left: 24px;
padding-right: 24px;
padding-top: 24px;
```

Tailwind:

```tsx
grid
grid-cols-[1.45fr_1fr_0.9fr]
gap-5
px-6
pt-6
```

### Altura dos cards de gráfico

```css
height: 360px;
padding: 24px;
```

---

## 19.11 Estilo dos Gráficos

Biblioteca:

```text
Recharts
```

### Grade dos gráficos

```tsx
<CartesianGrid stroke="#E5E7EB" vertical={false} />
```

### Eixos

```tsx
tick={{ fill: "#6B7280", fontSize: 14 }}
```

### Linha dos eixos

```tsx
axisLine={{ stroke: "#CBD5E1" }}
```

### Legenda

```tsx
<Legend verticalAlign="top" align="left" iconType="circle" />
```

### Tooltip

```tsx
<Tooltip formatter={tooltipFormatter} />
```

---

## 19.12 Gráfico combinado — Investimento e Cliques

### Barras

```tsx
<Bar
  fill="#BFDBFE"
  radius={[8, 8, 0, 0]}
  barSize={42}
/>
```

### Linha

```tsx
<Line
  stroke="#2563EB"
  strokeWidth={4}
  dot={{ r: 6, fill: "#2563EB" }}
/>
```

---

## 19.13 Gráfico comparativo

### Barras da semana atual

```tsx
fill="#2563EB"
radius={[8, 8, 0, 0]}
barSize={32}
```

### Barras da semana anterior

```tsx
fill="#BFDBFE"
radius={[8, 8, 0, 0]}
barSize={32}
```

---

## 19.14 Gráfico de rosca

```tsx
innerRadius={78}
outerRadius={124}
paddingAngle={2}
stroke="#FFFFFF"
strokeWidth={3}
```

### Cores dos segmentos

```tsx
const COLORS = ["#2563EB", "#BFDBFE"];
```

---

## 19.15 Blocos inferiores

### Grid inferior

```css
display: grid;
grid-template-columns: 1fr 1fr;
gap: 20px;
padding-left: 24px;
padding-right: 24px;
padding-top: 24px;
```

Tailwind:

```tsx
grid
grid-cols-[1fr_1fr]
gap-5
px-6
pt-6
```

### Altura dos cards

```css
height: 278px;
padding: 24px;
```

---

## 19.16 Título de seção

```tsx
function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white">
        <Icon size={19} />
      </div>
      <h2 className="text-[22px] font-bold text-gray-950">{title}</h2>
    </div>
  );
}
```

---

## 19.17 Bloco “Resumo da semana”

### Estrutura dos insights

```css
display: grid;
grid-template-columns: 64px 1fr;
align-items: center;
gap: 16px;
padding-bottom: 20px;
border-bottom: 1px solid #E5E7EB;
```

### Ícone azul

```css
width: 48px;
height: 48px;
border-radius: 9999px;
background-color: #DBEAFE;
color: #2563EB;
```

### Ícone verde

```css
background-color: #DCFCE7;
color: #15803D;
```

### Ícone vermelho

```css
background-color: #FEE2E2;
color: #DC2626;
```

---

## 19.18 Bloco “Próximos passos”

### Estrutura

```css
margin-top: 12px;
divide-y: 1px solid #E5E7EB;
```

### Item individual

```css
display: flex;
align-items: center;
gap: 16px;
padding-top: 16px;
padding-bottom: 16px;
font-size: 19px;
color: #111827;
```

### Ícone check

```css
color: #2563EB;
width: 28px;
height: 28px;
```

---

## 19.19 Rodapé

```css
height: 52px;
margin-left: 24px;
margin-right: 24px;
margin-top: 20px;
display: flex;
align-items: center;
justify-content: space-between;
border-radius: 16px;
border: 1px solid #E5E7EB;
background-color: #FFFFFF;
padding-left: 24px;
padding-right: 24px;
font-size: 15px;
color: #6B7280;
box-shadow: small;
```

---

## 19.20 Espaçamentos Gerais

```text
Padding externo: 24px
Padding dos cards grandes: 24px
Padding dos cards KPI: 20px
Gap padrão entre elementos: 20px
Gap interno entre ícones e textos: 12px ou 16px
```

---

## 19.21 Bordas e Arredondamentos

```text
Cards principais: 16px
Container da página: 24px
Ícones circulares: 9999px
Controle de período: 16px
```

---

## 19.22 Sombras

### Sombra leve dos cards

```css
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
```

### Sombra do container principal

```css
box-shadow: 0 20px 25px -5px rgba(0,0,0,.1),
            0 8px 10px -6px rgba(0,0,0,.1);
```

---

## 19.23 Estados Visuais

### Positivo

Usado quando a métrica representa melhora:

```text
CTR subiu
CPC caiu
Conversões subiram
Custo por conversão caiu
```

CSS:

```css
color: #16A34A;
```

### Negativo

Usado quando a métrica representa piora:

```text
Cliques caíram
Impressões caíram
Conversões caíram
CPC subiu
Custo por conversão subiu
```

CSS:

```css
color: #DC2626;
```

### Neutro

Usado para textos informativos:

```css
color: #6B7280;
```

---

## 19.24 Ícones

### Biblioteca

```text
lucide-react
```

### Ícones utilizados

```text
CalendarDays
MousePointerClick
Eye
Target
DollarSign
Percent
TrendingUp
TrendingDown
AlertTriangle
CheckCircle2
BarChart3
Lightbulb
ClipboardCheck
Info
```

### Padrão visual

- Ícones de KPI ficam dentro de círculos azuis;
- Ícones de insight ficam dentro de círculos suaves;
- Ícones de alerta usam fundo vermelho claro;
- Ícones de melhoria usam fundo verde claro;
- Ícones de ação usam azul principal.

---

## 19.25 Responsividade

### Estado atual

A primeira versão foi construída com tamanho fixo:

```css
width: 1920px;
height: 1080px;
```

Isso é proposital para:

- Exportação em PDF;
- Captura de imagem;
- Relatórios semanais padronizados.

### Responsividade futura

Para transformar em dashboard responsivo, substituir classes fixas como:

```tsx
w-[1920px]
h-[1080px]
grid-cols-7
grid-cols-[1.45fr_1fr_0.9fr]
```

Por classes responsivas como:

```tsx
w-full
min-h-screen
grid-cols-1
md:grid-cols-2
xl:grid-cols-4
2xl:grid-cols-7
```

### Recomendação

Para este projeto específico, manter tamanho fixo é melhor, porque o foco é gerar páginas padronizadas para PDF.

---

## 19.26 CSS equivalente em formato tradicional

```css
:root {
  --blue-main: #2563EB;
  --blue-light: #BFDBFE;
  --green-positive: #16A34A;
  --red-negative: #DC2626;
  --text-main: #111827;
  --text-muted: #6B7280;
  --background-page: #F7F9FC;
  --card-background: #FFFFFF;
  --border-light: #E5E7EB;
}

.dashboard-page {
  min-height: 100vh;
  background: var(--background-page);
  padding: 24px;
  font-family: Arial, Helvetica, sans-serif;
  color: var(--text-main);
}

.dashboard-canvas {
  width: 1920px;
  height: 1080px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid var(--border-light);
  background: var(--background-page);
  box-shadow: 0 20px 25px -5px rgba(0,0,0,.1),
              0 8px 10px -6px rgba(0,0,0,.1);
}

.dashboard-header {
  height: 116px;
  background: #fff;
  border-bottom: 1px solid var(--border-light);
  padding: 0 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dashboard-logo {
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: var(--blue-main);
}

.dashboard-title {
  font-size: 38px;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: var(--text-main);
}

.dashboard-subtitle {
  margin-top: 4px;
  font-size: 20px;
  color: var(--text-muted);
}

.card {
  border-radius: 16px;
  border: 1px solid var(--border-light);
  background: var(--card-background);
  box-shadow: 0 1px 2px rgba(0,0,0,.05);
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 20px;
  padding: 28px 24px 0;
}

.kpi-card {
  height: 150px;
  padding: 20px;
}

.kpi-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-main);
}

.kpi-value {
  margin-top: 12px;
  font-size: 35px;
  font-weight: 700;
  line-height: 1;
  color: var(--text-main);
}

.kpi-delta {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 17px;
  font-weight: 700;
}

.kpi-delta.positive {
  color: var(--green-positive);
}

.kpi-delta.negative {
  color: var(--red-negative);
}

.kpi-comparison {
  margin-top: 4px;
  font-size: 15px;
  color: var(--text-muted);
}

.chart-grid {
  display: grid;
  grid-template-columns: 1.45fr 1fr 0.9fr;
  gap: 20px;
  padding: 24px 24px 0;
}

.chart-card {
  height: 360px;
  padding: 24px;
}

.chart-title {
  margin-bottom: 12px;
  font-size: 21px;
  font-weight: 700;
  color: var(--text-main);
}

.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding: 24px 24px 0;
}

.analysis-card {
  height: 278px;
  padding: 24px;
}

.section-title {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-title-icon {
  width: 36px;
  height: 36px;
  border-radius: 9999px;
  background: var(--blue-main);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-title-text {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-main);
}

.insight-item {
  display: grid;
  grid-template-columns: 64px 1fr;
  align-items: center;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-light);
}

.insight-text {
  font-size: 19px;
  line-height: 1.35;
  color: var(--text-main);
}

.footer {
  height: 52px;
  margin: 20px 24px 0;
  padding: 0 24px;
  border-radius: 16px;
  border: 1px solid var(--border-light);
  background: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  color: var(--text-muted);
}
```

---

# 20. Diretrizes para manter consistência nas próximas páginas

## Sempre usar

```text
Fundo: #F7F9FC
Cards: #FFFFFF
Bordas: #E5E7EB
Azul principal: #2563EB
Texto principal: #111827
Texto secundário: #6B7280
Raio dos cards: 16px
Gap padrão: 20px
Padding dos cards: 24px
```

## Títulos das páginas

```text
38px
font-weight: 800
cor: #111827
```

## Títulos de seção

```text
21px a 22px
font-weight: 700
cor: #111827
```

## Cards KPI

```text
altura: 150px
padding: 20px
valor principal: 35px
```

## Gráficos

```text
altura média: 320px a 360px
cards com padding 24px
legendas no topo
grade horizontal suave
cores principais em azul
```

---

# 21. Resultado Esperado

Ao final da implementação, o sistema deverá permitir:

```text
1. Atualizar dados automaticamente.
2. Gerar um dashboard visual por cliente.
3. Criar um PDF semanal.
4. Enviar o relatório por e-mail.
5. Exibir resumo IA com justificativas de alta ou queda.
6. Reduzir a dependência do Looker Studio.
7. Criar um padrão escalável para todos os clientes da Studio 4x.
```

---

# 22. Observação técnica importante

A versão atual é uma primeira página visual com dados mockados.

Ela serve como base para:

```text
- Aprovação visual;
- Validação da estrutura;
- Definição dos componentes;
- Desenvolvimento do dashboard dinâmico;
- Criação das próximas páginas.
```

A próxima etapa recomendada é criar a estrutura de dados no Google Sheets para substituir os dados fixos do React.
