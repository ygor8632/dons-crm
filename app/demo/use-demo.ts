'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { prepararImagem, type TipoImagem } from '@/lib/marca-storage';
import type { Painel } from '../painel/_lib/use-painel';
import type { Anotacao, Atividade, BaseLegal, Empresa, Etapa, Lead, LinhaImportacao, Membro, Meta, ModeloMensagem, Movimento, Papel, RegistroAcesso, Tarefa, TipoAtividade } from '../painel/_lib/tipos';
import { baixarJSON, emAberto, etapaFinal, nomeArquivo, proximaTarefa, rotuloBaseLegal } from '../painel/_lib/util';
import { avisarComProximoPasso, emDias } from '../painel/_components/proximo-passo';

/*
 * Demonstração: a mesma interface do usePainel, com dados fictícios em memória.
 * Tudo funciona (criar, mover, anotar, agendar, trocar a marca), nada é gravado,
 * e recarregar a página recomeça do zero.
 */

const EMPRESA_ID = 'demo';
const EU = 'demo-admin';
const dias = (d: number, hora?: number) => {
  const t = new Date(Date.now() + d * 864e5);
  if (hora !== undefined) t.setHours(hora, 0, 0, 0);
  return t.toISOString();
};

const ETAPAS: Etapa[] = [
  { id: 'e1', empresa_id: EMPRESA_ID, nome: 'Aguardando contato', cor: '#c99a06', ordem: 1, probabilidade: 10, dias_parado: 2 },
  { id: 'e2', empresa_id: EMPRESA_ID, nome: 'Em atendimento', cor: '#5d73e0', ordem: 2, probabilidade: 30, dias_parado: 5 },
  { id: 'e3', empresa_id: EMPRESA_ID, nome: 'Proposta enviada', cor: '#da4c3c', ordem: 3, probabilidade: 60, dias_parado: 7 },
  { id: 'e4', empresa_id: EMPRESA_ID, nome: 'Venda concluída', cor: '#1f8f4e', ordem: 4, probabilidade: 100, dias_parado: null },
];

const EQUIPE: Membro[] = [
  { id: EU, empresa_id: EMPRESA_ID, nome: 'Marina Duarte', email: 'marina@studiofit.exemplo', role: 'admin' },
  { id: 'demo-carlos', empresa_id: EMPRESA_ID, nome: 'Carlos Lima', email: 'carlos@studiofit.exemplo', role: 'vendedor' },
  { id: 'demo-bia', empresa_id: EMPRESA_ID, nome: 'Beatriz Souza', email: 'beatriz@studiofit.exemplo', role: 'vendedor' },
];

// [nome, origem, etapa, valor, responsável, dias atrás]
const BASE: [string, string, string, number, string | null, number][] = [
  ['Clínica Vida Plena', 'Google Ads', 'e1', 4500, 'demo-carlos', 1],
  ['Construtora Horizonte Azul', 'Indicação', 'e2', 18000, 'demo-bia', 3],
  ['Padaria Pão de Mel', 'Instagram', 'e3', 1200, 'demo-carlos', 5],
  ['Escritório Moraes Advocacia', 'Site', 'e4', 32000, 'demo-bia', 8],
  ['Studio Pilates Equilíbrio', 'WhatsApp', 'e1', 2600, null, 0],
  ['Auto Peças Rodovia', 'Facebook', 'e2', 7800, 'demo-carlos', 26],
  ['Imobiliária Casa Nova', 'Google Ads', 'e3', 54000, 'demo-bia', 11],
  ['Ótica Visão Clara', 'Instagram', 'e4', 3100, 'demo-carlos', 33],
  ['Pet Shop Patas', 'Indicação', 'e1', 900, null, 2],
  ['Restaurante Sabor Mineiro', 'Site', 'e2', 6400, 'demo-bia', 29],
  ['Academia Força Total', 'WhatsApp', 'e3', 2900, 'demo-carlos', 40],
  ['Colégio Integrado Saber', 'Facebook', 'e4', 15000, EU, 21],
  ['Farmácia Bem Estar', 'Google Ads', 'e1', 4100, 'demo-bia', 4],
  ['Agência Criativa Norte', 'Instagram', 'e2', 9800, EU, 38],
  ['Laboratório Análise Certa', 'Site', 'e4', 12500, 'demo-carlos', 45],
  ['Hotel Mirante da Serra', 'Indicação', 'e3', 27000, 'demo-bia', 52],
  ['Floricultura Jardim Secreto', 'WhatsApp', 'e1', 750, null, 70],
  ['Contabilidade Exata', 'Google Ads', 'e4', 8800, EU, 95],
];

const nomeDe = (id: string | null) => EQUIPE.find((m) => m.id === id)?.nome ?? null;

