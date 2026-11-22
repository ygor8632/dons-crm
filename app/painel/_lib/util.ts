import type { Lead, Tarefa } from './tipos';

export function abrirWhatsApp(telefone?: string | null) {
  if (!telefone) return;
  const num = telefone.replace(/\D/g, '');
  window.open(`https://wa.me/${num.length <= 11 ? `55${num}` : num}`, '_blank', 'noopener');
}

const inicioMes = (d: Date, delta = 0) => new Date(d.getFullYear(), d.getMonth() + delta, 1);

/** Variação % entre o mês atual e o anterior (null quando não há base). */
export function variacaoMensal<T>(itens: T[], data: (i: T) => string, valor: (i: T) => number = () => 1) {
  const hoje = new Date();
  const ini = inicioMes(hoje), iniAnt = inicioMes(hoje, -1);
  let atual = 0, anterior = 0;
  for (const i of itens) {
    const d = new Date(data(i));
    if (d >= ini) atual += valor(i);
    else if (d >= iniAnt) anterior += valor(i);
  }
  return { atual, anterior, delta: anterior > 0 ? ((atual - anterior) / anterior) * 100 : null };
}

/** Leads criados por mês nos últimos N meses. */
export function leadsPorMes(leads: Lead[], meses = 6) {
  const hoje = new Date();
  return Array.from({ length: meses }, (_, k) => {
    const ini = inicioMes(hoje, k - meses + 1);
    const fim = inicioMes(hoje, k - meses + 2);
    const n = leads.filter((l) => { const d = new Date(l.created_at); return d >= ini && d < fim; }).length;
    return { mes: ini.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), quantidade: n, atual: k === meses - 1 };
  });
}

export type GrupoTarefa = 'atrasada' | 'hoje' | 'proxima' | 'concluida';

export function grupoTarefa(t: Tarefa, agora = new Date()): GrupoTarefa {
  if (t.concluida) return 'concluida';
  const d = new Date(t.data_vencimento);
  if (d < agora) return 'atrasada';
  const fimHoje = new Date(agora); fimHoje.setHours(23, 59, 59, 999);
  return d <= fimHoje ? 'hoje' : 'proxima';
}

export const formatarDataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace('.', '');

export function tempoRelativo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  if (Math.abs(diff) < 3600) return rtf.format(-Math.round(diff / 60), 'minute');
  if (Math.abs(diff) < 86400) return rtf.format(-Math.round(diff / 3600), 'hour');
  return rtf.format(-Math.round(diff / 86400), 'day');
}

/** Lê um CSV de leads (separador , ou ;). Linhas sem "nome" são ignoradas. */
export function lerLeadsCSV(texto: string) {
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (linhas.length < 2) throw new Error('O arquivo não tem linhas de dados.');
  const sep = linhas[0].includes(';') ? ';' : ',';
  const cab = linhas[0].split(sep).map((h) => h.trim().toLowerCase().replace(/"/g, ''));
  const linhasLidas: { nome: string; email: string | null; telefone: string | null; origem: string; valor: number }[] = [];
  for (let i = 1; i < linhas.length; i++) {
    const vals = linhas[i].split(sep).map((v) => v.trim().replace(/"/g, ''));
    const o: Record<string, string> = {};
    cab.forEach((h, idx) => { o[h] = vals[idx] || ''; });
    if (!o.nome) continue;
    linhasLidas.push({ nome: o.nome, email: o.email || null, telefone: o.telefone || null, origem: o.origem || 'Importação CSV', valor: parseFloat(o.valor) || 0 });
  }
  if (linhasLidas.length === 0) throw new Error('Nenhuma linha com a coluna "nome" preenchida.');
  return linhasLidas;
}
