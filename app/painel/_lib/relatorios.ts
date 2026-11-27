import type { Etapa, Lead, Membro, Meta, Movimento } from './tipos';
import { estaGanho } from './util';

const DIA = 864e5;

/* ---------------- Períodos ---------------- */

export type Periodo = 'mes' | 'mes_anterior' | '90d' | 'ano';
export const PERIODOS: { id: Periodo; label: string }[] = [
  { id: 'mes', label: 'Este mês' },
  { id: 'mes_anterior', label: 'Mês passado' },
  { id: '90d', label: '90 dias' },
  { id: 'ano', label: 'Este ano' },
];

export type Intervalo = { inicio: Date; fim: Date; anterior: { inicio: Date; fim: Date }; rotulo: string; comparacao: string };

const inicioDoMes = (ano: number, mes: number) => new Date(ano, mes, 1);
export const nomeMes = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

/** Intervalo de um mês (delta 0 = mês atual, -1 = anterior...). */
export function intervaloDoMes(delta: number, agora = new Date()): Intervalo {
  const inicio = inicioDoMes(agora.getFullYear(), agora.getMonth() + delta);
  const fim = inicioDoMes(inicio.getFullYear(), inicio.getMonth() + 1);
  const antIni = inicioDoMes(inicio.getFullYear(), inicio.getMonth() - 1);
  return { inicio, fim, anterior: { inicio: antIni, fim: inicio }, rotulo: nomeMes(inicio), comparacao: `vs. ${antIni.toLocaleDateString('pt-BR', { month: 'long' })}` };
}

export function intervaloDe(p: Periodo, agora = new Date()): Intervalo {
  if (p === 'mes') return intervaloDoMes(0, agora);
  if (p === 'mes_anterior') return intervaloDoMes(-1, agora);
  if (p === '90d') {
    const fim = new Date(agora.getTime() + 1);
    const inicio = new Date(agora.getTime() - 90 * DIA);
    return { inicio, fim, anterior: { inicio: new Date(inicio.getTime() - 90 * DIA), fim: inicio }, rotulo: 'últimos 90 dias', comparacao: 'vs. 90 dias anteriores' };
  }
  const inicio = new Date(agora.getFullYear(), 0, 1);
  const fim = new Date(agora.getFullYear() + 1, 0, 1);
  // Ano anterior até a mesma data, para comparar períodos do mesmo tamanho
  const antFim = new Date(agora); antFim.setFullYear(agora.getFullYear() - 1);
  return { inicio, fim, anterior: { inicio: new Date(agora.getFullYear() - 1, 0, 1), fim: antFim }, rotulo: String(agora.getFullYear()), comparacao: `vs. ${agora.getFullYear() - 1} até hoje` };
}

/** Primeiro dia do mês em AAAA-MM-01 (chave das metas). */
export const chaveMes = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;

const dentro = (iso: string | null | undefined, a: Date, b: Date) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= a.getTime() && t < b.getTime();
};

/* ---------------- Fechamentos ---------------- */

/** Quando o negócio foi fechado (ganho ou perdido). Ganhos antigos sem data usam a entrada na etapa final. */
export function dataFechamento(l: Lead, etapas: Etapa[]) {
  if (l.fechado_em) return l.fechado_em;
  if (l.situacao !== 'perdido' && estaGanho(l, etapas)) return l.etapa_desde || l.created_at;
  return null;
}
export const ehGanho = (l: Lead, etapas: Etapa[]) => l.situacao !== 'perdido' && estaGanho(l, etapas);
export const ehPerdido = (l: Lead) => l.situacao === 'perdido';

export function ganhosNoIntervalo(leads: Lead[], etapas: Etapa[], a: Date, b: Date) {
  return leads.filter((l) => ehGanho(l, etapas) && dentro(dataFechamento(l, etapas), a, b));
}

/* ---------------- Desempenho ---------------- */

export type Numeros = {
  novos: number;
  ganhos: number;
  perdidos: number;
  vendido: number;
  taxaGanho: number | null;
  cicloDias: number | null;
  ticket: number | null;
};