function leadsIniciais(): Lead[] {
  return BASE.map(([nome, origem, etapa, valor, resp, d], i) => ({
    id: `l${i + 1}`,
    empresa_id: EMPRESA_ID,
    nome,
    email: `contato@${nome.toLowerCase().normalize('NFD').replace(/[^a-z]+/g, '').slice(0, 14)}.exemplo`,
    telefone: `1198${String(1000000 + i * 73129).slice(0, 7)}`,
    origem,
    etapa_id: etapa,
    valor,
    vendedor_id: resp,
    vendedor: resp ? { nome: nomeDe(resp) } : null,
    created_at: dias(-d),
    situacao: etapa === 'e4' ? 'ganho' : 'aberto',
    fechado_em: etapa === 'e4' ? dias(-Math.floor(d * 0.3)) : null,
    // Alguns leads sem atividade há dias, para aparecerem como "parados"
    etapa_desde: etapa === 'e4' ? dias(-Math.floor(d * 0.3)) : dias(-Math.floor(d * 0.4)),
    ultima_atividade_em: dias(-Math.min(d, [0, 1, 4].includes(i) ? 0 : d)),
    // LGPD: base legal conforme a origem; Facebook fica sem informar, para mostrar o aviso
    base_legal: origem === 'Site' ? 'consentimento' : origem === 'WhatsApp' || origem === 'Indicação' ? 'contrato' : origem === 'Facebook' ? null : 'legitimo_interesse',
    consentimento_em: origem === 'Site' ? dias(-d) : null,
    nao_contatar: i === 7,
  }));
}

// Negócios já fechados nos meses anteriores: [nome, origem, valor, responsável, criado há, fechado há, resultado, motivo]
const HISTORICO: [string, string, number, string, number, number, 'ganho' | 'perdido', string | null][] = [
  ['Clínica Sorriso Feliz', 'Google Ads', 9600, 'demo-bia', 70, 52, 'ganho', null],
  ['Mercado Bom Preço', 'Indicação', 21000, 'demo-carlos', 64, 40, 'ganho', null],
  ['Escola de Idiomas Fluent', 'Site', 6200, EU, 58, 37, 'ganho', null],
  ['Barbearia Corte Fino', 'Instagram', 1800, 'demo-carlos', 50, 41, 'perdido', 'Sem resposta'],
  ['Transportadora Via Sul', 'Google Ads', 38000, 'demo-bia', 66, 35, 'perdido', 'Escolheu concorrente'],
  ['Doceria Açúcar Mascavo', 'WhatsApp', 2400, 'demo-carlos', 46, 38, 'perdido', 'Preço'],
  ['Consultório Dr. Ramos', 'Indicação', 7300, 'demo-bia', 98, 75, 'ganho', null],
  ['Papelaria Ponto Final', 'Facebook', 1300, 'demo-carlos', 92, 80, 'perdido', 'Preço'],
  ['Clínica Veterinária Amigo', 'Site', 11200, 'demo-carlos', 34, 12, 'ganho', null],
  ['Eventos Celebrar', 'Instagram', 4800, EU, 27, 9, 'perdido', 'Não era o momento'],
];

function leadsPerdidos(): Lead[] {
  return [
    ...HISTORICO.map(([nome, origem, valor, resp, criado, fechado, resultado, motivo], i): Lead => ({
      id: `h${i + 1}`, empresa_id: EMPRESA_ID, nome, email: null, telefone: `1197${String(2000000 + i * 51713).slice(0, 7)}`, origem,
      etapa_id: resultado === 'ganho' ? 'e4' : i % 2 ? 'e3' : 'e2', valor, vendedor_id: resp, vendedor: { nome: nomeDe(resp) },
      created_at: dias(-criado), situacao: resultado, motivo_perda: motivo, fechado_em: dias(-fechado), etapa_desde: dias(-fechado), ultima_atividade_em: dias(-fechado),
    })),
    { id: 'l90', empresa_id: EMPRESA_ID, nome: 'Buffet Festa Boa', email: 'contato@festaboa.exemplo', telefone: '11987001122', origem: 'Instagram', etapa_id: 'e2', valor: 5200, vendedor_id: 'demo-bia', vendedor: { nome: 'Beatriz Souza' }, created_at: dias(-20), situacao: 'perdido', motivo_perda: 'Preço', fechado_em: dias(-6), etapa_desde: dias(-12), ultima_atividade_em: dias(-6) },
  ];
}

/** Caminho de cada lead pelas etapas, do cadastro até a etapa atual (o banco grava isso por trigger). */
function movimentosIniciais(leads: Lead[]): Movimento[] {
  const ordem = (id?: string | null) => ETAPAS.find((e) => e.id === id)?.ordem ?? 1;
  return leads.flatMap((l) => {
    const passos = ETAPAS.filter((e) => e.ordem <= ordem(l.etapa_id));
    const ini = new Date(l.created_at).getTime();
    const fim = new Date(l.etapa_desde || l.created_at).getTime();
    return passos.map((e, i) => ({
      lead_id: l.id,
      de_etapa_id: i === 0 ? null : passos[i - 1].id,
      para_etapa_id: e.id,
      created_at: new Date(i === passos.length - 1 ? fim : ini + ((fim - ini) * i) / Math.max(passos.length - 1, 1)).toISOString(),
    }));
  }).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

const mesISO = (delta = 0) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + delta); return d.toISOString().slice(0, 8) + '01'; };

