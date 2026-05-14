"use client";

import { CheckCircle, Clock, AlertCircle, Loader, MinusCircle } from "lucide-react";
import type { ImportStatus } from "@/types/data-sources";

interface ImportStatusBadgeProps {
  status: ImportStatus;
  label?: boolean;
}

const config: Record<string, { icon: React.ElementType; color: string; bg: string; text: string }> = {
  idle: { icon: Clock, color: "#64748B", bg: "#F1F5F9", text: "Aguardando" },
  pending: { icon: Clock, color: "#64748B", bg: "#F1F5F9", text: "Pendente" },
  running: { icon: Loader, color: "#2563EB", bg: "#EFF6FF", text: "Importando..." },
  success: { icon: CheckCircle, color: "#16A34A", bg: "#DCFCE7", text: "Concluído" },
  success_with_warnings: { icon: AlertCircle, color: "#D97706", bg: "#FEF3C7", text: "Concluído (Avisos)" },
  error: { icon: AlertCircle, color: "#DC2626", bg: "#FEE2E2", text: "Erro" },
  failed: { icon: AlertCircle, color: "#DC2626", bg: "#FEE2E2", text: "Falhou" },
  never: { icon: MinusCircle, color: "#94A3B8", bg: "#F8FAFC", text: "Nunca importado" },
  never_imported: { icon: MinusCircle, color: "#94A3B8", bg: "#F8FAFC", text: "Nunca importado" },
};

export function ImportStatusBadge({ status, label = true }: ImportStatusBadgeProps) {
  const c = config[status] || config.idle;
  const Icon = c.icon;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "3px 10px", borderRadius: 99, background: c.bg,
        color: c.color, fontSize: 12, fontWeight: 500,
      }}
    >
      <Icon size={12} className={status === "running" ? "animate-spin" : ""} />
      {label && c.text}
    </span>
  );
}
