"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, X } from "lucide-react";
import { META_ADS_OBJECTIVES, type MetaAdsObjectiveId } from "@/lib/meta-ads/objectives";
import { useToast } from "@/components/ui/Toast";

type TemplateOption = {
  id: string;
  name: string;
  status: string;
  platform: string;
  isCustom?: boolean;
  baseTemplateId?: string | null;
};

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function CreateDashboardModalButton({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    client_id: clientId,
    description: "",
    status: "active",
    dashboard_type: "google_ads_s4x",
    meta_objectives: [] as MetaAdsObjectiveId[],
  });

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === formData.dashboard_type),
    [templates, formData.dashboard_type]
  );
  const isMetaTemplate = useMemo(
    () => Boolean(selectedTemplate && (selectedTemplate.platform === "meta_ads" || selectedTemplate.platform === "mixed")),
    [selectedTemplate]
  );

  useEffect(() => {
    if (!isOpen || templates.length > 0) return;
    fetch("/api/admin/templates")
      .then((res) => res.json())
      .then((data) => setTemplates(Array.isArray(data) ? data.filter((item) => item.status !== "deprecated") : []))
      .catch(() => setTemplates([]));
  }, [isOpen, templates.length]);

  function toggleObjective(objective: MetaAdsObjectiveId) {
    setFormData((prev) => {
      const has = prev.meta_objectives.includes(objective);
      return {
        ...prev,
        meta_objectives: has ? prev.meta_objectives.filter((item) => item !== objective) : [...prev.meta_objectives, objective],
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (!result.success) {
        toast("Erro: " + result.error, "error");
        return;
      }
      toast("Dashboard criado com sucesso.", "success");
      setIsOpen(false);
      window.location.reload();
    } catch {
      toast("Erro ao conectar com o servidor.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{ fontSize: 13, padding: "6px 12px", background: "#EFF6FF", color: "#2563EB", borderRadius: 6, border: "1px solid #BFDBFE", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <Plus size={14} /> Novo Dashboard
      </button>

      {isOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 640, background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", boxShadow: "0 20px 60px rgba(2,6,23,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>Criar Novo Dashboard</h2>
              <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: 20, display: "grid", gap: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "grid", gap: 6 }}>
                Nome do Dashboard
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value, slug: generateSlug(e.target.value) }))}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 14 }}
                />
              </label>

              <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "grid", gap: 6 }}>
                Slug
                <input
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 14 }}
                />
              </label>

              <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "grid", gap: 6 }}>
                Descrição
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  style={{ minHeight: 90, padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 14, resize: "vertical" }}
                />
              </label>

              <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "grid", gap: 6 }}>
                Modelo de Dashboard
                <select
                  value={formData.dashboard_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      dashboard_type: e.target.value,
                      meta_objectives:
                        templates.find((template) => template.id === e.target.value)?.platform === "meta_ads" ||
                        templates.find((template) => template.id === e.target.value)?.platform === "mixed"
                          ? prev.meta_objectives
                          : [],
                    }))
                  }
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 14, background: "#fff" }}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>

              {isMetaTemplate && (
                <div style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: 12, background: "#F8FAFC" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 8 }}>Objetivos da Campanha (Meta Ads)</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {META_ADS_OBJECTIVES.map((objective) => {
                      const active = formData.meta_objectives.includes(objective.id);
                      return (
                        <button
                          type="button"
                          key={objective.id}
                          onClick={() => toggleObjective(objective.id)}
                          style={{
                            border: active ? "1px solid #4F46E5" : "1px solid #CBD5E1",
                            background: active ? "#EEF2FF" : "#fff",
                            color: active ? "#3730A3" : "#334155",
                            borderRadius: 999,
                            padding: "6px 10px",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {objective.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                <button type="button" onClick={() => setIsOpen(false)} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #CBD5E1", background: "#fff", color: "#334155", fontWeight: 600, cursor: "pointer" }}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #2563EB", background: "#2563EB", color: "#fff", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, opacity: isSubmitting ? 0.7 : 1 }}
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                  Criar Dashboard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
