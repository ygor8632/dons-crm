'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { ContaWhatsApp, Conversa, DadosConexao, MensagemWA, ModeloWA, ResultadoTeste, StatusMensagemWA, WhatsApp } from '../painel/_lib/whatsapp';

/*
 * WhatsApp da demonstração: conversas fictícias, envio com status simulados
 * (enviada → entregue → lida) e uma resposta automática do "cliente".
 * Nada sai do navegador.
 */

const EMPRESA = 'demo';
const min = (m: number) => new Date(Date.now() - m * 60e3).toISOString();
let seq = 0;
const id = (p: string) => `${p}-${++seq}`;

const CONTA: ContaWhatsApp = {
  id: 'wa-demo', empresa_id: EMPRESA, phone_number_id: '100000000000001', waba_id: '200000000000001', numero: '+55 61 3000-0000',
  nome_verificado: 'Studio Fit', verify_token: 'd3m0d3m0d3m0d3m0d3m0d3m0d3m0d3m0', status: 'conectado', status_detalhe: null, ultimo_evento_em: min(4), created_at: min(60 * 24 * 20),
};

type Semente = { conversa: Omit<Conversa, 'empresa_id' | 'created_at' | 'status' | 'ultima_previa' | 'ultima_mensagem_em'>; msgs: [direcao: 'entrada' | 'saida', minutosAtras: number, texto: string, tipo?: MensagemWA['tipo']][] };

const SEMENTES: Semente[] = [
  {
    conversa: { id: 'c1', wa_id: '5511981000000', nome_contato: 'Clínica Vida Plena', lead_id: 'l1', responsavel_id: 'demo-carlos', nao_lidas: 2, ultima_entrada_em: min(4) },
    msgs: [
      ['entrada', 40, 'Oi! Vi o anúncio de vocês no Google. Vocês atendem clínicas?'],
      ['saida', 35, 'Olá! Atendemos sim 😊 Quantos profissionais trabalham aí hoje?'],
      ['entrada', 6, 'Somos 6 fisioterapeutas e 2 recepcionistas.'],
      ['entrada', 4, 'Qual seria o valor para a equipe toda?'],
    ],
  },
  {
    conversa: { id: 'c2', wa_id: '5511981731290', nome_contato: 'Construtora Horizonte', lead_id: 'l2', responsavel_id: 'demo-bia', nao_lidas: 0, ultima_entrada_em: min(180) },
    msgs: [
      ['saida', 60 * 26, 'Bom dia! Segue a proposta conforme conversamos.', 'template'],
      ['entrada', 200, 'Recebi, obrigado. Vou passar para o sócio.'],
      ['entrada', 180, '📄 proposta-assinada.pdf', 'document'],
      ['saida', 170, 'Perfeito, qualquer dúvida estou por aqui.'],
    ],
  },
  {
    conversa: { id: 'c3', wa_id: '5511983656450', nome_contato: 'Ana (Studio Pilates)', lead_id: 'l5', responsavel_id: null, nao_lidas: 1, ultima_entrada_em: min(25) },
    msgs: [['entrada', 25, 'Boa tarde, gostaria de saber como funciona o plano trimestral.']],
  },
  {
    conversa: { id: 'c4', wa_id: '5511985850320', nome_contato: 'Restaurante Sabor Mineiro', lead_id: 'l10', responsavel_id: 'demo-bia', nao_lidas: 0, ultima_entrada_em: min(60 * 30) },
    msgs: [
      ['entrada', 60 * 30, 'Pode me mandar o cardápio de planos de novo?'],
      ['saida', 60 * 29, 'Claro! Enviei por e-mail também.'],
    ],
  },
  {
    conversa: { id: 'c5', wa_id: '5511984389870', nome_contato: 'Pet Shop Patas', lead_id: 'l9', responsavel_id: 'demo-carlos', nao_lidas: 0, ultima_entrada_em: min(60 * 3) },
    msgs: [
      ['entrada', 60 * 3, 'Fechado então, pode emitir o boleto.'],
      ['saida', 60 * 3 - 5, 'Obrigado pela confiança! Boleto enviado 🎉'],
    ],
  },
];

