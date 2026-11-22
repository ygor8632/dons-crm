import type { Etapa, Lead, LinhaImportacao, ModeloMensagem, Tarefa } from './tipos';

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

/* ---------------- Sinais do funil ---------------- */

const DIA = 864e5;

/** Etapa final do funil (a de maior ordem) = venda. */
export const etapaFinal = (etapas: Etapa[]) => etapas.reduce<Etapa | undefined>((m, e) => (!m || e.ordem > m.ordem ? e : m), undefined);

/** Ganho: marcado como ganho, ou ainda aberto na última etapa (leads anteriores à situação). */
export function estaGanho(lead: Lead, etapas: Etapa[]) {
  return lead.situacao === 'ganho' || ((lead.situacao ?? 'aberto') === 'aberto' && lead.etapa_id === etapaFinal(etapas)?.id);
}
/** Em negociação: aberto e fora da última etapa. */
export const emAberto = (lead: Lead, etapas: Etapa[]) => (lead.situacao ?? 'aberto') === 'aberto' && !estaGanho(lead, etapas);

/** Chance de fechar: a do negócio, senão a da etapa. */
export function probabilidadeDe(lead: Lead, etapas: Etapa[]) {
  if (lead.probabilidade != null) return lead.probabilidade;
  return etapas.find((e) => e.id === lead.etapa_id)?.probabilidade ?? 0;
}
export const valorPonderado = (lead: Lead, etapas: Etapa[]) => ((lead.valor || 0) * probabilidadeDe(lead, etapas)) / 100;

/** Próximo follow-up pendente do lead. */
export function proximaTarefa(lead: Lead, tarefas: Tarefa[]) {
  return tarefas
    .filter((t) => t.lead_id === lead.id && !t.concluida)
    .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))[0];
}

/** Dias desde a última atividade, se passou do prazo da etapa ("parado"). */
export function diasParado(lead: Lead, etapas: Etapa[], agora = Date.now()) {
  if (!emAberto(lead, etapas)) return null;
  const prazo = etapas.find((e) => e.id === lead.etapa_id)?.dias_parado;
  if (!prazo) return null;
  const ref = lead.ultima_atividade_em || lead.etapa_desde || lead.created_at;
  const dias = Math.floor((agora - new Date(ref).getTime()) / DIA);
  return dias >= prazo ? dias : null;
}

/** Em negociação e sem nenhum follow-up pendente. */
export const semProximoPasso = (lead: Lead, etapas: Etapa[], tarefas: Tarefa[]) => emAberto(lead, etapas) && !proximaTarefa(lead, tarefas);

/** Ordem do Kanban: atrasados, hoje, sem próximo passo, futuros (por data). */
export function ordenarPorProximaAtividade(leads: Lead[], tarefas: Tarefa[], agora = new Date()) {
  const fimHoje = new Date(agora); fimHoje.setHours(23, 59, 59, 999);
  const peso = (l: Lead) => {
    const t = proximaTarefa(l, tarefas);
    if (!t) return [2, 0] as const;
    const d = new Date(t.data_vencimento);
    if (d < agora) return [0, d.getTime()] as const;
    if (d <= fimHoje) return [1, d.getTime()] as const;
    return [3, d.getTime()] as const;
  };
  return [...leads].sort((a, b) => { const [pa, da] = peso(a); const [pb, db] = peso(b); return pa - pb || da - db; });
}

/* ---------------- Duplicados ---------------- */

/** Mesma regra da coluna chave_telefone do banco: DDD + 8 últimos dígitos, sem 55 e sem o nono dígito. */
export function chaveTelefone(tel?: string | null) {
  let v = (tel || '').replace(/\D/g, '');
  if (v.length >= 12 && v.startsWith('55')) v = v.slice(2);
  if (v.length >= 10) return v.slice(0, 2) + v.slice(-8);
  if (v.length >= 8) return v.slice(-8);
  return null;
}
const soDigitos = (s?: string | null) => (s || '').replace(/\D/g, '');

/** Leads já cadastrados que batem por WhatsApp, e-mail ou CPF/CNPJ. */
export function acharDuplicados(leads: Lead[], dados: { telefone?: string | null; email?: string | null; documento?: string | null }, ignorarId?: string) {
  const chave = chaveTelefone(dados.telefone);
  const email = (dados.email || '').trim().toLowerCase();
  const doc = soDigitos(dados.documento);
  return leads.filter((l) => l.id !== ignorarId && (
    (chave && (l.chave_telefone ?? chaveTelefone(l.telefone)) === chave) ||
    (email && (l.email || '').trim().toLowerCase() === email) ||
    (doc.length >= 11 && soDigitos(l.documento) === doc)
  ));
}

/* ---------------- WhatsApp ---------------- */

