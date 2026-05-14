"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Plus, Trash2, Link as LinkIcon, Clock, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface ShareLinksManagerProps {
  dashboardId: string;
  dashboardName: string;
  compact?: boolean;
}

interface ShareLink {
  id: string;
  name: string | null;
  status: 'active' | 'revoked' | 'expired';
  expires_at: string | null;
  last_accessed_at: string | null;
  access_count: number;
  created_at: string;
}

export function ShareLinksManager({ dashboardId, dashboardName, compact = false }: ShareLinksManagerProps) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newLinkName, setNewLinkName] = useState("");
  const [expirationOption, setExpirationOption] = useState<string>("never");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [justGeneratedToken, setJustGeneratedToken] = useState<{ id: string, url: string } | null>(null);

  const { toast } = useToast();

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/share-links?dashboardId=${dashboardId}`);
      if (!res.ok) throw new Error("Erro ao buscar links");
      const data = await res.json();
      setLinks(data.links || []);
    } catch (error) {
      toast("Não foi possível carregar os links de compartilhamento.", "error");
    } finally {
      setLoading(false);
    }
  }, [dashboardId, toast]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleCreateLink = async () => {
    setGenerating(true);
    setJustGeneratedToken(null);
    try {
      let expiresAt = null;
      if (expirationOption !== "never") {
        const days = parseInt(expirationOption, 10);
        const date = new Date();
        date.setDate(date.getDate() + days);
        expiresAt = date.toISOString();
      }

      const res = await fetch("/api/admin/share-links/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dashboardId,
          name: newLinkName || "Link Compartilhado",
          expiresAt
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao criar link");
      }

      const data = await res.json();
      setLinks((prev) => [data.link, ...prev]);
      
      const shareUrl = `${window.location.origin}/share/${data.rawToken}`;
      setJustGeneratedToken({ id: data.link.id, url: shareUrl });
      setShowCreateForm(false);
      setNewLinkName("");
      setExpirationOption("never");
      toast("Link gerado com sucesso!", "success");
    } catch (error: any) {
      toast(error.message, "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (linkId: string) => {
    if (!confirm("Tem certeza que deseja revogar este link? Clientes não poderão mais acessá-lo.")) return;
    
    try {
      const res = await fetch("/api/admin/share-links/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId }),
      });

      if (!res.ok) throw new Error("Erro ao revogar");

      setLinks(links.map(l => l.id === linkId ? { ...l, status: 'revoked' } : l));
      toast("Link revogado com sucesso.", "success");
    } catch (error) {
      toast("Erro ao revogar link.", "error");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast("Link copiado para a área de transferência!", "success");
  };

  if (loading) {
    return <div className="text-sm text-slate-500 animate-pulse py-4">Carregando links...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho e Botão de Novo Link */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <LinkIcon size={16} className="text-slate-400" />
          Acesso Público
        </h3>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="text-xs font-medium bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 flex items-center gap-1 transition-colors"
          >
            <Plus size={14} /> Novo Link
          </button>
        )}
      </div>

      {/* Formulário de Criação */}
      {showCreateForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col gap-3 animate-fade-in">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Nome (ex: Link Diretoria)"
              value={newLinkName}
              onChange={(e) => setNewLinkName(e.target.value)}
              className="flex-1 text-sm rounded-md border-slate-200 px-3 py-2"
            />
            <select
              value={expirationOption}
              onChange={(e) => setExpirationOption(e.target.value)}
              className="text-sm rounded-md border-slate-200 px-3 py-2 bg-white"
            >
              <option value="never">Sem expiração</option>
              <option value="7">Expira em 7 dias</option>
              <option value="30">Expira em 30 dias</option>
              <option value="90">Expira em 90 dias</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 px-3 py-2"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateLink}
              disabled={generating}
              className="text-xs font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {generating ? <RefreshCw size={14} className="animate-spin" /> : <LinkIcon size={14} />}
              Gerar Link
            </button>
          </div>
        </div>
      )}

      {/* Aviso de Novo Token */}
      {justGeneratedToken && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-start gap-2 text-green-800">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Link gerado com sucesso!</p>
              <p className="text-xs mt-1 opacity-90">Por segurança, copie o link agora. O token completo não será exibido novamente após fechar esta janela.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <code className="flex-1 bg-white border border-green-200 px-3 py-2 rounded text-xs text-slate-700 overflow-x-auto whitespace-nowrap">
              {justGeneratedToken.url}
            </code>
            <button
              onClick={() => copyToClipboard(justGeneratedToken.url)}
              className="bg-green-600 hover:bg-green-700 text-white p-2 rounded shrink-0 transition-colors"
              title="Copiar Link"
            >
              <Copy size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Lista de Links Existentes */}
      <div className="flex flex-col gap-2">
        {links.length === 0 ? (
          <div className="text-center py-6 px-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <p className="text-sm text-slate-500">Nenhum link ativo para este dashboard.</p>
          </div>
        ) : (
          links.map((link) => {
            const isExpired = link.status === 'expired' || (link.expires_at && new Date(link.expires_at) < new Date());
            const isActive = link.status === 'active' && !isExpired;

            return (
              <div key={link.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{link.name || "Link Compartilhado"}</span>
                    {isActive ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-green-100 text-green-700 rounded uppercase tracking-wider">Ativo</span>
                    ) : isExpired ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded uppercase tracking-wider">Expirado</span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-700 rounded uppercase tracking-wider">Revogado</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1" title="Criado em">
                      <Clock size={12} />
                      {new Date(link.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    <span title="Acessos">
                      👁️ {link.access_count} acessos
                    </span>
                    {link.expires_at && (
                      <span className={isExpired ? "text-amber-600" : ""}>
                        ⏳ Expira em: {new Date(link.expires_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
                
                {isActive && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRevoke(link.id)}
                      className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1.5 hover:bg-red-50 rounded transition-colors"
                    >
                      Revogar
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
