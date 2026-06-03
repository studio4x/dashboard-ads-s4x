"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface CreateTemplateModalProps {
  open: boolean;
  templates: Array<{
    id: string;
    name: string;
    platform: string;
    status: string;
    description?: string;
  }>;
  onClose: () => void;
  onCreated?: (template: any) => void | Promise<void>;
}

function slugify(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function CreateTemplateModal({ open, templates, onClose, onCreated }: CreateTemplateModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    templateId: "",
    baseTemplateId: "google_ads_s4x",
    description: "",
    version: "1.0",
  });

  const baseTemplate = useMemo(
    () => templates.find((template) => template.id === form.baseTemplateId) || templates[0] || null,
    [templates, form.baseTemplateId]
  );

  useEffect(() => {
    if (!open) return;
    setForm((prev) => ({
      ...prev,
      baseTemplateId: templates.find((template) => template.id === prev.baseTemplateId)?.id || templates[0]?.id || "google_ads_s4x",
    }));
  }, [open, templates]);

  if (!open) return null;

  const handleNameChange = (value: string) => {
    setForm((prev) => ({ ...prev, name: value, templateId: slugify(value) }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.templateId.trim()) {
      toast("Informe um nome e um ID válidos.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: form.name.trim(),
          template_id: form.templateId.trim(),
          base_template_id: form.baseTemplateId,
          description: form.description.trim(),
          version: form.version.trim() || "1.0",
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro ao criar template.");
      }

      toast("Template criado.");
      await onCreated?.(result.template);
      onClose();
      setForm({
        name: "",
        templateId: "",
        baseTemplateId: templates[0]?.id || "google_ads_s4x",
        description: "",
        version: "1.0",
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Erro ao criar template.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.58)", zIndex: 100, padding: 20, overflowY: "auto" }}>
      <div className="card" style={{ width: "100%", maxWidth: 720, margin: "auto", padding: 0, overflow: "hidden", maxHeight: "calc(100vh - 40px)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", background: "#F8FAFC" }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>Criar Template</h2>
            <p style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
              O template novo será baseado em um modelo existente e herdará a estrutura de páginas e validação da base.
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: "grid", gap: 14 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Nome do template</span>
            <input
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Template Google Ads - Equipe X"
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 14 }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>ID do template</span>
            <input
              value={form.templateId}
              onChange={(e) => setForm((prev) => ({ ...prev, templateId: e.target.value }))}
              placeholder="template_google_ads_equipa_x"
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 14 }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Template base</span>
            <select
              value={form.baseTemplateId}
              onChange={(e) => setForm((prev) => ({ ...prev, baseTemplateId: e.target.value }))}
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 14, background: "#fff" }}
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.id})
                </option>
              ))}
            </select>
          </label>

          {baseTemplate && (
            <div style={{ padding: 12, borderRadius: 10, border: "1px solid #DBEAFE", background: "#EFF6FF" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#1D4ED8" }}>Base selecionada</p>
              <p style={{ fontSize: 13, color: "#1E3A8A", marginTop: 4 }}>{baseTemplate.name}</p>
              <p style={{ fontSize: 12, color: "#1D4ED8", marginTop: 2, lineHeight: 1.5 }}>
                O template criado vai seguir a mesma estrutura de validação da base. Depois de criado, você pode abrir a configuração de métricas e ajustar o padrão.
              </p>
            </div>
          )}

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Descrição</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva o propósito deste template"
              style={{ minHeight: 100, padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 14, resize: "vertical" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Versão</span>
            <input
              value={form.version}
              onChange={(e) => setForm((prev) => ({ ...prev, version: e.target.value }))}
              placeholder="1.0"
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 14, width: 140 }}
            />
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
            <button type="button" onClick={onClose} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #CBD5E1", background: "#fff", color: "#334155", fontWeight: 600, cursor: "pointer" }}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #2563EB", background: "#2563EB", color: "#fff", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, opacity: isSubmitting ? 0.7 : 1 }}
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              Criar Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
