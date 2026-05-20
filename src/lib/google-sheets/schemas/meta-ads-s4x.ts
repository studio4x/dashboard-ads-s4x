import { TemplateSchema } from "./google-ads-s4x";

export const META_ADS_S4X_SCHEMA: TemplateSchema = {
  id: "meta_ads_s4x",
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
      criticalColumns: ["Campaign Name", "Amount Spent", "Impressions", "Day"],
      expectedColumns: [
        "Campaign Name", "Ad Set Name", "Ad Name", "Reach", "Impressions", 
        "Frequency", "Amount Spent", "CPM (Cost per 1,000 Impressions)", 
        "Link Clicks", "CPC (All)", "CTR (All)", "Messaging Conversations Started", 
        "Cost per Messaging Conversations Started", "Post Engagement", 
        "Post Comments", "Post Reactions", "Post Shares", "Day"
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
