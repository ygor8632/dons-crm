'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { SupabaseClient } from '@supabase/supabase-js';

/* ---------------- Tipos ---------------- */

export type StatusConta = 'pendente' | 'conectado' | 'erro';
export type ContaWhatsApp = {
  id: string; empresa_id: string; phone_number_id: string; waba_id: string; numero: string | null; nome_verificado: string | null;
  verify_token: string; status: StatusConta; status_detalhe: string | null; ultimo_evento_em: string | null; created_at: string;
};
export type Conversa = {
  id: string; empresa_id: string; wa_id: string; nome_contato: string | null; lead_id: string | null; responsavel_id: string | null;
  status: 'aberta' | 'arquivada'; nao_lidas: number; ultima_previa: string | null; ultima_mensagem_em: string | null; ultima_entrada_em: string | null; created_at: string;
};
export type TipoMensagemWA = 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'location' | 'contacts' | 'template' | 'reaction' | 'outro';
export type StatusMensagemWA = 'recebida' | 'enviando' | 'enviada' | 'entregue' | 'lida' | 'falhou';
export type MensagemWA = {
  id: string; conversa_id: string; wa_message_id: string | null; direcao: 'entrada' | 'saida'; tipo: TipoMensagemWA; texto: string | null;
  midia_id: string | null; midia_mime: string | null; midia_nome: string | null; status: StatusMensagemWA; erro: string | null; autor_id: string | null; criado_em: string;
};
export type ModeloWA = { nome: string; idioma: string; categoria: string; texto: string; variaveis: number };
export type DadosConexao = { phoneNumberId: string; wabaId: string; token: string; appSecret: string };
export type ResultadoTeste = { ok: boolean; erro?: string | null; numero?: string; nome?: string; qualidade?: string };

/** Tudo que as telas do WhatsApp usam; a demonstração implementa a mesma interface. */
export type WhatsApp = {
  carregando: boolean;
  conta: ContaWhatsApp | null;
  conversas: Conversa[];
  naoLidas: number;
  mensagens: Record<string, MensagemWA[]>;
  webhookUrl: string;
  abrirConversa: (id: string) => Promise<void>;
  enviarTexto: (conversaId: string, texto: string) => Promise<boolean>;
  listarModelos: () => Promise<ModeloWA[]>;
  enviarModelo: (p: { conversaId?: string; leadId?: string; nome: string; idioma: string; parametros: string[] }) => Promise<string | null>;
  atribuir: (conversaId: string, responsavelId: string | null) => Promise<void>;
  arquivar: (conversaId: string, arquivada: boolean) => Promise<void>;
  baixarMidia: (mensagemId: string) => Promise<string | null>;
  conectar: (d: DadosConexao) => Promise<boolean>;
  testar: () => Promise<ResultadoTeste>;
  desconectar: () => Promise<boolean>;
};

/* ---------------- Regras compartilhadas ---------------- */

export const JANELA_MS = 24 * 3600e3;

/** A Meta só aceita texto livre até 24h depois da última mensagem do cliente. */
export function janelaAberta(c: Pick<Conversa, 'ultima_entrada_em'>, agora = Date.now()) {
  return !!c.ultima_entrada_em && agora - new Date(c.ultima_entrada_em).getTime() < JANELA_MS;
}

/** Tempo restante da janela, para o aviso ("fecha em 3 h"). */
export function restanteJanela(c: Pick<Conversa, 'ultima_entrada_em'>, agora = Date.now()) {
  if (!c.ultima_entrada_em) return 0;
  return Math.max(0, JANELA_MS - (agora - new Date(c.ultima_entrada_em).getTime()));
}

/** +55 61 98177-6025 a partir do wa_id (5561981776025). */
export function formatarWaId(waId: string) {
  const d = waId.replace(/\D/g, '');
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) {
    const ddd = d.slice(2, 4), n = d.slice(4);
    return `+55 ${ddd} ${n.slice(0, n.length - 4)}-${n.slice(-4)}`;
  }
  return `+${d}`;
}

export const ROTULO_TIPO: Record<TipoMensagemWA, string> = {
  text: 'Mensagem', image: 'Imagem', audio: 'Áudio', video: 'Vídeo', document: 'Documento', sticker: 'Figurinha',
  location: 'Localização', contacts: 'Contato', template: 'Modelo', reaction: 'Reação', outro: 'Mensagem não suportada',
};

const ordenar = (lista: Conversa[]) => [...lista].sort((a, b) => (b.ultima_mensagem_em ?? b.created_at).localeCompare(a.ultima_mensagem_em ?? a.created_at));