/** Preenche {nome}, {primeiro_nome}, {empresa} e {vendedor} no texto do modelo. */
export function preencherModelo(texto: string, vars: { nome: string; empresa?: string | null; vendedor?: string | null }) {
  return texto
    .replace(/\{primeiro_nome\}/g, vars.nome.trim().split(/\s+/)[0] || '')
    .replace(/\{nome\}/g, vars.nome)
    .replace(/\{empresa\}/g, vars.empresa || '')
    .replace(/\{vendedor\}/g, vars.vendedor || '');
}

/** Modelos da etapa do lead primeiro, depois os gerais. */
export function modelosParaLead(modelos: ModeloMensagem[], lead: Lead) {
  const daEtapa = modelos.filter((m) => m.etapa_id && m.etapa_id === lead.etapa_id);
  const gerais = modelos.filter((m) => !m.etapa_id);
  return [...daEtapa, ...gerais];
}

export function linkWhatsApp(telefone: string, texto?: string) {
  const num = telefone.replace(/\D/g, '');
  const destino = num.length <= 11 ? `55${num}` : num;
  return `https://wa.me/${destino}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
}

/* ---------------- Importação ---------------- */

export type CampoImportacao = 'nome' | 'email' | 'telefone' | 'origem' | 'valor' | 'documento' | 'ignorar';
export const CAMPOS_IMPORTACAO: { id: CampoImportacao; rotulo: string }[] = [
  { id: 'nome', rotulo: 'Nome' }, { id: 'telefone', rotulo: 'WhatsApp / telefone' }, { id: 'email', rotulo: 'E-mail' },
  { id: 'origem', rotulo: 'Origem' }, { id: 'valor', rotulo: 'Valor' }, { id: 'documento', rotulo: 'CPF / CNPJ' }, { id: 'ignorar', rotulo: 'Não importar' },
];

const SINONIMOS: Record<Exclude<CampoImportacao, 'ignorar'>, string[]> = {
  nome: ['nome', 'name', 'cliente', 'contato', 'empresa', 'razao social', 'lead'],
  telefone: ['telefone', 'whatsapp', 'celular', 'fone', 'phone', 'tel', 'zap', 'contato telefonico'],
  email: ['email', 'e-mail', 'mail'],
  origem: ['origem', 'fonte', 'source', 'canal', 'campanha'],
  valor: ['valor', 'value', 'preco', 'ticket', 'orcamento'],
  documento: ['cnpj', 'cpf', 'documento', 'cpf/cnpj', 'cnpj/cpf'],
};
const normalizarCab = (h: string) => h.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/["']/g, '').trim();

/** Lê o CSV (separador , ou ;, aspas respeitadas) e sugere o campo de cada coluna. */
export function lerPlanilha(texto: string) {
  const linhasBrutas = texto.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  if (linhasBrutas.length < 2) throw new Error('O arquivo precisa ter um cabeçalho e ao menos uma linha.');
  const sep = (linhasBrutas[0].match(/;/g)?.length ?? 0) > (linhasBrutas[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const dividir = (linha: string) => {
    const out: string[] = []; let atual = ''; let aspas = false;
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i];
      if (c === '"') { if (aspas && linha[i + 1] === '"') { atual += '"'; i++; } else aspas = !aspas; }
      else if (c === sep && !aspas) { out.push(atual.trim()); atual = ''; }
      else atual += c;
    }
    out.push(atual.trim());
    return out;
  };
  const cabecalho = dividir(linhasBrutas[0]);
  const usados = new Set<CampoImportacao>();
  const mapa: CampoImportacao[] = cabecalho.map((h) => {
    const n = normalizarCab(h);
    const campo = (Object.entries(SINONIMOS) as [CampoImportacao, string[]][]).find(([c, l]) => !usados.has(c) && l.some((s) => n === s || n.includes(s)))?.[0];
    if (campo) { usados.add(campo); return campo; }
    return 'ignorar';
  });
  return { cabecalho, mapa, linhas: linhasBrutas.slice(1).map(dividir) };
}

/** Aplica o mapeamento: devolve as linhas válidas e quantas ficaram sem nome. */
export function montarLinhas(linhas: string[][], mapa: CampoImportacao[]) {
  const validas: LinhaImportacao[] = []; let semNome = 0;
  for (const valores of linhas) {
    const o: Partial<Record<CampoImportacao, string>> = {};
    mapa.forEach((c, i) => { if (c !== 'ignorar' && valores[i]) o[c] = valores[i]; });
    if (!o.nome) { semNome++; continue; }
    const valorTexto = (o.valor || '').replace(/[^\d,.-]/g, '');
    const valor = valorTexto.includes(',') ? parseFloat(valorTexto.replace(/\./g, '').replace(',', '.')) : parseFloat(valorTexto);
    validas.push({ nome: o.nome, email: o.email || null, telefone: o.telefone || null, origem: o.origem || 'Importação CSV', valor: Number.isFinite(valor) ? valor : 0, documento: o.documento || null });
  }
  return { validas, semNome };
}