function numeros(leads: Lead[], etapas: Etapa[], a: Date, b: Date): Numeros {
  const ganhos = ganhosNoIntervalo(leads, etapas, a, b);
  const perdidos = leads.filter((l) => ehPerdido(l) && dentro(l.fechado_em, a, b));
  const vendido = ganhos.reduce((s, l) => s + (l.valor || 0), 0);
  const ciclos = ganhos.map((l) => (new Date(dataFechamento(l, etapas)!).getTime() - new Date(l.created_at).getTime()) / DIA).filter((d) => d >= 0);
  const decididos = ganhos.length + perdidos.length;
  return {
    novos: leads.filter((l) => dentro(l.created_at, a, b)).length,
    ganhos: ganhos.length,
    perdidos: perdidos.length,
    vendido,
    taxaGanho: decididos ? (ganhos.length / decididos) * 100 : null,
    cicloDias: ciclos.length ? ciclos.reduce((s, d) => s + d, 0) / ciclos.length : null,
    ticket: ganhos.length ? vendido / ganhos.length : null,
  };
}

/** Variação percentual; null quando não dá para comparar. */
export const variacao = (atual: number | null, antes: number | null) =>
  atual == null || antes == null || antes === 0 ? null : Math.round(((atual - antes) / antes) * 100);

export type Desempenho = {
  atual: Numeros;
  anterior: Numeros;
  funil: { etapa: Etapa; alcancaram: number; pctTotal: number; pctAnterior: number | null }[];
  tempoPorEtapa: { etapa: Etapa; dias: number | null; n: number }[];
  motivos: { motivo: string; n: number; valor: number }[];
  origens: { origem: string; leads: number; ganhos: number; conversao: number; vendido: number }[];
  /** Mesmo cálculo por campanha (só leads que vieram de campanha). */
  campanhas: { campanha: string; leads: number; ganhos: number; conversao: number; vendido: number }[];
  vendedores: { id: string | null; nome: string; leads: number; ganhos: number; perdidos: number; vendido: number; taxa: number | null }[];
};

/**
 * Tudo que o painel do gestor mostra para um intervalo.
 * - Funil: dos leads que entraram no período, quantos chegaram a cada etapa (maior etapa já alcançada).
 * - Tempo por etapa: permanências que terminaram no período (entrada → próxima mudança).
 */
