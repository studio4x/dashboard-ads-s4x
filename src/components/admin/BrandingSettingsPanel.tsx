"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Brush, CheckCircle2, ImageIcon, Loader2, Upload } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type AssetKey = "logoDark" | "logoLight" | "favicon";
type Branding = { logoDarkUrl: string; logoLightUrl: string; faviconUrl: string; updatedAt: string | null };
type SelectedFiles = Record<AssetKey, File | null>;

const ASSETS: Array<{
  key: AssetKey;
  label: string;
  description: string;
  accept: string;
  previewBackground: string;
}> = [
  { key: "logoDark", label: "Logotipo dark", description: "Usado em fundos claros, como login, menu administrativo e cabecalhos.", accept: "image/png,image/jpeg,image/webp,image/svg+xml", previewBackground: "#F8FAFC" },
  { key: "logoLight", label: "Logotipo light", description: "Usado em fundos escuros, como cabecalhos de relatorios PDF.", accept: "image/png,image/jpeg,image/webp,image/svg+xml", previewBackground: "linear-gradient(135deg, #0F172A, #1D4ED8)" },
  { key: "favicon", label: "Favicon", description: "Icone exibido na aba do navegador e nos favoritos.", accept: "image/png,image/svg+xml,image/x-icon", previewBackground: "#F8FAFC" },
];

const EMPTY_FILES: SelectedFiles = { logoDark: null, logoLight: null, favicon: null };

function AssetUpload({
  asset,
  file,
  currentUrl,
  onSelect,
}: {
  asset: (typeof ASSETS)[number];
  file: File | null;
  currentUrl: string;
  onSelect: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setFilePreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setFilePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const previewUrl = filePreviewUrl || currentUrl;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{asset.label}</h3>
        <p style={{ fontSize: 12, color: "#64748B", lineHeight: 1.45, marginTop: 4 }}>{asset.description}</p>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={{ height: 126, borderRadius: 12, border: "1px dashed #CBD5E1", background: asset.previewBackground, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer", padding: 16 }}
      >
        {previewUrl ? (
          <img src={previewUrl} alt={`Preview ${asset.label}`} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        ) : (
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "#94A3B8", fontSize: 12 }}>
            <Upload size={24} />
            Selecionar arquivo
          </span>
        )}
      </button>
      <input ref={inputRef} type="file" accept={asset.accept} onChange={onSelect} style={{ display: "none" }} />
      <p style={{ fontSize: 11, color: "#94A3B8" }}>{file ? file.name : "PNG, JPG, WEBP ou SVG ate 2 MB"}</p>
    </div>
  );
}

export function BrandingSettingsPanel() {
  const { toast } = useToast();
  const [branding, setBranding] = useState<Branding | null>(null);
  const [files, setFiles] = useState<SelectedFiles>(EMPTY_FILES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadBranding() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/settings/branding", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Nao foi possivel carregar a identidade visual.");
      setBranding(result.branding);
    } catch (error: any) {
      toast(error?.message || "Nao foi possivel carregar a identidade visual.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBranding();
  }, []);

  const handleSelect = (key: AssetKey) => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file) setFiles((current) => ({ ...current, [key]: file }));
  };

  async function handleSave() {
    if (!Object.values(files).some(Boolean)) {
      toast("Selecione ao menos um arquivo para salvar.", "error");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      if (files.logoDark) formData.append("logoDark", files.logoDark);
      if (files.logoLight) formData.append("logoLight", files.logoLight);
      if (files.favicon) formData.append("favicon", files.favicon);

      const response = await fetch("/api/admin/settings/branding", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Nao foi possivel salvar a identidade visual.");

      setBranding(result.branding);
      setFiles(EMPTY_FILES);
      toast("Identidade visual atualizada com sucesso.", "success");
      window.dispatchEvent(new Event("branding-updated"));
    } catch (error: any) {
      toast(error?.message || "Nao foi possivel salvar a identidade visual.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ padding: 24, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: "linear-gradient(135deg, #0F172A, #0F766E)", color: "#FFFFFF" }}><Brush size={18} /></div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>Identidade visual</h2>
            <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>Defina os assets oficiais usados pela plataforma.</p>
          </div>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#166534", background: "#DCFCE7", borderRadius: 999, padding: "6px 10px" }}><CheckCircle2 size={14} /> Aplicado globalmente</div>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748B", fontSize: 13, padding: "18px 0" }}><Loader2 size={16} className="animate-spin" /> Carregando assets atuais...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
            {ASSETS.map((asset) => (
              <AssetUpload
                key={asset.key}
                asset={asset}
                file={files[asset.key]}
                currentUrl={branding?.[`${asset.key}Url` as "logoDarkUrl" | "logoLightUrl" | "faviconUrl"] || ""}
                onSelect={handleSelect(asset.key)}
              />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 20, paddingTop: 16, borderTop: "1px solid #F1F5F9", flexWrap: "wrap" }}>
            <p style={{ fontSize: 12, color: "#64748B" }}>Os arquivos sao armazenados no Supabase Storage e ficam disponiveis imediatamente apos o envio.</p>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !Object.values(files).some(Boolean)}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "none", borderRadius: 10, background: saving || !Object.values(files).some(Boolean) ? "#93C5FD" : "#1D4ED8", color: "#FFFFFF", padding: "10px 14px", fontSize: 13, fontWeight: 700, cursor: saving || !Object.values(files).some(Boolean) ? "not-allowed" : "pointer" }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
              {saving ? "Salvando..." : "Salvar identidade visual"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