function metasIniciais(): Meta[] {
  return [0, -1].flatMap((m) => [
    { id: `mt-e${m}`, usuario_id: null, mes: mesISO(m), valor: 80000, quantidade: 6 },
    { id: `mt-a${m}`, usuario_id: EU, mes: mesISO(m), valor: 15000, quantidade: 1 },
    { id: `mt-c${m}`, usuario_id: 'demo-carlos', mes: mesISO(m), valor: 25000, quantidade: 3 },
    { id: `mt-b${m}`, usuario_id: 'demo-bia', mes: mesISO(m), valor: 40000, quantidade: 2 },
  ]);
}

function modelosIniciais(): ModeloMensagem[] {
  return [
    { id: 'm1', etapa_id: 'e1', titulo: 'Primeiro contato', texto: 'Olá, {primeiro_nome}! Aqui é {vendedor}, da {empresa}. Vi seu interesse e queria entender melhor o que você procura. Podemos conversar hoje?', ordem: 1 },
    { id: 'm2', etapa_id: 'e3', titulo: 'Retorno da proposta', texto: 'Oi, {primeiro_nome}! Conseguiu ver a proposta que enviei? Fico à disposição para ajustar o que precisar.', ordem: 2 },
    { id: 'm3', etapa_id: null, titulo: 'Agradecimento', texto: 'Obrigado pelo retorno, {primeiro_nome}! Qualquer dúvida, é só chamar.', ordem: 3 },
  ];
}

function acessosIniciais(): RegistroAcesso[] {
  const h = (horas: number) => new Date(Date.now() - horas * 3600e3).toISOString();
  return [
    { id: 'r1', created_at: h(3), usuario_id: 'demo-carlos', acao: 'visualizou', entidade: 'lead', entidade_id: 'l2' },
    { id: 'r2', created_at: h(26), usuario_id: 'demo-bia', acao: 'visualizou', entidade: 'lead', entidade_id: 'l90' },
    { id: 'r3', created_at: h(50), usuario_id: EU, acao: 'base_legal', entidade: 'lead', entidade_id: 'l1', detalhes: 'Base legal: Consentimento' },
  ];
}

function atividadesIniciais(): Record<string, Atividade[]> {
  return {
    l2: [
      { id: 'a1', lead_id: 'l2', tipo: 'etapa', descricao: 'Aguardando contato → Em atendimento', created_at: dias(-2), usuario_id: 'demo-bia' },
      { id: 'a2', lead_id: 'l2', tipo: 'whatsapp', descricao: 'Mensagem: Primeiro contato', created_at: dias(-3), usuario_id: 'demo-bia' },
    ],
  };
}

function tarefasIniciais(): Tarefa[] {
  return [
    { id: 't1', lead_id: 'l2', descricao: 'Ligar para confirmar a proposta', data_vencimento: dias(0, 15), concluida: false },
    { id: 't2', lead_id: 'l7', descricao: 'Enviar contrato revisado', data_vencimento: dias(-1, 10), concluida: false },
    { id: 't3', lead_id: 'l10', descricao: 'Visita para apresentar os planos', data_vencimento: dias(2, 9), concluida: false },
    { id: 't4', lead_id: 'l1', descricao: 'Primeiro contato pelo WhatsApp', data_vencimento: dias(1, 11), concluida: false },
    { id: 't5', lead_id: 'l4', descricao: 'Enviar boas-vindas e acesso', data_vencimento: dias(-3, 14), concluida: true },
  ];
}

function anotacoesIniciais(): Record<string, Anotacao[]> {
  return {
    l2: [
      { id: 'n1', texto: 'Quer fechar até o fim do mês. Pediu desconto à vista.', created_at: dias(-1), perfis: { nome: 'Beatriz Souza' } },
      { id: 'n2', texto: 'Reunião com o sócio marcada para quinta.', created_at: dias(-3), perfis: { nome: 'Beatriz Souza' } },
    ],
    l7: [{ id: 'n3', texto: 'Jurídico deles revisando a cláusula de multa.', created_at: dias(-2), perfis: { nome: 'Beatriz Souza' } }],
  };
}

let seq = 100;
const novoId = (p: string) => `${p}${++seq}`;
const espera = () => new Promise((r) => setTimeout(r, 180)); // dá tempo de ver o "Salvando…"