export function calcularDesempenho(
  { leads, etapas, movimentos, equipe }: { leads: Lead[]; etapas: Etapa[]; movimentos: Movimento[]; equipe: Membro[] },
  intervalo: Intervalo,
): Desempenho {
  const { inicio: a, fim: b } = intervalo;
  const ordenadas = [...etapas].sort((x, y) => x.ordem - y.ordem);
  const ordemDe = new Map(ordenadas.map((e) => [e.id, e.ordem]));
  const idsLeads = new Set(leads.map((l) => l.id));
  const movs = movimentos.filter((m) => idsLeads.has(m.lead_id));

  // Maior etapa já alcançada por lead
  const maxOrdem = new Map<string, number>();
  for (const l of leads) maxOrdem.set(l.id, ordemDe.get(l.etapa_id ?? '') ?? 0);
  for (const m of movs) {
    const o = ordemDe.get(m.para_etapa_id ?? '') ?? 0;
    if (o > (maxOrdem.get(m.lead_id) ?? 0)) maxOrdem.set(m.lead_id, o);
  }
  const coorte = leads.filter((l) => dentro(l.created_at, a, b));
  const funil = ordenadas.map((etapa) => {
    const alcancaram = coorte.filter((l) => (maxOrdem.get(l.id) ?? 0) >= etapa.ordem).length;
    return { etapa, alcancaram, pctTotal: coorte.length ? (alcancaram / coorte.length) * 100 : 0, pctAnterior: null as number | null };
  });
  funil.forEach((f, i) => { if (i > 0) f.pctAnterior = funil[i - 1].alcancaram ? (f.alcancaram / funil[i - 1].alcancaram) * 100 : null; });

  // Tempo por etapa
  const porLead = new Map<string, Movimento[]>();
  for (const m of movs) porLead.set(m.lead_id, [...(porLead.get(m.lead_id) ?? []), m]);
  const somas = new Map<string, { total: number; n: number }>();
  for (const lista of porLead.values()) {
    lista.sort((x, y) => x.created_at.localeCompare(y.created_at));
    for (let i = 0; i < lista.length - 1; i++) {
      const etapaId = lista[i].para_etapa_id;
      const saida = lista[i + 1].created_at;
      if (!etapaId || !dentro(saida, a, b)) continue;
      const d = (new Date(saida).getTime() - new Date(lista[i].created_at).getTime()) / DIA;
      if (d < 0) continue;
      const s = somas.get(etapaId) ?? { total: 0, n: 0 };
      somas.set(etapaId, { total: s.total + d, n: s.n + 1 });
    }
  }
  const tempoPorEtapa = ordenadas.slice(0, -1).map((etapa) => {
    const s = somas.get(etapa.id);
    return { etapa, dias: s ? s.total / s.n : null, n: s?.n ?? 0 };
  });

  // Motivos de perda
  const perdidosPeriodo = leads.filter((l) => ehPerdido(l) && dentro(l.fechado_em, a, b));
  const mot = new Map<string, { n: number; valor: number }>();
  for (const l of perdidosPeriodo) {
    const k = l.motivo_perda || 'Sem motivo';
    const v = mot.get(k) ?? { n: 0, valor: 0 };
    mot.set(k, { n: v.n + 1, valor: v.valor + (l.valor || 0) });
  }
  const motivos = [...mot.entries()].map(([motivo, v]) => ({ motivo, ...v })).sort((x, y) => y.n - x.n);

  // Origens: leads que entraram no período e quantos deles já viraram venda
  const ori = new Map<string, { leads: number; ganhos: number; vendido: number }>();
  for (const l of coorte) {
    const k = l.origem || 'Não informada';
    const v = ori.get(k) ?? { leads: 0, ganhos: 0, vendido: 0 };
    const g = ehGanho(l, etapas);
    ori.set(k, { leads: v.leads + 1, ganhos: v.ganhos + (g ? 1 : 0), vendido: v.vendido + (g ? l.valor || 0 : 0) });
  }
  const origens = [...ori.entries()].map(([origem, v]) => ({ origem, ...v, conversao: v.leads ? (v.ganhos / v.leads) * 100 : 0 })).sort((x, y) => y.leads - x.leads);

  // Campanhas (anúncios da Meta, Click-to-WhatsApp, utm do site)
  const camp = new Map<string, { leads: number; ganhos: number; vendido: number }>();
  for (const l of coorte) {
    if (!l.campanha) continue;
    const v = camp.get(l.campanha) ?? { leads: 0, ganhos: 0, vendido: 0 };
    const g = ehGanho(l, etapas);
    camp.set(l.campanha, { leads: v.leads + 1, ganhos: v.ganhos + (g ? 1 : 0), vendido: v.vendido + (g ? l.valor || 0 : 0) });
  }
  const campanhas = [...camp.entries()].map(([campanha, v]) => ({ campanha, ...v, conversao: v.leads ? (v.ganhos / v.leads) * 100 : 0 })).sort((x, y) => y.vendido - x.vendido || y.leads - x.leads);

  // Por vendedor
  const ids = [...new Set([...equipe.map((m) => m.id as string | null), ...leads.map((l) => l.vendedor_id ?? null)])];
  const vendedores = ids.map((id) => {
    const deles = leads.filter((l) => (l.vendedor_id ?? null) === id);
    const n = numeros(deles, etapas, a, b);
    const membro = equipe.find((m) => m.id === id);
    return { id, nome: id ? membro?.nome || membro?.email || 'Ex-membro' : 'Sem responsável', leads: n.novos, ganhos: n.ganhos, perdidos: n.perdidos, vendido: n.vendido, taxa: n.taxaGanho };
  }).filter((v) => v.id !== null || v.leads + v.ganhos + v.perdidos > 0).sort((x, y) => y.vendido - x.vendido || y.ganhos - x.ganhos);

  return {
    atual: numeros(leads, etapas, a, b),
    anterior: numeros(leads, etapas, intervalo.anterior.inicio, intervalo.anterior.fim),
    funil,
    tempoPorEtapa,
    motivos,
    origens,
    campanhas,
    vendedores,
  };
}