const MODELOS: ModeloWA[] = [
  { nome: 'retomar_contato', idioma: 'pt_BR', categoria: 'MARKETING', texto: 'Olá, {{1}}! Aqui é {{2}}. Ainda posso ajudar com o seu orçamento?', variaveis: 2 },
  { nome: 'proposta_enviada', idioma: 'pt_BR', categoria: 'UTILITY', texto: 'Oi, {{1}}! Sua proposta foi enviada por e-mail. Qualquer dúvida é só responder aqui.', variaveis: 1 },
  { nome: 'lembrete_visita', idioma: 'pt_BR', categoria: 'UTILITY', texto: 'Olá! Lembrando da sua visita amanhã. Responda SIM para confirmar.', variaveis: 0 },
];

const RESPOSTAS = ['Obrigado! Vou ver com a equipe e te retorno.', 'Perfeito 👍', 'Pode me ligar amanhã à tarde?', 'Entendi. E tem desconto à vista?'];

function iniciais() {
  const conversas: Conversa[] = [];
  const mensagens: Record<string, MensagemWA[]> = {};
  for (const s of SEMENTES) {
    const lista: MensagemWA[] = s.msgs.map(([direcao, m, texto, tipo]) => ({
      id: id('m'), conversa_id: s.conversa.id, wa_message_id: null, direcao, tipo: tipo ?? 'text', texto,
      midia_id: tipo === 'document' ? 'demo' : null, midia_mime: tipo === 'document' ? 'application/pdf' : null, midia_nome: tipo === 'document' ? 'proposta-assinada.pdf' : null,
      status: direcao === 'entrada' ? 'recebida' : 'lida', erro: null, autor_id: direcao === 'saida' ? s.conversa.responsavel_id : null, criado_em: min(m),
    }));
    const ultima = lista[lista.length - 1];
    mensagens[s.conversa.id] = lista;
    conversas.push({ ...s.conversa, empresa_id: EMPRESA, status: 'aberta', ultima_previa: ultima.texto, ultima_mensagem_em: ultima.criado_em, created_at: lista[0].criado_em });
  }
  return { conversas, mensagens };
}

