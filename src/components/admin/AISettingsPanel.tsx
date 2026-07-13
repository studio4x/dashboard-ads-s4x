"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, Bot, Eye, EyeOff, KeyRound, Loader2, RefreshCcw, Save, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type ProviderKey = "openai" | "gemini";

type ProviderState = {
  configured: boolean;
  maskedValue: string;
};

type SettingsResponse = {
  success: boolean;
  source?: string;
  note?: string;
  targetScopes?: string[];
  providers?: Record<ProviderKey, ProviderState>;
};

const PROVIDER_LABELS: Record<ProviderKey, string> = {
  openai: "OpenAI",
  gemini: "Google Gemini",
};

const PROVIDER_HELP: Record<ProviderKey, string> = {
  openai: "Usado como primeira opção na geração de análise por IA dos relatórios.",
  gemini: "Usado como fallback quando a OpenAI não responder ou estiver indisponível. Se a chave tiver restrição por HTTP referrer, inclua o domínio canônico da plataforma.",
};

const SETTINGS_ENDPOINT = "/api/admin/settings/ai-credentials";

function ProviderField({
  label,
  helper,
  value,
  onChange,
  onToggleVisible,
  visible,
}: {
  label: string;
  helper: string;
  value: string;
  onChange: (value: string) => void;
  onToggleVisible: () => void;
  visible: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>{label}</label>
          <p style={{ fontSize: 12, color: "#64748B", lineHeight: 1.4 }}>{helper}</p>
        </div>
        <button
          type="button"
          onClick={onToggleVisible}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            border: "1px solid #E2E8F0",
            background: "#FFFFFF",
            color: "#334155",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          {visible ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={visible ? "text" : "password"}
        autoComplete="off"
        spellCheck={false}
        placeholder="Cole a chave de API aqui"
        style={{
          width: "100%",
          padding: "11px 14px",
          borderRadius: 10,
          border: "1px solid #CBD5E1",
          fontSize: 14,
          color: "#0F172A",
          background: "#FFFFFF",
          boxSizing: "border-box",
        }}
      />
      <p style={{ fontSize: 12, color: "#64748B" }}>Deixe em branco para manter a credencial atual salva na Vercel.</p>
    </div>
  );
}

export function AISettingsPanel() {
  const { toast } = useToast();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [source, setSource] = useState("");
  const [providers, setProviders] = useState<Record<ProviderKey, ProviderState>>({
    openai: { configured: false, maskedValue: "" },
    gemini: { configured: false, maskedValue: "" },
  });
  const [values, setValues] = useState<Record<ProviderKey, string>>({
    openai: "",
    gemini: "",
  });
  const [visibleFields, setVisibleFields] = useState<Record<ProviderKey, boolean>>({
    openai: false,
    gemini: false,
  });

  const hasPendingValues = useMemo(
    () => Boolean(values.openai.trim() || values.gemini.trim()),
    [values.openai, values.gemini]
  );

  const sourceLabel =
    source === "vercel_api"
      ? "Vercel API"
      : source === "runtime_env"
        ? "variáveis de ambiente do runtime"
        : "";

  const loadSettings = async () => {
    setRefreshing(true);
    setMessage("");
    try {
      const response = await fetch(SETTINGS_ENDPOINT, { cache: "no-store" });
      const json = (await response.json()) as SettingsResponse & { error?: string };
      if (!response.ok || !json?.success) {
        throw new Error(json?.error || "Falha ao carregar as credenciais.");
      }

      setProviders({
        openai: json.providers?.openai || { configured: false, maskedValue: "" },
        gemini: json.providers?.gemini || { configured: false, maskedValue: "" },
      });
      setSource(String(json.source || ""));
      setMessage(String(json.note || ""));
    } catch (error: any) {
      toast(error?.message || "Não foi possível carregar as credenciais.", "error");
    } finally {
      setLoaded(true);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const openai = values.openai.trim();
    const gemini = values.gemini.trim();

    if (!openai && !gemini) {
      toast("Informe ao menos uma credencial para salvar.", "error");
      return;
    }

    setSaving(true);
    setMessage("Salvando credenciais na Vercel...");

    try {
      const response = await fetch(SETTINGS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openAiApiKey: openai || undefined,
          geminiApiKey: gemini || undefined,
        }),
      });
      const json = (await response.json()) as SettingsResponse & { error?: string };
      if (!response.ok || !json?.success) {
        throw new Error(json?.error || "Falha ao salvar credenciais.");
      }

      setValues({ openai: "", gemini: "" });
      toast("Credenciais atualizadas com sucesso.", "success");
      await loadSettings();
    } catch (error: any) {
      setMessage("");
      toast(error?.message || "Não foi possível salvar as credenciais.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ padding: 24, marginBottom: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, #0F172A, #1D4ED8)",
              color: "#FFFFFF",
            }}
          >
            <Bot size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>Credenciais de IA</h2>
            <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
              Configure as chaves usadas na geração automática de análises pela plataforma.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            padding: "12px 14px",
            borderRadius: 12,
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "#475569" }}>
            <ShieldCheck size={14} />
            Salvas como variáveis criptografadas na Vercel
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "#475569" }}>
            <KeyRound size={14} />
            Nunca expostas ao navegador
          </div>
        </div>
      </div>

      <form onSubmit={saveSettings} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <ProviderField
          label={PROVIDER_LABELS.openai}
          helper={PROVIDER_HELP.openai}
          value={values.openai}
          onChange={(value) => setValues((current) => ({ ...current, openai: value }))}
          onToggleVisible={() => setVisibleFields((current) => ({ ...current, openai: !current.openai }))}
          visible={visibleFields.openai}
        />
        <ProviderField
          label={PROVIDER_LABELS.gemini}
          helper={PROVIDER_HELP.gemini}
          value={values.gemini}
          onChange={(value) => setValues((current) => ({ ...current, gemini: value }))}
          onToggleVisible={() => setVisibleFields((current) => ({ ...current, gemini: !current.gemini }))}
          visible={visibleFields.gemini}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {(["openai", "gemini"] as const).map((providerKey) => {
            const provider = providers[providerKey];
            return (
              <div
                key={providerKey}
                style={{
                  border: "1px solid #E2E8F0",
                  borderRadius: 12,
                  padding: 14,
                  background: provider.configured ? "#F8FAFC" : "#FFF7ED",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>{PROVIDER_LABELS[providerKey]}</p>
                    <p style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                      {provider.configured ? "Credencial já configurada" : "Ainda não configurado"}
                    </p>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: provider.configured ? "#166534" : "#9A3412",
                      background: provider.configured ? "#DCFCE7" : "#FFEDD5",
                      borderRadius: 999,
                      padding: "5px 10px",
                    }}
                  >
                    {provider.configured ? "Ativo" : "Pendente"}
                  </div>
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: "#475569" }}>
                  {provider.configured && provider.maskedValue
                    ? `Valor atual: ${provider.maskedValue}`
                    : "Nenhuma chave armazenada ainda."}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {message ? (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569" }}>
                <AlertTriangle size={14} />
                {message}
              </div>
            ) : null}
            <p style={{ fontSize: 12, color: "#64748B" }}>
              {sourceLabel ? `Origem de leitura: ${sourceLabel}` : "As credenciais são lidas pela API administrativa da Vercel."}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => void loadSettings()}
              disabled={refreshing || saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 10,
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#334155",
                padding: "10px 14px",
                fontSize: 13,
                fontWeight: 700,
                cursor: refreshing || saving ? "not-allowed" : "pointer",
                opacity: refreshing || saving ? 0.7 : 1,
              }}
            >
              {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              Atualizar
            </button>
            <button
              type="submit"
              disabled={saving || refreshing || !loaded || !hasPendingValues}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 10,
                border: "1px solid #1D4ED8",
                background: saving || refreshing || !loaded || !hasPendingValues ? "#93C5FD" : "#1D4ED8",
                color: "#FFFFFF",
                padding: "10px 14px",
                fontSize: 13,
                fontWeight: 700,
                cursor: saving || refreshing || !loaded || !hasPendingValues ? "not-allowed" : "pointer",
                opacity: saving || refreshing || !loaded || !hasPendingValues ? 0.85 : 1,
              }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Salvando..." : "Salvar credenciais"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
