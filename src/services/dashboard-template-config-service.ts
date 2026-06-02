import { createAdminClient } from "@/lib/supabase/server";

export interface DashboardTemplateConfigRecord {
  template_id: string;
  metric_config: Record<string, unknown>;
  updated_at?: string;
}

export const DashboardTemplateConfigService = {
  async getAllTemplateConfigs() {
    const supabase = await createAdminClient({ actor: "admin", action: "template-config:list" });
    const { data, error } = await supabase
      .from("dashboard_template_configs")
      .select("*");

    if (error) throw error;
    return (data || []) as DashboardTemplateConfigRecord[];
  },

  async getTemplateConfig(templateId: string) {
    const supabase = await createAdminClient({ actor: "admin", action: "template-config:get" });
    const { data, error } = await supabase
      .from("dashboard_template_configs")
      .select("*")
      .eq("template_id", templateId)
      .maybeSingle();

    if (error) throw error;
    return (data || null) as DashboardTemplateConfigRecord | null;
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