export function useWhatsAppDemo(userId: string, admin: boolean, leads: { id: string; nome: string; telefone?: string | null; vendedor_id?: string | null }[]): WhatsApp {
  const [inicio] = useState(iniciais);
  const [conta, setConta] = useState<ContaWhatsApp | null>(CONTA);
  const [todas, setTodas] = useState<Conversa[]>(inicio.conversas);
  const [mensagens, setMensagens] = useState<Record<string, MensagemWA[]>>(inicio.mensagens);
  const respondidas = useRef(0);

  // Como no RLS: o vendedor vê as conversas dele e as sem responsável
  const conversas = useMemo(() => todas
    .filter((c) => admin || !c.responsavel_id || c.responsavel_id === userId)
    .sort((a, b) => (b.ultima_mensagem_em ?? '').localeCompare(a.ultima_mensagem_em ?? '')), [todas, admin, userId]);

  const mudarStatus = (conversaId: string, msgId: string, status: StatusMensagemWA) =>
    setMensagens((t) => ({ ...t, [conversaId]: (t[conversaId] ?? []).map((m) => (m.id === msgId ? { ...m, status } : m)) }));

  const receber = useCallback((conversaId: string, texto: string) => {
    const m: MensagemWA = { id: id('m'), conversa_id: conversaId, wa_message_id: null, direcao: 'entrada', tipo: 'text', texto, midia_id: null, midia_mime: null, midia_nome: null, status: 'recebida', erro: null, autor_id: null, criado_em: new Date().toISOString() };
    setMensagens((t) => ({ ...t, [conversaId]: [...(t[conversaId] ?? []), m] }));
    setTodas((l) => l.map((c) => (c.id === conversaId ? { ...c, ultima_previa: texto, ultima_mensagem_em: m.criado_em, ultima_entrada_em: m.criado_em, nao_lidas: c.nao_lidas + 1, status: 'aberta' } : c)));
  }, []);

  const registrarSaida = useCallback((conversaId: string, texto: string, tipo: MensagemWA['tipo']) => {
    const m: MensagemWA = { id: id('m'), conversa_id: conversaId, wa_message_id: null, direcao: 'saida', tipo, texto, midia_id: null, midia_mime: null, midia_nome: null, status: 'enviada', erro: null, autor_id: userId, criado_em: new Date().toISOString() };
    setMensagens((t) => ({ ...t, [conversaId]: [...(t[conversaId] ?? []), m] }));
    setTodas((l) => l.map((c) => (c.id === conversaId ? { ...c, ultima_previa: texto.slice(0, 160), ultima_mensagem_em: m.criado_em, nao_lidas: 0, status: 'aberta' } : c)));
    setTimeout(() => mudarStatus(conversaId, m.id, 'entregue'), 1200);
    setTimeout(() => mudarStatus(conversaId, m.id, 'lida'), 2600);
    // O "cliente" responde as duas primeiras mensagens, para mostrar a chegada em tempo real
    if (respondidas.current < 2) {
      respondidas.current++;
      setTimeout(() => receber(conversaId, RESPOSTAS[(respondidas.current - 1) % RESPOSTAS.length]), 5000);
    }
  }, [userId, receber]);

  const abrirConversa = useCallback(async (cid: string) => {
    setTodas((l) => l.map((c) => (c.id === cid ? { ...c, nao_lidas: 0 } : c)));
  }, []);

  const enviarTexto = useCallback(async (cid: string, texto: string) => {
    await new Promise((r) => setTimeout(r, 250));
    registrarSaida(cid, texto, 'text');
    return true;
  }, [registrarSaida]);

  const enviarModelo = useCallback(async (p: { conversaId?: string; leadId?: string; nome: string; idioma: string; parametros: string[] }) => {
    const modelo = MODELOS.find((m) => m.nome === p.nome);
    const texto = (modelo?.texto ?? p.nome).replace(/\{\{(\d+)\}\}/g, (_, n) => p.parametros[Number(n) - 1] ?? '');
    let cid = p.conversaId ?? null;
    if (!cid && p.leadId) {
      const existente = todas.find((c) => c.lead_id === p.leadId);
      if (existente) cid = existente.id;
      else {
        const lead = leads.find((l) => l.id === p.leadId);
        if (!lead) return null;
        const nova: Conversa = {
          id: id('c'), empresa_id: EMPRESA, wa_id: `55${(lead.telefone ?? '').replace(/\D/g, '')}`, nome_contato: lead.nome, lead_id: lead.id,
          responsavel_id: lead.vendedor_id ?? (admin ? null : userId), status: 'aberta', nao_lidas: 0, ultima_previa: null, ultima_mensagem_em: null, ultima_entrada_em: null, created_at: new Date().toISOString(),
        };
        setTodas((l) => [nova, ...l]);
        setMensagens((t) => ({ ...t, [nova.id]: [] }));
        cid = nova.id;
      }
    }
    if (!cid) return null;
    await new Promise((r) => setTimeout(r, 250));
    const alvo = cid;
    setTimeout(() => registrarSaida(alvo, texto, 'template'), 0);
    return cid;
  }, [todas, leads, admin, userId, registrarSaida]);

  const atribuir = useCallback(async (cid: string, resp: string | null) => {
    setTodas((l) => l.map((c) => (c.id === cid ? { ...c, responsavel_id: resp } : c)));
    toast.success(resp ? (resp === userId ? 'Conversa assumida por você.' : 'Responsável alterado.') : 'Conversa sem responsável.');
  }, [userId]);

  const arquivar = useCallback(async (cid: string, arquivada: boolean) => {
    setTodas((l) => l.map((c) => (c.id === cid ? { ...c, status: arquivada ? 'arquivada' : 'aberta' } : c)));
    toast.success(arquivada ? 'Conversa arquivada.' : 'Conversa reaberta.');
  }, []);

  const baixarMidia = useCallback(async () => {
    toast('Na demonstração os arquivos não abrem', { description: 'No seu CRM, fotos, áudios e documentos recebidos abrem aqui mesmo.' });
    return null;
  }, []);

  const conectar = useCallback(async (d: DadosConexao) => {
    void d;
    setConta(CONTA);
    toast('Na demonstração nada é salvo', { description: 'No seu CRM, os dados ficam guardados em um cofre criptografado.' });
    return true;
  }, []);
  const testar = useCallback(async (): Promise<ResultadoTeste> => ({ ok: true, numero: CONTA.numero!, nome: CONTA.nome_verificado!, qualidade: 'GREEN' }), []);
  const desconectar = useCallback(async () => { setConta(null); toast.success('WhatsApp desconectado (demonstração).'); return true; }, []);

  const naoLidas = conversas.filter((c) => c.status === 'aberta').reduce((s, c) => s + c.nao_lidas, 0);

  return {
    carregando: false, conta, conversas, naoLidas, mensagens, webhookUrl: 'https://seu-projeto.supabase.co/functions/v1/whatsapp-webhook',
    abrirConversa, enviarTexto, listarModelos: async () => MODELOS, enviarModelo, atribuir, arquivar, baixarMidia, conectar, testar, desconectar,
  };
}
