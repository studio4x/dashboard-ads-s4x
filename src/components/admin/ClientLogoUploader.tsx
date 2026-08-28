/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ImageIcon, Loader2, SlidersHorizontal, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { ClientLogoEditorModal } from "@/components/admin/ClientLogoEditorModal";
import { getClientLogoImageStyle, normalizeClientLogoSettings, type ClientLogoSettings } from "@/lib/client-logo-settings";

interface ClientLogoUploaderProps { clientId: string; clientName: string; dashboardName?: string; logoUrl?: string | null; logoSettings?: ClientLogoSettings | null }

export function ClientLogoUploader({ clientId, clientName, dashboardName = "Dados da Campanha", logoUrl, logoSettings }: ClientLogoUploaderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(logoUrl || null);
  const [settings, setSettings] = useState(() => normalizeClientLogoSettings(logoSettings));
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); }, []);

  const handleSelectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] || null;
    if (!selected) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(selected);
    setFile(selected);
    setPreview(objectUrlRef.current);
    setIsEditorOpen(true);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      formData.append("logo_settings", JSON.stringify(settings));
      const response = await fetch(`/api/admin/clients/${clientId}/logo`, { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok || !result.success) { toast(result.error || "Não foi possível enviar o logotipo.", "error"); return; }
      setPreview(result.logo_url || preview);
      setSettings(normalizeClientLogoSettings(result.logo_settings));
      setFile(null);
      router.refresh();
      toast("Logotipo e enquadramento salvos com sucesso.", "success");
    } catch { toast("Erro ao conectar com o servidor.", "error"); }
    finally { setIsUploading(false); }
  };

  async function handleSaveSettings(nextSettings: ClientLogoSettings) {
    setSettings(nextSettings);
    if (file) { setIsEditorOpen(false); toast("Ajustes aplicados à prévia. Envie o logo para concluir.", "success"); return; }
    setIsSavingSettings(true);
    try {
      const response = await fetch(`/api/admin/clients/${clientId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ logo_settings: nextSettings }) });
      const result = await response.json();
      if (!response.ok || !result.success) { toast(result.error || "Não foi possível salvar os ajustes.", "error"); return; }
      setIsEditorOpen(false);
      router.refresh();
      toast("Enquadramento do logotipo atualizado.", "success");
    } catch { toast("Erro ao conectar com o servidor.", "error"); }
    finally { setIsSavingSettings(false); }
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><ImageIcon size={20} color="#2563EB" /> Logotipo do Cliente</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div onClick={() => inputRef.current?.click()} style={{ width: "100%", height: 170, borderRadius: 12, border: "2px dashed #CBD5E1", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden" }}>{preview ? <img src={preview} alt={`Logo ${clientName}`} style={{ display: "block", width: "100%", height: "100%", ...getClientLogoImageStyle(settings) }} /> : <div style={{ textAlign: "center", color: "#94A3B8" }}><Upload size={30} style={{ margin: "0 auto 8px" }} /><p style={{ fontSize: 13 }}>Clique para selecionar</p></div>}</div>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={handleSelectFile} />
        <p style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>PNG, JPG ou WEBP (até 2 MB). Ajuste o corte e visualize exatamente como o logo aparecerá no PDF.</p>
        {preview && <button type="button" onClick={() => setIsEditorOpen(true)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #C7D2FE", background: "#EEF2FF", color: "#4338CA", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}><SlidersHorizontal size={15} /> Ajustar no PDF</button>}
        <div style={{ display: "flex", gap: 10 }}><button type="button" onClick={() => inputRef.current?.click()} style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#334155", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Selecionar imagem</button><button type="button" onClick={handleUpload} disabled={!file || isUploading} style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "none", background: file ? "#2563EB" : "#CBD5E1", color: "#FFFFFF", fontSize: 13, fontWeight: 700, cursor: file ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>{isUploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={15} />} Enviar logo</button></div>
      </div>
      {isEditorOpen && preview && <ClientLogoEditorModal clientName={clientName} dashboardName={dashboardName} logoUrl={preview} initialSettings={settings} saving={isSavingSettings} onClose={() => !isSavingSettings && setIsEditorOpen(false)} onSave={handleSaveSettings} />}
    </div>
  );
}
