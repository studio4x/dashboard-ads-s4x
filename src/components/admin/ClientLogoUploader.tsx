"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ImageIcon, Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

interface ClientLogoUploaderProps {
  clientId: string;
  clientName: string;
  logoUrl?: string | null;
}

export function ClientLogoUploader({ clientId, clientName, logoUrl }: ClientLogoUploaderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(logoUrl || null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSelectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] || null;
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);

      const response = await fetch(`/api/admin/clients/${clientId}/logo`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        toast(result.error || "Não foi possível enviar o logotipo.", "error");
        return;
      }

      setPreview(result.logo_url || preview);
      setFile(null);
      router.refresh();
      toast("Logotipo enviado com sucesso.", "success");
    } catch {
      toast("Erro ao conectar com o servidor.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="card" style={{ padding: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <ImageIcon size={20} color="#2563EB" />
        Logotipo do Cliente
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            width: "100%",
            height: 170,
            borderRadius: 12,
            border: "2px dashed #CBD5E1",
            background: "#F8FAFC",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            overflow: "hidden",
          }}
        >
          {preview ? (
            <img src={preview} alt={`Logo ${clientName}`} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          ) : (
            <div style={{ textAlign: "center", color: "#94A3B8" }}>
              <Upload size={30} style={{ margin: "0 auto 8px" }} />
              <p style={{ fontSize: 13 }}>Clique para selecionar</p>
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          style={{ display: "none" }}
          onChange={handleSelectFile}
        />

        <p style={{ fontSize: 12, color: "#64748B" }}>
          PNG, JPG, WEBP ou SVG (até 2 MB). Este logo será exibido no rodapé dos links compartilhados.
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #E2E8F0",
              background: "#FFFFFF",
              color: "#334155",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Selecionar imagem
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || isUploading}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 8,
              border: "none",
              background: file ? "#2563EB" : "#CBD5E1",
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: 700,
              cursor: file ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={15} />}
            Enviar logo
          </button>
        </div>
      </div>
    </div>
  );
}