async function erroDaFuncao(error: unknown): Promise<string> {
  // supabase-js: FunctionsHttpError traz a Response em context
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === 'function') {
    try { const j = await ctx.json(); if (j?.erro) return String(j.erro); } catch { /* sem corpo */ }
  }
  return 'Não foi possível falar com o WhatsApp agora.';
}

/* ---------------- Supabase ---------------- */

export function useWhatsAppSupabase(supabase: SupabaseClient, empresaId: string | null, userId: string | null): WhatsApp {
  const [carregando, setCarregando] = useState(true);
  const [conta, setConta] = useState<ContaWhatsApp | null>(null);
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [mensagens, setMensagens] = useState<Record<string, MensagemWA[]>>({});
  const aberta = useRef<string | null>(null);
  const midias = useRef(new Map<string, string>());

  const carregar = useCallback(async () => {
    if (!empresaId) return;
    const [{ data: c }, { data: cv }] = await Promise.all([
      supabase.from('whatsapp_contas').select('*').eq('empresa_id', empresaId).maybeSingle(),
      supabase.from('whatsapp_conversas').select('*').eq('empresa_id', empresaId).order('ultima_mensagem_em', { ascending: false, nullsFirst: false }).limit(500),
    ]);
    setConta((c as ContaWhatsApp) ?? null);
    setConversas((cv as Conversa[]) ?? []);
    setCarregando(false);
  }, [supabase, empresaId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial, igual ao usePainel
  useEffect(() => { void carregar(); }, [carregar]);

  // Tempo real: conversas e mensagens novas chegam sem recarregar (o RLS filtra o que cada um vê)
  useEffect(() => {
    if (!empresaId || !conta) return;
    const canal = supabase.channel(`whatsapp:${empresaId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversas', filter: `empresa_id=eq.${empresaId}` }, (p) => {
        if (p.eventType === 'DELETE') { setConversas((l) => l.filter((x) => x.id !== (p.old as Conversa).id)); return; }
        const nova = p.new as Conversa;
        setConversas((l) => ordenar([nova, ...l.filter((x) => x.id !== nova.id)]));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_mensagens', filter: `empresa_id=eq.${empresaId}` }, (p) => {
        if (p.eventType === 'DELETE') return;
        const m = p.new as MensagemWA;
        setMensagens((t) => {
          const atual = t[m.conversa_id];
          if (!atual) return t; // conversa ainda não aberta: carrega ao abrir
          const i = atual.findIndex((x) => x.id === m.id);
          const lista = i >= 0 ? atual.map((x) => (x.id === m.id ? m : x)) : [...atual, m];
          return { ...t, [m.conversa_id]: lista.sort((a, b) => a.criado_em.localeCompare(b.criado_em)) };
        });
        // Mensagem nova na conversa aberta: já marca como lida
        if (m.direcao === 'entrada' && p.eventType === 'INSERT' && aberta.current === m.conversa_id && document.visibilityState === 'visible') {
          void supabase.functions.invoke('whatsapp-api', { body: { acao: 'marcar_lida', conversa_id: m.conversa_id } });
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(canal); };
  }, [supabase, empresaId, conta]);

  const chamar = useCallback(async <T,>(body: Record<string, unknown>): Promise<{ dados: T | null; erro: string | null }> => {
    const { data, error } = await supabase.functions.invoke('whatsapp-api', { body });
    if (error) return { dados: (null), erro: await erroDaFuncao(error) };
    return { dados: data as T, erro: null };
  }, [supabase]);

  const abrirConversa = useCallback(async (id: string) => {
    aberta.current = id;
    const { data } = await supabase.from('whatsapp_mensagens').select('*').eq('conversa_id', id).order('criado_em', { ascending: true }).limit(1000);
    setMensagens((t) => ({ ...t, [id]: (data as MensagemWA[]) ?? [] }));
    const c = conversas.find((x) => x.id === id);
    if (c && c.nao_lidas > 0) {
      setConversas((l) => l.map((x) => (x.id === id ? { ...x, nao_lidas: 0 } : x)));
      void chamar({ acao: 'marcar_lida', conversa_id: id });
    }
  }, [supabase, conversas, chamar]);

  /** Coloca a mensagem devolvida pela função na conversa (o tempo real também chega; não duplica). */
  const juntar = (m: MensagemWA | undefined) => {
    if (!m) return;
    setMensagens((t) => {
      const atual = t[m.conversa_id] ?? [];
      return { ...t, [m.conversa_id]: [...atual.filter((x) => x.id !== m.id), m].sort((a, b) => a.criado_em.localeCompare(b.criado_em)) };
    });
  };

  const enviarTexto = useCallback(async (conversaId: string, texto: string) => {
    const { dados, erro } = await chamar<{ mensagem: MensagemWA }>({ acao: 'enviar_texto', conversa_id: conversaId, texto });
    if (erro) { toast.error(erro); return false; }
    juntar(dados?.mensagem);
    return true;
  }, [chamar]);

  const listarModelos = useCallback(async () => {
    const { dados, erro } = await chamar<{ modelos: ModeloWA[] }>({ acao: 'modelos' });
    if (erro) { toast.error(erro); return []; }
    return dados?.modelos ?? [];
  }, [chamar]);

  const enviarModelo = useCallback(async (p: { conversaId?: string; leadId?: string; nome: string; idioma: string; parametros: string[] }) => {
    const { dados, erro } = await chamar<{ mensagem: MensagemWA; conversa_id: string }>({
      acao: 'enviar_modelo', conversa_id: p.conversaId, lead_id: p.leadId, nome: p.nome, idioma: p.idioma, parametros: p.parametros,
    });
    if (erro) { toast.error(erro); return null; }
    juntar(dados?.mensagem);
    if (dados?.conversa_id && !conversas.some((c) => c.id === dados.conversa_id)) await carregar();
    return dados?.conversa_id ?? p.conversaId ?? null;
  }, [chamar, conversas, carregar]);

  const atualizarConversa = useCallback(async (id: string, campos: Partial<Pick<Conversa, 'responsavel_id' | 'status'>>, ok: string) => {
    const antes = conversas;
    setConversas((l) => l.map((x) => (x.id === id ? { ...x, ...campos } : x)));
    const { error } = await supabase.from('whatsapp_conversas').update(campos).eq('id', id);
    if (error) { setConversas(antes); toast.error('Não foi possível atualizar a conversa.'); return; }
    toast.success(ok);
  }, [supabase, conversas]);

  const atribuir = useCallback((id: string, responsavelId: string | null) =>
    atualizarConversa(id, { responsavel_id: responsavelId }, responsavelId ? (responsavelId === userId ? 'Conversa assumida por você.' : 'Responsável alterado.') : 'Conversa sem responsável.'), [atualizarConversa, userId]);

  const arquivar = useCallback((id: string, arquivada: boolean) =>
    atualizarConversa(id, { status: arquivada ? 'arquivada' : 'aberta' }, arquivada ? 'Conversa arquivada.' : 'Conversa reaberta.'), [atualizarConversa]);

  const baixarMidia = useCallback(async (mensagemId: string) => {
    const ja = midias.current.get(mensagemId);
    if (ja) return ja;
    const { dados, erro } = await chamar<{ mime: string; base64: string }>({ acao: 'midia', mensagem_id: mensagemId });
    if (erro || !dados) { toast.error(erro ?? 'Mídia indisponível.'); return null; }
    const bin = Uint8Array.from(atob(dados.base64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bin], { type: dados.mime }));
    midias.current.set(mensagemId, url);
    return url;
  }, [chamar]);

  const conectar = useCallback(async (d: DadosConexao) => {
    const { error } = await supabase.rpc('whatsapp_conectar', { p_phone_number_id: d.phoneNumberId.trim(), p_waba_id: d.wabaId.trim(), p_token: d.token.trim(), p_app_secret: d.appSecret.trim().toLowerCase() });
    if (error) { toast.error(error.message.includes('admin') ? 'Só o administrador pode conectar o WhatsApp.' : `Não foi possível salvar: ${error.message}`); return false; }
    await carregar();
    toast.success('Dados salvos. Agora configure o webhook na Meta e teste a conexão.');
    return true;
  }, [supabase, carregar]);

  const testar = useCallback(async (): Promise<ResultadoTeste> => {
    const { dados, erro } = await chamar<ResultadoTeste>({ acao: 'testar' });
    await carregar();
    if (erro) return { ok: false, erro };
    return dados ?? { ok: false, erro: 'Sem resposta.' };
  }, [chamar, carregar]);

  const desconectar = useCallback(async () => {
    const { error } = await supabase.rpc('whatsapp_desconectar');
    if (error) { toast.error('Não foi possível desconectar.'); return false; }
    setConta(null);
    toast.success('WhatsApp desconectado. As conversas continuam guardadas.');
    return true;
  }, [supabase]);

  const naoLidas = useMemo(() => conversas.filter((c) => c.status === 'aberta').reduce((s, c) => s + (c.nao_lidas || 0), 0), [conversas]);
  const webhookUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/functions/v1/whatsapp-webhook`;

  return { carregando, conta, conversas, naoLidas, mensagens, webhookUrl, abrirConversa, enviarTexto, listarModelos, enviarModelo, atribuir, arquivar, baixarMidia, conectar, testar, desconectar };
}