export function useDemoPainel() {
  const router = useRouter();
  const [papel, setPapel] = useState<Papel>('admin');
  const [empresa, setEmpresa] = useState<Empresa>({
    id: EMPRESA_ID, nome: 'Studio Fit', ativo: true, webhook_token: 'demo-0000-0000-0000-000000000000',
    cor_primaria: '#da4c3c', logo_url: null, cor_fundo_logo: 'transparent', fundo_url: null,
  });
  const [imagens, setImagens] = useState<{ logo: string | null; fundo: string | null }>({ logo: null, fundo: null });
  const [etapas, setEtapas] = useState<Etapa[]>(ETAPAS);
  const [todosLeads, setLeads] = useState<Lead[]>(() => [...leadsIniciais(), ...leadsPerdidos()]);
  const [todosMovimentos, setMovimentos] = useState<Movimento[]>(() => movimentosIniciais([...leadsIniciais(), ...leadsPerdidos()]));
  const [metas, setMetas] = useState<Meta[]>(metasIniciais);
  const [modelos, setModelos] = useState<ModeloMensagem[]>(modelosIniciais);
  const atividades = useRef<Record<string, Atividade[]>>(atividadesIniciais());
  const [equipe, setEquipe] = useState<Membro[]>(EQUIPE);
  const [todasTarefas, setTarefasEstado] = useState<Tarefa[]>(tarefasIniciais);
  // Espelho síncrono: a ficha relê as tarefas no mesmo clique em que cria uma
  const tarefasRef = useRef<Tarefa[]>(todasTarefas);
  const setTarefas = useCallback((fn: (prev: Tarefa[]) => Tarefa[]) => {
    tarefasRef.current = fn(tarefasRef.current);
    setTarefasEstado(tarefasRef.current);
  }, []);
  const anotacoes = useRef<Record<string, Anotacao[]>>(anotacoesIniciais());

  // Como vendedor, vale a mesma regra do banco: os próprios leads e os sem dono
  const userId = papel === 'admin' ? EU : 'demo-carlos';
  const leads = useMemo(
    () => (papel === 'admin' ? todosLeads : todosLeads.filter((l) => !l.vendedor_id || l.vendedor_id === userId)),
    [todosLeads, papel, userId],
  );
  // Como o RLS: movimentos só dos leads visíveis
  const movimentos = useMemo(() => {
    if (papel === 'admin') return todosMovimentos;
    const visiveis = new Set(leads.map((l) => l.id));
    return todosMovimentos.filter((m) => visiveis.has(m.lead_id));
  }, [todosMovimentos, leads, papel]);
  const tarefas = useMemo(
    () => todasTarefas.filter((t) => leads.some((l) => l.id === t.lead_id)),
    [todasTarefas, leads],
  );

  const sair = useCallback(async () => { router.push('/'); }, [router]);

  const registrar = useCallback((leadId: string, tipo: TipoAtividade, descricao?: string) => {
    const agora = new Date().toISOString();
    atividades.current = { ...atividades.current, [leadId]: [{ id: novoId('a'), lead_id: leadId, tipo, descricao: descricao ?? null, created_at: agora, usuario_id: userId }, ...(atividades.current[leadId] ?? [])] };
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ultima_atividade_em: agora } : l)));
  }, [userId]);

  const agendar = useCallback(async (leadId: string, descricao: string, quando: Date) => {
    setTarefas((prev) => [...prev, { id: novoId('t'), lead_id: leadId, descricao, data_vencimento: quando.toISOString(), concluida: false }].sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento)));
    toast.success(`Agendado: ${descricao.toLowerCase()} em ${quando.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}`);
  }, [setTarefas]);

  const criarLead = useCallback(async (d: { nome: string; email: string; telefone: string; origem: string; vendedor_id: string; valor: string; documento?: string; base_legal?: string }) => {
    await espera();
    const resp = papel === 'vendedor' ? userId : d.vendedor_id || null;
    setLeads((prev) => [{
      id: novoId('l'), empresa_id: EMPRESA_ID, nome: d.nome, email: d.email || null, telefone: d.telefone || null,
      origem: d.origem, etapa_id: etapas[0]?.id, valor: parseFloat(d.valor) || 0, vendedor_id: resp,
      vendedor: resp ? { nome: nomeDe(resp) } : null, created_at: new Date().toISOString(),
      documento: d.documento?.trim() || null, base_legal: (d.base_legal || null) as Lead['base_legal'], consentimento_em: d.base_legal === 'consentimento' ? new Date().toISOString() : null, situacao: 'aberto', etapa_desde: new Date().toISOString(), ultima_atividade_em: new Date().toISOString(),
    }, ...prev]);
    toast.success(`${d.nome} entrou no funil`);
    return true;
  }, [papel, userId, etapas]);

  const gravarLead = useCallback((id: string, patch: Partial<Lead>) => {
    const agora = new Date().toISOString();
    if (patch.etapa_id) {
      const atual = todosLeads.find((l) => l.id === id);
      if (atual && atual.etapa_id !== patch.etapa_id) setMovimentos((prev) => [...prev, { lead_id: id, de_etapa_id: atual.etapa_id ?? null, para_etapa_id: patch.etapa_id!, created_at: agora }]);
    }
    setLeads((prev) => prev.map((l) => {
      if (l.id !== id) return l;
      const novo: Lead = { ...l, ...patch, ultima_atividade_em: agora };
      if (patch.etapa_id && patch.etapa_id !== l.etapa_id) novo.etapa_desde = agora;
      if (patch.situacao && patch.situacao !== l.situacao) { novo.fechado_em = patch.situacao === 'aberto' ? null : agora; if (patch.situacao === 'aberto') novo.motivo_perda = null; }
      return novo;
    }));
  }, [todosLeads]);

  const salvarMeta = useCallback(async (m: { usuario_id: string | null; mes: string; valor: number | null; quantidade: number | null }) => {
    setMetas((prev) => {
      const resto = prev.filter((x) => !(x.mes === m.mes && x.usuario_id === m.usuario_id));
      if (m.valor == null && m.quantidade == null) return resto;
      return [{ id: novoId('mt'), ...m }, ...resto];
    });
    return true;
  }, []);

  const moverLead = useCallback(async (id: string, etapaId: string) => {
    const anterior = todosLeads.find((l) => l.id === id);
    if (!anterior || anterior.etapa_id === etapaId) return;
    const final = etapaFinal(etapas);
    const de = etapas.find((e) => e.id === anterior.etapa_id)?.nome ?? 'sem etapa';
    const para = etapas.find((e) => e.id === etapaId)?.nome ?? '';
    const patch: Partial<Lead> = { etapa_id: etapaId };
    if (etapaId === final?.id) patch.situacao = 'ganho';
    else if (anterior.situacao === 'ganho') patch.situacao = 'aberto';
    gravarLead(id, patch);
    registrar(id, patch.situacao === 'ganho' ? 'ganho' : 'etapa', `${de} → ${para}`);
    const depois = { ...anterior, ...patch };
    avisarComProximoPasso({
      titulo: patch.situacao === 'ganho' ? `${anterior.nome}: venda concluída` : `${anterior.nome} → ${para}`,
      sugerir: emAberto(depois, etapas) && !proximaTarefa(depois, tarefasRef.current),
      agendar: (descricao, quando) => agendar(id, descricao, quando),
      desfazer: () => gravarLead(id, { etapa_id: anterior.etapa_id, situacao: anterior.situacao ?? 'aberto' }),
    });
  }, [todosLeads, etapas, gravarLead, registrar, agendar]);

  const fecharLead = useCallback(async (id: string, resultado: 'ganho' | 'perdido', motivo?: string) => {
    const anterior = todosLeads.find((l) => l.id === id);
    if (!anterior) return false;
    gravarLead(id, resultado === 'ganho'
      ? { situacao: 'ganho', etapa_id: etapaFinal(etapas)?.id ?? anterior.etapa_id }
      : { situacao: 'perdido', motivo_perda: motivo?.trim() || null });
    registrar(id, resultado, resultado === 'perdido' ? motivo : undefined);
    toast(resultado === 'ganho' ? `${anterior.nome}: venda concluída` : `${anterior.nome} marcado como perdido`, {
      action: { label: 'Desfazer', onClick: () => gravarLead(id, { situacao: anterior.situacao ?? 'aberto', etapa_id: anterior.etapa_id, motivo_perda: anterior.motivo_perda ?? null }) },
    });
    return true;
  }, [todosLeads, etapas, gravarLead, registrar]);

  const reabrirLead = useCallback(async (id: string) => {
    const anterior = todosLeads.find((l) => l.id === id);
    if (!anterior) return;
    const ordenadas = [...etapas].sort((a, b) => a.ordem - b.ordem);
    const patch: Partial<Lead> = { situacao: 'aberto' };
    if (anterior.etapa_id === ordenadas[ordenadas.length - 1]?.id && ordenadas.length > 1) patch.etapa_id = ordenadas[ordenadas.length - 2].id;
    gravarLead(id, patch);
    registrar(id, 'reaberto');
    toast.success(`${anterior.nome} voltou para a negociação`);
  }, [todosLeads, etapas, gravarLead, registrar]);

  const salvarProbabilidadeLead = useCallback(async (id: string, probabilidade: number | null) => {
    gravarLead(id, { probabilidade });
    toast.success(probabilidade == null ? 'Chance volta a seguir a etapa' : `Chance de fechar: ${probabilidade}%`);
  }, [gravarLead]);

  const registrarWhatsApp = useCallback((id: string, modelo?: string) => {
    registrar(id, 'whatsapp', modelo ? `Mensagem: ${modelo}` : 'Conversa aberta');
  }, [registrar]);

  const importarLeads = useCallback(async (linhas: LinhaImportacao[]) => {
    if (linhas.length === 0) return false;
    const agora = new Date().toISOString();
    const novos: Lead[] = linhas.map((l) => ({ ...l, id: novoId('l'), empresa_id: EMPRESA_ID, etapa_id: etapas[0]?.id, vendedor_id: papel === 'vendedor' ? userId : null, created_at: agora, situacao: 'aberto', etapa_desde: agora, ultima_atividade_em: agora }));
    const ids = novos.map((n) => n.id);
    setLeads((prev) => [...novos, ...prev]);
    toast.success(`${novos.length} ${novos.length === 1 ? 'lead importado' : 'leads importados'}`, {
      description: 'Na demonstração, ficam só até recarregar a página.',
      duration: 12000,
      action: { label: 'Desfazer', onClick: () => { setLeads((prev) => prev.filter((l) => !ids.includes(l.id))); toast.success('Importação desfeita'); } },
    });
    return true;
  }, [etapas, papel, userId]);

  const carregarFicha = useCallback(async (leadId: string) => ({
    anotacoes: anotacoes.current[leadId] ?? [],
    tarefas: tarefasRef.current.filter((t) => t.lead_id === leadId).sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento)),
    atividades: atividades.current[leadId] ?? [],
  }), []);

  const adicionarAnotacao = useCallback(async (leadId: string, texto: string) => {
    anotacoes.current = { ...anotacoes.current, [leadId]: [{ id: novoId('n'), texto, created_at: new Date().toISOString(), perfis: { nome: nomeDe(userId) } }, ...(anotacoes.current[leadId] ?? [])] };
  }, [userId]);

  const apagarAnotacao = useCallback(async (id: string) => {
    const novo: Record<string, Anotacao[]> = {};
    for (const [k, v] of Object.entries(anotacoes.current)) novo[k] = v.filter((n) => n.id !== id);
    anotacoes.current = novo;
  }, []);

  const criarTarefa = useCallback(async (leadId: string, descricao: string, data: string) => {
    setTarefas((prev) => [...prev, { id: novoId('t'), lead_id: leadId, descricao, data_vencimento: new Date(data).toISOString(), concluida: false }]);
  }, [setTarefas]);

  const alternarTarefa = useCallback(async (id: string, concluida: boolean) => {
    const tarefa = tarefasRef.current.find((t) => t.id === id);
    setTarefas((prev) => prev.map((t) => (t.id === id ? { ...t, concluida: !concluida } : t)));
    const lead = tarefa && todosLeads.find((l) => l.id === tarefa.lead_id);
    if (!concluida && lead && emAberto(lead, etapas)) {
      avisarComProximoPasso({
        titulo: `Follow-up concluído: ${lead.nome}`,
        sugerir: !proximaTarefa(lead, tarefasRef.current),
        agendar: (descricao, quando) => agendar(lead.id, descricao, quando),
        desfazer: () => setTarefas((prev) => prev.map((t) => (t.id === id ? { ...t, concluida: false } : t))),
      });
    }
  }, [setTarefas, todosLeads, etapas, agendar]);

  const reagendarTarefas = useCallback(async (ids: string[], d: number) => {
    if (ids.length === 0) return;
    const quando = emDias(d).toISOString();
    setTarefas((prev) => prev.map((t) => (ids.includes(t.id) ? { ...t, data_vencimento: quando } : t)).sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento)));
    toast.success(`${ids.length} ${ids.length === 1 ? 'follow-up reagendado' : 'follow-ups reagendados'} para ${new Date(quando).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}`);
  }, [setTarefas]);

  const apagarTarefa = useCallback(async (id: string) => {
    setTarefas((prev) => prev.filter((t) => t.id !== id));
  }, [setTarefas]);

  const salvarMarca = useCallback(async (d: { nome: string; cor_primaria: string }) => {
    await espera();
    setEmpresa((e) => ({ ...e, ...d }));
    toast.success('Identidade visual aplicada', { description: 'Na demonstração, vale até recarregar a página.' });
  }, []);

  const enviarMarca = useCallback(async (tipo: TipoImagem, arquivo: File) => {
    try {
      const blob = await prepararImagem(arquivo, tipo); // mesma redução/conversão do painel real
      const url = URL.createObjectURL(blob);
      setImagens((i) => ({ ...i, [tipo]: url }));
      toast.success(tipo === 'logo' ? 'Logo aplicado' : 'Imagem de fundo aplicada', { description: 'Na demonstração, a imagem não sai do seu navegador.' });
      return true;
    } catch (e) {
      toast.error(tipo === 'logo' ? 'Logo não aplicado' : 'Fundo não aplicado', { description: e instanceof Error ? e.message : undefined });
      return false;
    }
  }, []);

  const removerMarca = useCallback(async (tipo: TipoImagem) => {
    setImagens((i) => ({ ...i, [tipo]: null }));
    toast.success(tipo === 'logo' ? 'Logo removido' : 'Voltamos ao fundo padrão');
  }, []);

  const salvarEtapa = useCallback(async (id: string, patch: Partial<Pick<Etapa, 'probabilidade' | 'dias_parado' | 'nome'>>) => {
    setEtapas((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    return true;
  }, []);

  const salvarModelo = useCallback(async (m: { id?: string; etapa_id: string | null; titulo: string; texto: string }) => {
    await espera();
    const corpo = { etapa_id: m.etapa_id, titulo: m.titulo.trim(), texto: m.texto.trim() };
    setModelos((prev) => (m.id ? prev.map((x) => (x.id === m.id ? { ...x, ...corpo } : x)) : [...prev, { id: novoId('m'), ordem: prev.length + 1, ...corpo }]));
    toast.success(m.id ? 'Mensagem atualizada' : 'Mensagem criada');
    return true;
  }, []);

  const apagarModelo = useCallback(async (id: string) => {
    setModelos((prev) => prev.filter((m) => m.id !== id));
    toast.success('Mensagem apagada');
  }, []);

  const adicionarEtapa = useCallback(async (nome: string, cor: string) => {
    setEtapas((prev) => [...prev, { id: novoId('e'), empresa_id: EMPRESA_ID, nome, cor, ordem: prev.length + 1, probabilidade: null, dias_parado: 7 }]);
    toast.success(`Etapa “${nome}” criada`);
  }, []);

  const removerEtapa = useCallback(async (etapa: Etapa) => {
    const n = todosLeads.filter((l) => l.etapa_id === etapa.id).length;
    if (n > 0) {
      toast.error(`“${etapa.nome}” ainda tem ${n} ${n === 1 ? 'lead' : 'leads'}`, { description: 'Mova os leads para outra etapa antes de excluir.' });
      return;
    }
    setEtapas((prev) => prev.filter((e) => e.id !== etapa.id));
    toast.success(`Etapa “${etapa.nome}” excluída`);
  }, [todosLeads]);

  const convidar = useCallback(async (email: string) => {
    await espera();
    setEquipe((prev) => [...prev, { id: novoId('m'), empresa_id: EMPRESA_ID, nome: null, email, role: 'vendedor' }]);
    toast.success(`Convite simulado para ${email}`, { description: 'Na demonstração, nenhum e-mail é enviado.' });
    return true;
  }, []);

  const mudarPapel = useCallback(async (id: string, novo: Papel) => {
    setEquipe((prev) => prev.map((m) => (m.id === id ? { ...m, role: novo } : m)));
    toast.success('Cargo atualizado');
  }, []);

  const salvarNome = useCallback(async (nome: string) => {
    await espera();
    setEquipe((prev) => prev.map((m) => (m.id === userId ? { ...m, nome } : m)));
    toast.success('Nome atualizado', { description: 'Na demonstração, vale até recarregar a página.' });
    return true;
  }, [userId]);

  /* ---------- LGPD (em memória) ---------- */
  const acessos = useRef<RegistroAcesso[]>(acessosIniciais());
  const vistos = useRef(new Map<string, number>());
  const anotarAcesso = useCallback((acao: string, leadId?: string | null, detalhes?: string) => {
    acessos.current = [{ id: novoId('r'), created_at: new Date().toISOString(), usuario_id: userId, acao, entidade: 'lead', entidade_id: leadId ?? null, detalhes: detalhes ?? null }, ...acessos.current];
  }, [userId]);

  const registrarAcesso = useCallback(async (acao: string, leadId?: string | null, detalhes?: string) => {
    if (acao === 'visualizou' && leadId) {
      if (Date.now() - (vistos.current.get(leadId) ?? 0) < 10 * 60e3) return;
      vistos.current.set(leadId, Date.now());
    }
    anotarAcesso(acao, leadId, detalhes);
  }, [anotarAcesso]);

  const salvarPrivacidadeLead = useCallback(async (id: string, patch: { base_legal?: BaseLegal | null; nao_contatar?: boolean }) => {
    const corpo: Partial<Lead> = { ...patch };
    if ('base_legal' in patch) corpo.consentimento_em = patch.base_legal === 'consentimento' ? new Date().toISOString() : null;
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...corpo } : l)));
    if ('base_legal' in patch) anotarAcesso('base_legal', id, `Base legal: ${rotuloBaseLegal(patch.base_legal)}`);
    else anotarAcesso('nao_contatar', id, patch.nao_contatar ? 'Marcado para não contatar' : 'Pode voltar a ser contatado');
    toast.success('base_legal' in patch ? `Base legal: ${rotuloBaseLegal(patch.base_legal)}` : patch.nao_contatar ? 'Marcado para não contatar' : 'Pode voltar a ser contatado');
  }, [anotarAcesso]);

  const exportarDadosLead = useCallback(async (id: string) => {
    const lead = todosLeads.find((l) => l.id === id);
    if (!lead) return;
    const etapa = (eid?: string | null) => etapas.find((e) => e.id === eid)?.nome ?? null;
    baixarJSON(`dados-${nomeArquivo(lead.nome)}.json`, {
      gerado_em: new Date().toISOString(), controlador: empresa.nome,
      contato: { nome: lead.nome, email: lead.email ?? null, telefone: lead.telefone ?? null, cpf_cnpj: lead.documento ?? null, origem: lead.origem ?? null, cadastrado_em: lead.created_at, base_legal: rotuloBaseLegal(lead.base_legal), consentimento_em: lead.consentimento_em ?? null, nao_contatar: !!lead.nao_contatar },
      negociacao: { etapa: etapa(lead.etapa_id), situacao: lead.situacao ?? 'aberto', valor: lead.valor ?? 0, responsavel: lead.vendedor?.nome ?? null },
      anotacoes: (anotacoes.current[id] ?? []).map((n) => ({ texto: n.texto, created_at: n.created_at })),
      follow_ups: tarefasRef.current.filter((t) => t.lead_id === id).map((t) => ({ descricao: t.descricao, data_vencimento: t.data_vencimento, concluida: t.concluida })),
      atividades: (atividades.current[id] ?? []).map((a) => ({ tipo: a.tipo, descricao: a.descricao, created_at: a.created_at })),
      historico_de_etapas: todosMovimentos.filter((m) => m.lead_id === id).map((m) => ({ de: etapa(m.de_etapa_id), para: etapa(m.para_etapa_id), em: m.created_at })),
    });
    anotarAcesso('exportou', id);
    toast.success('Arquivo com os dados do contato baixado');
  }, [todosLeads, etapas, empresa, todosMovimentos, anotarAcesso]);

  const anonimizarLead = useCallback(async (id: string, motivo?: string) => {
    if (papel !== 'admin') { toast.error('Só o administrador pode anonimizar contatos.'); return false; }
    await espera();
    const agora = new Date().toISOString();
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, nome: 'Contato removido', email: null, telefone: null, documento: null, chave_telefone: null, consentimento_em: null, nao_contatar: true, anonimizado_em: agora } : l)));
    setTarefas((prev) => prev.filter((t) => t.lead_id !== id || t.concluida).map((t) => (t.lead_id === id ? { ...t, descricao: 'Follow-up' } : t)));
    anotacoes.current = { ...anotacoes.current, [id]: [] };
    atividades.current = { ...atividades.current, [id]: (atividades.current[id] ?? []).map((a) => ({ ...a, descricao: null })) };
    anotarAcesso('anonimizou', id, motivo?.trim() || 'Pedido do titular');
    toast.success('Dados pessoais apagados. Os números do funil foram mantidos.');
    return true;
  }, [papel, setTarefas, anotarAcesso]);

  const carregarAcessos = useCallback(async (filtro: { leadId?: string; limite?: number } = {}) => {
    if (papel !== 'admin') return [];
    return acessos.current.filter((r) => !filtro.leadId || r.entidade_id === filtro.leadId).slice(0, filtro.limite ?? 200);
  }, [papel]);

  const removerMembro = useCallback(async (m: Membro) => {
    if (m.id === userId) { toast.error('Você não pode remover o seu próprio acesso.'); return; }
    setEquipe((prev) => prev.filter((x) => x.id !== m.id));
    toast.success(`Acesso de ${m.email} revogado`);
  }, [userId]);

  const gerarIconeApp = useCallback(async () => {
    toast('Na demonstração o ícone não é salvo', { description: 'No seu CRM, ele é gerado do logo e aparece na tela inicial do celular.' });
    return true;
  }, []);

  const crm: Painel = {
    carregando: false,
    iconeApp: null,
    gerarIconeApp,
    appInstalavel: false,
    userId,
    userEmail: EQUIPE.find((m) => m.id === userId)?.email ?? null,
    papel,
    empresa,
    imagens,
    etapas,
    leads,
    equipe,
    tarefas,
    modelos,
    metas,
    movimentos,
    nomeUsuario: equipe.find((m) => m.id === userId)?.nome || nomeDe(userId) || 'Você',
    recarregar: async () => {},
    sair,
    criarLead, moverLead, fecharLead, reabrirLead, salvarProbabilidadeLead, registrarWhatsApp, importarLeads, agendar,
    carregarFicha, adicionarAnotacao, apagarAnotacao, criarTarefa, alternarTarefa, apagarTarefa, reagendarTarefas,
    salvarEtapa, salvarModelo, apagarModelo, salvarMeta,
    registrarAcesso, salvarPrivacidadeLead, exportarDadosLead, anonimizarLead, carregarAcessos,
    salvarMarca, enviarMarca, removerMarca, adicionarEtapa, removerEtapa, convidar, mudarPapel, removerMembro, salvarNome,
  };

  return { crm, papel, setPapel };
}
