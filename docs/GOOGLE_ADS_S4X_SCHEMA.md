# Google Ads S4X — Schema da Planilha

Este documento define a estrutura obrigatória da planilha Google Sheets para o template `google_ads_s4x`.

## Identificação
- **Template ID:** `google_ads_s4x`
- **Versão:** `1.0`

## Abas Obrigatórias
O importador exige a presença das seguintes abas (nomes exatos):

1. **Meta**: Informações de sincronização.
2. **Dashboard_Config**: Configuração de nome, cliente e versão.
3. **Performance Diária**: Timeline de métricas (Custo, Cliques, Impressões, Conversões).
4. **Campanhas**: Performance consolidada por campanha.
5. **Grupos de Anúncios**: Performance por Ad Group.
6. **Palavras-Chave**: Performance por Keyword.
7. **Termos de Pesquisa**: O que os usuários digitaram.
8. **Palavras-Chave Negativas**: Lista de termos excluídos.
9. **Anúncios (Recursos)**: Performance de criativos e extensões.

## Colunas Críticas (Exemplos)
Todas as abas de performance devem conter:
- `Campanha`
- `Custo`
- `Cliques`
- `Impressões`
- `Conversões`
- `Valor de conv.`

## Regras de Processamento
- **TOTAL/MÉDIA:** O sistema ignora linhas que contenham "Total" ou "Média" na primeira coluna para evitar dupla contagem.
- **Valores Vazios:** Células vazias em colunas numéricas são tratadas como `0`.
- **Escala:** Percentuais são normalizados para base 100 (ex: 0.05 vira 5.0).
- **Moeda:** Símbolos de moeda e separadores de milhar são removidos antes da conversão para Number.

## Aba Export_Logs (Opcional)
Se presente, o sistema pode usar esta aba para auditoria e log de exportação direta do Google Ads.
