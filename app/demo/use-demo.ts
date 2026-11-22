'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { prepararImagem, type TipoImagem } from '@/lib/marca-storage';
import type { Painel } from '../painel/_lib/use-painel';
import type { Anotacao, Empresa, Etapa, Lead, Membro, Papel, Tarefa } from '../painel/_lib/tipos';
import { lerLeadsCSV } from '../painel/_lib/util';

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
  { id: 'e1', empresa_id: EMPRESA_ID, nome: 'Aguardando contato', cor: '#c99a06', ordem: 1 },
  { id: 'e2', empresa_id: EMPRESA_ID, nome: 'Em atendimento', cor: '#5d73e0', ordem: 2 },
  { id: 'e3', empresa_id: EMPRESA_ID, nome: 'Proposta enviada', cor: '#da4c3c', ordem: 3 },
  { id: 'e4', empresa_id: EMPRESA_ID, nome: 'Venda concluída', cor: '#1f8f4e', ordem: 4 },
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
  }));
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
  const [todosLeads, setLeads] = useState<Lead[]>(leadsIniciais);
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
  const tarefas = useMemo(
    () => todasTarefas.filter((t) => leads.some((l) => l.id === t.lead_id)),
    [todasTarefas, leads],
  );

  const sair = useCallback(async () => { router.push('/'); }, [router]);

  const criarLead = useCallback(async (d: { nome: string; email: string; telefone: string; origem: string; vendedor_id: string; valor: string }) => {
    await espera();
    const resp = papel === 'vendedor' ? userId : d.vendedor_id || null;
    setLeads((prev) => [{
      id: novoId('l'), empresa_id: EMPRESA_ID, nome: d.nome, email: d.email || null, telefone: d.telefone || null,
      origem: d.origem, etapa_id: etapas[0]?.id, valor: parseFloat(d.valor) || 0, vendedor_id: resp,
      vendedor: resp ? { nome: nomeDe(resp) } : null, created_at: new Date().toISOString(),
    }, ...prev]);
    toast.success(`${d.nome} entrou no funil`);
    return true;
  }, [papel, userId, etapas]);

  const moverLeadSemAviso = useCallback(async (id: string, etapaId: string) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, etapa_id: etapaId } : l)));
  }, []);

  const moverLead = useCallback(async (id: string, etapaId: string) => {
    const anterior = todosLeads.find((l) => l.id === id);
    if (!anterior || anterior.etapa_id === etapaId) return;
    void moverLeadSemAviso(id, etapaId);
    toast(`${anterior.nome} → ${etapas.find((e) => e.id === etapaId)?.nome}`, {
      action: { label: 'Desfazer', onClick: () => void moverLeadSemAviso(id, anterior.etapa_id ?? '') },
    });
  }, [todosLeads, etapas, moverLeadSemAviso]);

  const importarCSV = useCallback(async (arquivo: File) => {
    try {
      const novos = lerLeadsCSV(await arquivo.text());
      setLeads((prev) => [
        ...novos.map((l) => ({ ...l, id: novoId('l'), empresa_id: EMPRESA_ID, etapa_id: etapas[0]?.id, vendedor_id: papel === 'vendedor' ? userId : null, created_at: new Date().toISOString() })),
        ...prev,
      ]);
      toast.success(`${novos.length} ${novos.length === 1 ? 'lead importado' : 'leads importados'}`, { description: 'Na demonstração, ficam só até recarregar a página.' });
      return true;
    } catch (e) {
      toast.error('Não foi possível importar', { description: e instanceof Error ? e.message : undefined });
      return false;
    }
  }, [etapas, papel, userId]);

  const carregarFicha = useCallback(async (leadId: string) => ({
    anotacoes: anotacoes.current[leadId] ?? [],
    tarefas: tarefasRef.current.filter((t) => t.lead_id === leadId).sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento)),
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
    setTarefas((prev) => prev.map((t) => (t.id === id ? { ...t, concluida: !concluida } : t)));
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

  const adicionarEtapa = useCallback(async (nome: string, cor: string) => {
    setEtapas((prev) => [...prev, { id: novoId('e'), empresa_id: EMPRESA_ID, nome, cor, ordem: prev.length + 1 }]);
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

  const removerMembro = useCallback(async (m: Membro) => {
    if (m.id === userId) { toast.error('Você não pode remover o seu próprio acesso.'); return; }
    setEquipe((prev) => prev.filter((x) => x.id !== m.id));
    toast.success(`Acesso de ${m.email} revogado`);
  }, [userId]);

  const crm: Painel = {
    carregando: false,
    userId,
    userEmail: EQUIPE.find((m) => m.id === userId)?.email ?? null,
    papel,
    empresa,
    imagens,
    etapas,
    leads,
    equipe,
    tarefas,
    nomeUsuario: nomeDe(userId) ?? 'Você',
    recarregar: async () => {},
    sair,
    criarLead, moverLead, importarCSV,
    carregarFicha, adicionarAnotacao, apagarAnotacao, criarTarefa, alternarTarefa, apagarTarefa,
    salvarMarca, enviarMarca, removerMarca, adicionarEtapa, removerEtapa, convidar, mudarPapel, removerMembro,
  };

  return { crm, papel, setPapel };
}
