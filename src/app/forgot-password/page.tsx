"use client";

import { useState } from "react";
import { forgotPassword } from "./actions";
import { BarChart3, Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    const result = await forgotPassword(formData);

    setLoading(false);
    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      setSuccess(result.success);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100/50 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[440px] relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-200 mb-6">
            <BarChart3 size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Recuperar Senha</h1>
          <p className="text-slate-500 mt-2 font-medium">S4X Platform — Redefinição de Acesso</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 p-8 md:p-10">
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <p className="text-sm text-slate-500 leading-relaxed">
                Digite seu e-mail cadastrado abaixo. Enviaremos um link seguro para você redefinir sua senha de acesso.
              </p>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl font-medium animate-shake">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1">E-mail</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Mail size={18} />
                  </div>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="seu@email.com"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-100 hover:shadow-blue-200 hover:translate-y-[-1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  "Enviar Link de Recuperação"
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-4 space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm mb-2">
                <CheckCircle2 size={36} className="animate-bounce" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">E-mail Enviado!</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                {success}
              </p>
              <div className="pt-2">
                <p className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-3">
                  Não recebeu? Verifique a pasta de lixo eletrônico (Spam) ou aguarde alguns minutos antes de tentar novamente.
                </p>
              </div>
            </div>
          )}

          {/* Footer Card */}
          <div className="mt-8 pt-8 border-t border-slate-50 text-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Voltar para o Login
            </Link>
          </div>
        </div>

        {/* Bottom Footer */}
        <p className="text-center text-slate-400 text-xs mt-10 font-medium">
          &copy; {new Date().getFullYear()} Studio 4X Tecnologia. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
