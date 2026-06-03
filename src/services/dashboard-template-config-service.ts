import { createAdminClient } from "@/lib/supabase/server";

export interface DashboardTemplateConfigRecord {
  template_id: string;
  metric_config: Record<string, unknown>;
  updated_at?: string;
}

function isMissingRelationError(error: any) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("does not exist") || message.includes("relation") || message.includes("not exist");
}

export const DashboardTemplateConfigService = {
  async getAllTemplateConfigs() {
    try {
      const supabase = await createAdminClient({ actor: "admin", action: "template-config:list" });
      const { data, error } = await supabase
        .from("dashboard_template_configs")
        .select("*");

      if (error) {
        if (isMissingRelationError(error)) return [];
        throw error;
      }
      return (data || []) as DashboardTemplateConfigRecord[];
    } catch (error: any) {
      if (isMissingRelationError(error)) return [];
      throw error;
    }
  },

  async getTemplateConfig(templateId: string) {
    try {
      const supabase = await createAdminClient({ actor: "admin", action: "template-config:get" });
      const { data, error } = await supabase
        .from("dashboard_template_configs")
        .select("*")
        .eq("template_id", templateId)
        .maybeSingle();

      if (error) {
        if (isMissingRelationError(error)) return null;
        throw error;
      }
      return (data || null) as DashboardTemplateConfigRecord | null;
    } catch (error: any) {
      if (isMissingRelationError(error)) return null;
      throw error;
    }
  },

  async upsertTemplateConfig(templateId: string, metricConfig: Record<string, unknown>) {
    const supabase = await createAdminClient({ actor: "admin", action: "template-config:upsert" });
    const { data, error } = await supabase
      .from("dashboard_template_configs")
      .upsert({
        template_id: templateId,
        metric_config: metricConfig,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as DashboardTemplateConfigRecord;
  },
};
