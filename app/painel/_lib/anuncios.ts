'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { SupabaseClient } from '@supabase/supabase-js';

/* ---------------- Tipos ---------------- */

export type ContaMeta = {
  id: string; empresa_id: string; page_id: string; page_nome: string | null; verify_token: string;
  status: 'pendente' | 'conectado' | 'erro'; status_detalhe: string | null; ultimo_evento_em: string | null; created_at: string;
};
export type LeadMeta = {
  id: string; leadgen_id: string; formulario: string | null; campanha: string | null; anuncio: string | null;
  lead_id: string | null; resultado: 'pendente' | 'criado' | 'duplicado' | 'erro'; erro: string | null; recebido_em: string;
};
export type ResultadoSync = { formularios: number; criado: number; duplicado: number; ja_recebido: number; erro: number };

/** Integração com os anúncios da Meta (Lead Ads). Só o admin usa; a demonstração tem a mesma interface. */
export type Anuncios = {
  carregando: boolean;
  conta: ContaMeta | null;
  recebidos: LeadMeta[];
  webhookUrl: string;
  /** O WhatsApp já está conectado: o App Secret pode ser reaproveitado. */
  podeReaproveitarSegredo: boolean;
  conectar: (d: { pageId: string; token: string; appSecret: string }) => Promise<boolean>;
  testar: () => Promise<{ ok: boolean; pagina?: string; erro?: string | null }>;
  sincronizar: () => Promise<ResultadoSync | null>;
  desconectar: () => Promise<boolean>;
  recarregar: () => Promise<void>;
};

async function erroDaFuncao(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === 'function') {
    try { const j = await ctx.json(); if (j?.erro) return String(j.erro); } catch { /* sem corpo */ }
  }
  return 'Não foi possível falar com a Meta agora.';
}

/* ---------------- Supabase ---------------- */

export function useAnunciosSupabase(supabase: SupabaseClient, empresaId: string | null, admin: boolean, whatsappConectado: boolean): Anuncios {
  const [carregando, setCarregando] = useState(true);
  const [conta, setConta] = useState<ContaMeta | null>(null);
  const [recebidos, setRecebidos] = useState<LeadMeta[]>([]);

  const recarregar = useCallback(async () => {
    if (!empresaId || !admin) { setCarregando(false); return; }
    const [{ data: c }, { data: r }] = await Promise.all([
      supabase.from('meta_contas').select('*').eq('empresa_id', empresaId).maybeSingle(),
      supabase.from('meta_leads').select('id, leadgen_id, formulario, campanha, anuncio, lead_id, resultado, erro, recebido_em').eq('empresa_id', empresaId).order('recebido_em', { ascending: false }).limit(20),
    ]);
    setConta((c as ContaMeta) ?? null);
    setRecebidos((r as LeadMeta[]) ?? []);
    setCarregando(false);
  }, [supabase, empresaId, admin]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial, igual ao usePainel
  useEffect(() => { void recarregar(); }, [recarregar]);

  const conectar = useCallback(async (d: { pageId: string; token: string; appSecret: string }) => {
    const { error } = await supabase.rpc('meta_conectar', { p_page_id: d.pageId.trim(), p_token: d.token.trim(), p_app_secret: d.appSecret.trim() || null });
    if (error) { toast.error(error.message || 'Não foi possível salvar.'); return false; }
    await recarregar();
    toast.success('Dados salvos. Agora configure o webhook na Meta e teste a conexão.');
    return true;
  }, [supabase, recarregar]);

  const chamar = useCallback(async <T,>(acao: string): Promise<{ dados: T | null; erro: string | null }> => {
    const { data, error } = await supabase.functions.invoke('meta-leads', { body: { acao } });
    if (error) return { dados: null, erro: await erroDaFuncao(error) };
    return { dados: data as T, erro: null };
  }, [supabase]);

  const testar = useCallback(async () => {
    const { dados, erro } = await chamar<{ ok: boolean; pagina?: string; erro?: string | null }>('testar');
    await recarregar();
    return erro ? { ok: false, erro } : dados ?? { ok: false, erro: 'Sem resposta.' };
  }, [chamar, recarregar]);

  const sincronizar = useCallback(async () => {
    const { dados, erro } = await chamar<ResultadoSync>('sincronizar');
    await recarregar();
    if (erro || !dados) { toast.error(erro ?? 'Não foi possível buscar os leads.'); return null; }
    return dados;
  }, [chamar, recarregar]);

  const desconectar = useCallback(async () => {
    const { error } = await supabase.rpc('meta_desconectar');
    if (error) { toast.error('Não foi possível desconectar.'); return false; }
    setConta(null);
    toast.success('Anúncios desconectados. Os leads já recebidos continuam no funil.');
    return true;
  }, [supabase]);

  return {
    carregando, conta, recebidos, webhookUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/functions/v1/meta-leads`,
    podeReaproveitarSegredo: whatsappConectado, conectar, testar, sincronizar, desconectar, recarregar,
  };
}
