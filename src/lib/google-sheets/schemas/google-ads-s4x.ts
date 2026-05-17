export interface TabSchema {
  required: boolean;
  criticalColumns: string[];
  expectedColumns: string[];
  type: "key_value" | "table";
  criticalKeys?: string[];
}

export interface TemplateSchema {
  id: string;
  version: string;
  tabs: Record<string, TabSchema>;
}

export const GOOGLE_ADS_S4X_SCHEMA: TemplateSchema = {
  id: "google_ads_s4x",
  version: "1.0",
  tabs: {
    "Meta": {
      required: true,
      criticalColumns: ["Chave", "Valor"],
      expectedColumns: [],
      type: "key_value",
      criticalKeys: ["Conta_ID", "Data_Inicial", "Data_Final", "Timezone"]
    },
    "Dashboard_Config": {
      required: true,
      criticalColumns: ["Chave", "Valor"],
      expectedColumns: [],
      type: "key_value",
      criticalKeys: ["Template", "Versao_Template", "Fonte", "Data_Inicial", "Data_Final"]
    },
    "Performance Diária": {
      required: true,
      criticalColumns: ["Data", "Campanha", "Impressões", "Cliques", "Custo (R$)", "Conversões", "Valor das Conversões (R$)", "Chave_IA"],
      expectedColumns: [
        "Data", "Campanha", "Status da Campanha", "Tipo de Canal",
        "Impressões", "Cliques", "Custo (R$)", "Conversões", 
        "Valor das Conversões (R$)", "Todas as Conversões", 
        "Valor Total Conversões (R$)", "Chave_IA"
      ],
      type: "table"
    },
    "Campanhas": {
      required: true,
      criticalColumns: ["Campanha", "Impressões", "Cliques", "Custo (R$)", "Conversões", "Valor das Conversões (R$)", "Chave_IA"],
      expectedColumns: [
        "Campanha", "Status da Campanha", "Tipo de Canal", "Impressões", 
        "Cliques", "Custo (R$)", "Conversões", "Valor das Conversões (R$)", 
        "Todas as Conversões", "Valor Total Conversões (R$)", 
        "Interações", "Parcela de impr. da rede de pesquisa", 
        "Perda por Rank (Search)", "Perda por Orçamento (Search)", "Chave_IA"
      ],
      type: "table"
    },
    "Grupos de Anúncios": {
      required: true,
      criticalColumns: ["Campanha", "Grupo de Anúncios", "Impressões", "Cliques", "Custo (R$)", "Conversões", "Valor das Conversões (R$)", "Chave_IA"],
      expectedColumns: [
        "Campanha", "Grupo de Anúncios", "Status do Grupo", "Impressões", 
        "Cliques", "Custo (R$)", "Conversões", "Valor das Conversões (R$)", 
        "Interações", "Chave_IA"
      ],
      type: "table"
    },
    "Palavras-Chave": {
      required: true,
      criticalColumns: ["Campanha", "Grupo de Anúncios", "Palavra-chave", "Tipo de Correspondência", "Impressões", "Cliques", "Custo (R$)", "Conversões", "Valor das Conversões (R$)", "Chave_IA"],
      expectedColumns: [
        "Campanha", "Grupo de Anúncios", "Palavra-chave", "Tipo de Correspondência", "Status", 
        "Índice de Qualidade", "Qualidade Criativa", "Qualidade Pós-clique", 
        "CTR Previsto (Search)", "Impressões", "Cliques", "Custo (R$)", 
        "Conversões", "Valor das Conversões (R$)", "Chave_IA"
      ],
      type: "table"
    },
    "Termos de Pesquisa": {
      required: true,
      criticalColumns: ["Campanha", "Grupo de Anúncios", "Termo de Pesquisa", "Impressões", "Cliques", "Custo (R$)", "Conversões", "Valor das Conversões (R$)", "Chave_IA"],
      expectedColumns: [
        "Campanha", "Grupo de Anúncios", "Tipo de Correspondência (Termo)", "Termo de Pesquisa", 
        "Status do Termo", "Impressões", "Cliques", 
        "Custo (R$)", "Conversões", "Valor das Conversões (R$)", "Chave_IA"
      ],
      type: "table"
    },
    "Palavras-Chave Negativas": {
      required: true,
      criticalColumns: ["Campanha", "Palavra-Chave Negativa", "Tipo de Correspondência", "Chave_IA"],
      expectedColumns: ["Campanha", "Origem da Negativa", "Lista Negativa", "Palavra-Chave Negativa", "Tipo de Correspondência", "Chave_IA"],
      type: "table"
    },
    "Anúncios (Recursos)": {
      required: true,
      criticalColumns: ["Campanha", "Grupo de Anúncios", "Tipo de Recurso", "Recurso (Texto)", "Origem das Métricas", "Chave_IA"],
      expectedColumns: [
        "Campanha", "Grupo de Anúncios", "Status do Anúncio", "Tipo de Recurso", "Recurso (Texto)", 
        "Origem das Métricas", "Impressões", "Cliques", "Custo (R$)", "Conversões", "Valor das Conversões (R$)", "Chave_IA"
      ],
      type: "table"
    },
    "Export_Logs": {
      required: false,
      criticalColumns: [],
      expectedColumns: [],
      type: "table"
    }
  }
};
