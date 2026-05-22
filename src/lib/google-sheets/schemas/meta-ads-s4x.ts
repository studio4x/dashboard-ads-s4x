import { TemplateSchema } from "./google-ads-s4x";

// Colunas obrigatórias da aba de dados do Meta Ads (independente do nome da aba)
export const META_ADS_REQUIRED_COLUMNS = ["Campaign Name", "Amount Spent", "Impressions", "Day"];
export const META_ADS_EXPECTED_COLUMNS = [
  "Campaign Name", "Ad Set Name", "Ad Name", "Reach", "Impressions",
  "Frequency", "Amount Spent", "CPM (Cost per 1,000 Impressions)",
  "Link Clicks", "CPC (All)", "CTR (All)", "Messaging Conversations Started",
  "Cost per Messaging Conversations Started", "Post Engagement",
  "Post Comments", "Post Reactions", "Post Shares",
  "Leads", "On-Facebook Leads", "Website Leads", "Offline Leads",
  "Cost per Lead", "Cost per On-Facebook Lead", "Cost per Website Lead", "Cost per Offline Lead",
  "Day"
];

export const META_ADS_S4X_SCHEMA: TemplateSchema = {
  id: "meta_ads_s4x",
  version: "1.0",
  tabs: {
    "Meta": {
      required: false,
      criticalColumns: ["Chave", "Valor"],
      expectedColumns: [],
      type: "key_value",
      criticalKeys: ["Conta_ID", "Data_Inicial", "Data_Final", "Timezone"]
    },
    "Dashboard_Config": {
      required: false,
      criticalColumns: ["Chave", "Valor"],
      expectedColumns: [],
      type: "key_value",
      criticalKeys: ["Template", "Versao_Template", "Fonte", "Data_Inicial", "Data_Final"]
    },
    // "Performance Diária" é apenas um nome PREFERENCIAL — o import service busca
    // em qualquer aba que contenha as colunas obrigatórias se esta não existir.
    "Performance Diária": {
      required: false,
      criticalColumns: META_ADS_REQUIRED_COLUMNS,
      expectedColumns: META_ADS_EXPECTED_COLUMNS,
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