/* ---------------- Metas ---------------- */

export function metaDe(metas: Meta[], usuarioId: string | null, mes: string) {
  return metas.find((m) => m.mes === mes && m.usuario_id === usuarioId) ?? null;
}

/** Progresso da meta do mês: vendido e negócios ganhos (de um vendedor ou da empresa toda). */
export function progressoMeta(leads: Lead[], etapas: Etapa[], metas: Meta[], usuarioId: string | null, mesInicio: Date) {
  const fim = new Date(mesInicio.getFullYear(), mesInicio.getMonth() + 1, 1);
  const ganhos = ganhosNoIntervalo(leads, etapas, mesInicio, fim).filter((l) => usuarioId === null || l.vendedor_id === usuarioId);
  const vendido = ganhos.reduce((s, l) => s + (l.valor || 0), 0);
  const meta = metaDe(metas, usuarioId, chaveMes(mesInicio));
  const agora = new Date();
  // Quanto do mês já passou (para dizer se está no ritmo)
  const decorrido = agora < mesInicio ? 0 : agora >= fim ? 1 : (agora.getTime() - mesInicio.getTime()) / (fim.getTime() - mesInicio.getTime());
  return {
    meta,
    vendido,
    ganhos: ganhos.length,
    pctValor: meta?.valor ? (vendido / meta.valor) * 100 : null,
    pctQtd: meta?.quantidade ? (ganhos.length / meta.quantidade) * 100 : null,
    decorrido: decorrido * 100,
  };
}

/** Frases curtas sobre o que mudou entre dois períodos (para o relatório mensal). */
export function oQueMudou(d: Desempenho, compara: string) {
  const frases: string[] = [];
  const { atual: n, anterior: p } = d;
  const v = variacao(n.vendido, p.vendido);
  if (n.vendido === 0 && p.vendido === 0) frases.push('Nenhuma venda fechada neste mês nem no anterior.');
  else if (v == null) frases.push(`Vendas de ${moeda(n.vendido)} (no mês anterior não houve venda).`);
  else frases.push(`Vendas ${v >= 0 ? 'subiram' : 'caíram'} ${Math.abs(v)}% ${compara}: ${moeda(n.vendido)} contra ${moeda(p.vendido)}.`);
  const nv = variacao(n.novos, p.novos);
  if (nv != null && Math.abs(nv) >= 10) frases.push(`Entraram ${n.novos} leads, ${Math.abs(nv)}% ${nv >= 0 ? 'a mais' : 'a menos'} que no mês anterior.`);
  else frases.push(`Entraram ${n.novos} ${n.novos === 1 ? 'lead novo' : 'leads novos'}.`);
  if (n.taxaGanho != null) frases.push(`De cada 10 negócios fechados, ${Math.round(n.taxaGanho / 10)} foram ganhos.`);
  if (d.motivos[0]) frases.push(`Principal motivo de perda: ${d.motivos[0].motivo.toLowerCase()} (${d.motivos[0].n} ${d.motivos[0].n === 1 ? 'negócio' : 'negócios'}).`);
  const lenta = [...d.tempoPorEtapa].filter((t) => t.dias != null).sort((x, y) => (y.dias ?? 0) - (x.dias ?? 0))[0];
  if (lenta && (lenta.dias ?? 0) >= 1) frases.push(`A etapa mais demorada foi “${lenta.etapa.nome}”: ${Math.round(lenta.dias!)} dias em média.`);
  const melhorOrigem = [...d.origens].filter((o) => o.ganhos > 0).sort((x, y) => y.vendido - x.vendido)[0];
  if (melhorOrigem) frases.push(`A origem que mais vendeu foi ${melhorOrigem.origem} (${moeda(melhorOrigem.vendido)}).`);
  return frases;
}

const moeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
