"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminRefreshButton() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        setIsRefreshing(true);
        router.refresh();
        setTimeout(() => setIsRefreshing(false), 900);
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        border: "1px solid #CBD5E1",
        background: "#FFFFFF",
        color: "#334155",
        padding: "8px 12px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
      aria-label="Atualizar cockpit"
    >
      <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
      Atualizar
    </button>
  );
}
