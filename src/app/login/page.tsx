"use client";

import { useState } from "react";
import { login } from "./actions";
import { BarChart3, Lock, Mail, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { BrandingLogo } from "@/components/branding/BrandingLogo";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await login(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC", padding: 24, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-10%", left: "-10%", width: "40%", height: "40%", borderRadius: "999px", background: "rgba(191,219,254,0.5)", filter: "blur(120px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-10%", right: "-10%", width: "40%", height: "40%", borderRadius: "999px", background: "rgba(199,210,254,0.5)", filter: "blur(120px)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <BrandingLogo
            alt="Dashboard ADS S4X"
            style={{ width: 300, height: 88, marginBottom: 10 }}
            fallback={<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}><div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, #2563EB, #4338CA)", color: "#FFFFFF", boxShadow: "0 18px 40px rgba(37,99,235,0.2)" }}><BarChart3 size={32} /></div><h1 style={{ fontSize: 32, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>Dashboard ADS</h1></div>}
          />
          <p style={{ color: "#64748B", marginTop: 8, fontWeight: 600, fontSize: 14 }}>S4X Platform — Acesso Restrito</p>
        </div>

        <div style={{ background: "#FFFFFF", borderRadius: 24, boxShadow: "0 20px 50px rgba(0,0,0,0.05)", border: "1px solid #E2E8F0", padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {error && (
              <div style={{ padding: 14, background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", fontSize: 13, borderRadius: 12, fontWeight: 600 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginLeft: 2 }}>E-mail</label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", inset: "0 auto 0 0", paddingLeft: 14, display: "flex", alignItems: "center", pointerEvents: "none", color: "#94A3B8" }}>
                  <Mail size={18} />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="seu@email.com"
                  style={{ width: "100%", padding: "14px 14px 14px 42px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, color: "#0F172A", fontSize: 14 }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 2px" }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>Senha</label>
                <Link href="/forgot-password" style={{ fontSize: 12, fontWeight: 700, color: "#2563EB", textDecoration: "none" }}>Esqueceu a senha?</Link>
              </div>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", inset: "0 auto 0 0", paddingLeft: 14, display: "flex", alignItems: "center", pointerEvents: "none", color: "#94A3B8" }}>
                  <Lock size={18} />
                </div>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  style={{ width: "100%", padding: "14px 14px 14px 42px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, color: "#0F172A", fontSize: 14 }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", background: "linear-gradient(90deg, #2563EB, #4338CA)", color: "#FFFFFF", fontWeight: 800, padding: "14px 16px", borderRadius: 12, border: "none", boxShadow: "0 12px 30px rgba(37,99,235,0.2)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.75 : 1 }}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Entrar na Plataforma
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid #F1F5F9", textAlign: "center" }}>
            <p style={{ color: "#64748B", fontSize: 13 }}>
              Não tem acesso? <Link href="#" style={{ color: "#2563EB", fontWeight: 800, textDecoration: "none" }}>Falar com suporte</Link>
            </p>
          </div>
        </div>

        <p style={{ textAlign: "center", color: "#94A3B8", fontSize: 12, marginTop: 28, fontWeight: 600 }}>
          &copy; {new Date().getFullYear()} Studio 4X Tecnologia. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
