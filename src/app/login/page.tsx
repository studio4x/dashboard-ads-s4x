import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Login | Dashboard ADS S4X",
  description: "Acesse a plataforma de dashboards.",
};

export default function LoginPage() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg, #2563EB, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <BarChart3 size={28} color="white" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Dashboard ADS S4X</h1>
          <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>Faça login para acessar seus dashboards</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 32 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#475569", marginBottom: 6 }}>E-mail</label>
              <input
                type="email"
                placeholder="seu@email.com"
                defaultValue="demo@s4x.com.br"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, color: "#0F172A", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#475569", marginBottom: 6 }}>Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                defaultValue="demo1234"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, color: "#0F172A", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {/* Aviso MVP */}
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#FFFBEB", border: "1px solid #FDE68A" }}>
              <p style={{ fontSize: 12, color: "#92400E" }}>
                <strong>Modo Demo:</strong> A autenticação real será implementada na Fase 3 com Supabase Auth. Clique em Entrar para acessar.
              </p>
            </div>

            <Link
              href="/app/dashboards/dashboard-demo-001/executive-summary"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 8, background: "#2563EB", color: "white", fontSize: 15, fontWeight: 600, textDecoration: "none", transition: "background 0.15s" }}
            >
              Entrar <ArrowRight size={16} />
            </Link>

            <Link
              href="/admin"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", borderRadius: 8, border: "1px solid #E2E8F0", color: "#475569", fontSize: 14, fontWeight: 500, textDecoration: "none" }}
            >
              Acessar como Admin
            </Link>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "#94A3B8", marginTop: 20 }}>
          <Link href="/" style={{ color: "#2563EB", textDecoration: "none" }}>← Voltar ao início</Link>
        </p>
      </div>
    </div>
  );
}
