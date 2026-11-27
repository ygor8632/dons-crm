'use client';

import { fundoDoLogo } from '@/lib/marca-logo';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { CalendarRange, ChevronLeft, ChevronRight, CircleDollarSign, Copy, Hourglass, Inbox, Percent, Plus, Printer, Send, Target, Trophy, X } from 'lucide-react';
import { CardTitle, EmptyState, GlassCard, PageHeader, Segmented, StatCard, Toggle } from '@/components/glass';
import { Button } from '@/components/ui/button';
import { COR_PADRAO, corSolida, formatarMoeda, formatarMoedaCurta } from '@/lib/marca';
import { cn } from '@/lib/utils';
import type { Painel } from '../_lib/use-painel';
import type { EnvioRelatorio, Lead } from '../_lib/tipos';
import {
  calcularDesempenho, chaveMes, intervaloDe, intervaloDoMes, metaDe, nomeMes, oQueMudou, PERIODOS, progressoMeta, variacao,
  type Desempenho, type Periodo,
} from '../_lib/relatorios';

const SELECT = 'h-10 appearance-none rounded-full border border-glass-border bg-pill-active/55 px-4 text-[13px] dark:bg-white/6';
const pct = (v: number | null | undefined, casas = 0) => (v == null ? '—' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: casas })}%`);
const diasTxt = (d: number | null) => (d == null ? '—' : d < 1 ? 'menos de 1 dia' : `${Math.round(d)} ${Math.round(d) === 1 ? 'dia' : 'dias'}`);

export function Relatorios({ crm, visao }: { crm: Painel; visao: string }) {
  if (visao === 'metas') return <Metas crm={crm} />;
  if (visao === 'mensal') return <RelatorioMensal crm={crm} />;
  return <PainelDesempenho crm={crm} />;
}

/** Leads considerados: admin vê a empresa (ou um vendedor); vendedor vê só os seus. */
function useLeadsDoFiltro(crm: Painel, vendedor: string) {
  return useMemo(() => {
    if (crm.papel !== 'admin') return crm.leads.filter((l) => l.vendedor_id === crm.userId);
    if (vendedor === 'todos') return crm.leads;
    if (vendedor === 'sem') return crm.leads.filter((l) => !l.vendedor_id);
    return crm.leads.filter((l) => l.vendedor_id === vendedor);
  }, [crm.leads, crm.papel, crm.userId, vendedor]);
}

/* ---------------- Barras ---------------- */

function Barra({ rotulo, valor, pctLargura, cor, detalhe }: { rotulo: string; valor: string; pctLargura: number; cor?: string; detalhe?: string }) {
  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="min-w-0 truncate font-medium">{rotulo}</span>
        <span className="tabular shrink-0 text-muted-foreground">
          <span className="font-semibold text-foreground">{valor}</span>{detalhe && <> · {detalhe}</>}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-foreground/8" aria-hidden>
        <div className="h-full rounded-full" style={{ width: `${Math.max(Math.min(pctLargura, 100), pctLargura > 0 ? 2 : 0)}%`, backgroundColor: cor || 'var(--brand)' }} />
      </div>
    </li>
  );
}

function Progresso({ atual, alvo, ritmo, rotulo }: { atual: number; alvo: number; ritmo?: number; rotulo: string }) {
  const p = alvo > 0 ? (atual / alvo) * 100 : 0;
  return (
    <div className="relative h-3 overflow-visible rounded-full bg-foreground/8" role="progressbar" aria-label={rotulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(p, 100))}>
      <div className={cn('h-full rounded-full', p >= 100 ? 'bg-positive-foreground' : 'bg-brand')} style={{ width: `${Math.min(p, 100)}%` }} />
      {ritmo != null && ritmo > 0 && ritmo < 100 && (
        <span className="absolute -top-1 h-5 w-0.5 rounded-full bg-foreground/50" style={{ left: `${ritmo}%` }} title="Onde deveria estar hoje para bater a meta" aria-hidden />
      )}
    </div>
  );
}

/* ---------------- Desempenho (painel do gestor) ---------------- */

function PainelDesempenho({ crm }: { crm: Painel }) {
  const admin = crm.papel === 'admin';
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [vendedor, setVendedor] = useState('todos');
  const leads = useLeadsDoFiltro(crm, vendedor);
  const intervalo = useMemo(() => intervaloDe(periodo), [periodo]);
  const d = useMemo(() => calcularDesempenho({ leads, etapas: crm.etapas, movimentos: crm.movimentos, equipe: crm.equipe }, intervalo), [leads, crm.etapas, crm.movimentos, crm.equipe, intervalo]);
  const { atual: n, anterior: p } = d;
  const metaUsuario = admin ? (vendedor === 'todos' ? null : vendedor === 'sem' ? undefined : vendedor) : crm.userId;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={admin ? 'Desempenho do time' : 'Meu desempenho'}
        subtitulo={`Vendas, conversão e tempo de cada etapa · ${intervalo.rotulo}`}
        acoes={admin && crm.equipe.length > 0 ? (
          <label className="relative">
            <span className="sr-only">Vendedor</span>
            <select value={vendedor} onChange={(e) => setVendedor(e.target.value)} className={SELECT}>
              <option value="todos">Time inteiro</option>
              {crm.equipe.map((m) => <option key={m.id} value={m.id}>{m.nome || m.email}</option>)}
              <option value="sem">Sem responsável</option>
            </select>
          </label>
        ) : undefined}
      />
      <Segmented rotulo="Período" valor={periodo} aoMudar={setPeriodo} opcoes={PERIODOS} />

      {crm.leads.length === 0 ? (
        <GlassCard><EmptyState icone={Inbox} titulo="Ainda sem dados" texto="Os números aparecem assim que os primeiros leads entrarem e andarem pelo funil." /></GlassCard>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 [&>*]:min-w-0">
            <StatCard destaque className="col-span-2 sm:col-span-1" rotulo="Vendido" icone={CircleDollarSign} valor={formatarMoedaCurta(n.vendido)} delta={variacao(n.vendido, p.vendido)} legenda={intervalo.comparacao} />
            <StatCard rotulo="Negócios ganhos" icone={Trophy} valor={n.ganhos} delta={variacao(n.ganhos, p.ganhos)} legenda={n.ticket != null ? `ticket médio ${formatarMoedaCurta(n.ticket)}` : `${n.perdidos} perdidos`} />
            <StatCard rotulo="Taxa de ganho" icone={Percent} valor={pct(n.taxaGanho)} legenda={`${n.ganhos} ganhos de ${n.ganhos + n.perdidos} fechados`} />
            <StatCard rotulo="Ciclo médio" icone={Hourglass} valor={n.cicloDias == null ? '—' : `${Math.round(n.cicloDias)} d`} legenda="do cadastro até a venda" />
          </div>

          {periodo === 'mes' || periodo === 'mes_anterior' ? (
            metaUsuario !== undefined && <CartaoMeta crm={crm} leads={crm.leads} usuarioId={metaUsuario} mesInicio={intervalo.inicio} />
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            <GlassCard>
              <CardTitle titulo="Conversão por etapa" descricao={`Dos ${n.novos} leads que entraram no período, quantos chegaram a cada etapa`} />
              {n.novos === 0 ? <p className="py-8 text-center text-xs text-muted-foreground">Nenhum lead entrou no período.</p> : (
                <ol className="mt-4 space-y-3">
                  {d.funil.map((f, i) => (
                    <Barra key={f.etapa.id} rotulo={f.etapa.nome} valor={String(f.alcancaram)} pctLargura={f.pctTotal} cor={f.etapa.cor} detalhe={i === 0 ? pct(f.pctTotal) : `${pct(f.pctAnterior)} da etapa anterior`} />
                  ))}
                </ol>
              )}
            </GlassCard>

            <GlassCard>
              <CardTitle titulo="Tempo médio em cada etapa" descricao="Quanto os leads ficaram na etapa antes de avançar ou sair" />
              <TempoPorEtapa d={d} />
            </GlassCard>

            <GlassCard>
              <CardTitle titulo="Motivos de perda" descricao={`${n.perdidos} ${n.perdidos === 1 ? 'negócio perdido' : 'negócios perdidos'} no período`} />
              {d.motivos.length === 0 ? <p className="py-8 text-center text-xs text-muted-foreground">Nenhum negócio perdido no período.</p> : (
                <ol className="mt-4 space-y-3">
                  {d.motivos.map((m) => <Barra key={m.motivo} rotulo={m.motivo} valor={String(m.n)} pctLargura={(m.n / d.motivos[0].n) * 100} cor="var(--destructive)" detalhe={formatarMoeda(m.valor)} />)}
                </ol>
              )}
            </GlassCard>

            <GlassCard>
              <CardTitle titulo="Origens" descricao="Leads que entraram no período e quantos já viraram venda" />
              <TabelaOrigens d={d} />
            </GlassCard>
          </div>

          {d.campanhas.length > 0 && (
            <GlassCard>
              <CardTitle titulo="Campanhas" descricao="Leads de anúncios e links com campanha: quanto cada uma trouxe e vendeu no período" />
              <div className="relative mt-3 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-[13px]">
                  <thead className="text-xs text-muted-foreground">
                    <tr><th className="py-2 pr-3 font-medium">Campanha</th><th className="px-3 py-2 text-right font-medium">Leads</th><th className="px-3 py-2 text-right font-medium">Vendas</th><th className="px-3 py-2 text-right font-medium">Conversão</th><th className="py-2 pl-3 text-right font-medium">Vendido</th></tr>
                  </thead>
                  <tbody className="tabular">
                    {d.campanhas.slice(0, 15).map((c) => (
                      <tr key={c.campanha} className="border-t border-border/60">
                        <td className="max-w-[260px] truncate py-2 pr-3 font-medium" title={c.campanha}>{c.campanha}</td>
                        <td className="px-3 py-2 text-right">{c.leads}</td>
                        <td className="px-3 py-2 text-right">{c.ganhos}</td>
                        <td className="px-3 py-2 text-right">{pct(c.conversao)}</td>
                        <td className="py-2 pl-3 text-right">{formatarMoeda(c.vendido)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}

          {admin && vendedor === 'todos' && <TabelaVendedores crm={crm} d={d} mesInicio={periodo === 'mes' || periodo === 'mes_anterior' ? intervalo.inicio : null} />}
        </>
      )}
    </div>
  );
}

function TempoPorEtapa({ d }: { d: Desempenho }) {
  const max = Math.max(...d.tempoPorEtapa.map((t) => t.dias ?? 0), 1);
  if (d.tempoPorEtapa.every((t) => t.dias == null)) {
    return <p className="py-8 text-center text-xs text-muted-foreground">Ainda sem mudanças de etapa no período. O tempo é medido a partir de quando os leads começam a andar pelo funil.</p>;
  }
  return (
    <ol className="mt-4 space-y-3">
      {d.tempoPorEtapa.map((t) => (
        <Barra key={t.etapa.id} rotulo={t.etapa.nome} valor={diasTxt(t.dias)} pctLargura={((t.dias ?? 0) / max) * 100} cor={t.etapa.cor} detalhe={t.n ? `${t.n} ${t.n === 1 ? 'lead' : 'leads'}` : 'sem dados'} />
      ))}
    </ol>
  );
}

function TabelaOrigens({ d }: { d: Desempenho }) {
  if (d.origens.length === 0) return <p className="py-8 text-center text-xs text-muted-foreground">Nenhum lead entrou no período.</p>;
  return (
    <div className="relative mt-3 overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead className="text-xs text-muted-foreground">
          <tr><th className="py-2 pr-3 font-medium">Origem</th><th className="px-3 py-2 text-right font-medium">Leads</th><th className="px-3 py-2 text-right font-medium">Vendas</th><th className="px-3 py-2 text-right font-medium">Conversão</th><th className="py-2 pl-3 text-right font-medium">Vendido</th></tr>
        </thead>
        <tbody className="tabular">
          {d.origens.map((o) => (
            <tr key={o.origem} className="border-t border-border/60">
              <td className="max-w-[160px] truncate py-2 pr-3 font-medium">{o.origem}</td>
              <td className="px-3 py-2 text-right">{o.leads}</td>
              <td className="px-3 py-2 text-right">{o.ganhos}</td>
              <td className="px-3 py-2 text-right">{pct(o.conversao)}</td>
              <td className="py-2 pl-3 text-right">{formatarMoeda(o.vendido)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelaVendedores({ crm, d, mesInicio }: { crm: Painel; d: Desempenho; mesInicio: Date | null }) {
  return (
    <GlassCard>
      <CardTitle titulo="Por vendedor" descricao={mesInicio ? 'Resultado do período e andamento da meta do mês' : 'Resultado do período'} />
      <div className="relative mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-2 pr-3 font-medium">Vendedor</th><th className="px-3 py-2 text-right font-medium">Leads novos</th>
              <th className="px-3 py-2 text-right font-medium">Ganhos</th><th className="px-3 py-2 text-right font-medium">Perdidos</th>
              <th className="px-3 py-2 text-right font-medium">Taxa de ganho</th><th className="px-3 py-2 text-right font-medium">Vendido</th>
              {mesInicio && <th className="py-2 pl-3 font-medium">Meta do mês</th>}
            </tr>
          </thead>
          <tbody className="tabular">
            {d.vendedores.map((v) => {
              const prog = mesInicio && v.id ? progressoMeta(crm.leads, crm.etapas, crm.metas, v.id, mesInicio) : null;
              return (
                <tr key={v.id ?? 'sem'} className="border-t border-border/60">
                  <td className="py-2.5 pr-3 font-medium">{v.nome}</td>
                  <td className="px-3 py-2.5 text-right">{v.leads}</td>
                  <td className="px-3 py-2.5 text-right">{v.ganhos}</td>
                  <td className="px-3 py-2.5 text-right">{v.perdidos}</td>
                  <td className="px-3 py-2.5 text-right">{pct(v.taxa)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold">{formatarMoeda(v.vendido)}</td>
                  {mesInicio && (
                    <td className="w-48 py-2.5 pl-3">
                      {prog?.meta?.valor ? (
                        <div className="space-y-1">
                          <Progresso atual={prog.vendido} alvo={prog.meta.valor} ritmo={prog.decorrido} rotulo={`Meta de ${v.nome}`} />
                          <span className="text-xs text-muted-foreground">{pct(prog.pctValor)} de {formatarMoedaCurta(prog.meta.valor)}</span>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">Sem meta</span>}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

/** Meta do mês (empresa ou vendedor), com a marca de onde deveria estar hoje. */
export function CartaoMeta({ crm, leads, usuarioId, mesInicio, compacto }: { crm: Painel; leads: Lead[]; usuarioId: string | null; mesInicio: Date; compacto?: boolean }) {
  const prog = progressoMeta(leads, crm.etapas, crm.metas, usuarioId, mesInicio);
  const atual = chaveMes(mesInicio) === chaveMes(new Date());
  const quem = usuarioId === null ? 'do time' : usuarioId === crm.userId ? 'sua' : `de ${crm.equipe.find((m) => m.id === usuarioId)?.nome ?? 'vendedor'}`;
  if (!prog.meta) {
    if (compacto) return null;
    return (
      <GlassCard className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-pill-active/80 dark:bg-white/10" aria-hidden><Target className="size-4" /></span>
          <p className="text-[13px]"><span className="font-semibold">Sem meta {quem} para {nomeMes(mesInicio)}.</span> <span className="text-muted-foreground">{crm.papel === 'admin' ? 'Defina em Relatórios › Metas.' : 'O administrador define as metas.'}</span></p>
        </div>
      </GlassCard>
    );
  }
  const faltam = prog.meta.valor ? Math.max(prog.meta.valor - prog.vendido, 0) : null;
  const noRitmo = prog.pctValor != null && prog.pctValor >= prog.decorrido;
  return (
    <GlassCard className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <CardTitle titulo={`Meta ${quem} · ${nomeMes(mesInicio)}`} />
        {prog.pctValor != null && (
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', prog.pctValor >= 100 ? 'bg-positive text-positive-foreground' : noRitmo || !atual ? 'bg-pill-active/80 dark:bg-white/10' : 'bg-amber-500/15 text-amber-800 dark:text-amber-200')}>
            {prog.pctValor >= 100 ? 'Meta batida' : !atual ? pct(prog.pctValor) : noRitmo ? 'No ritmo' : 'Abaixo do ritmo'}
          </span>
        )}
      </div>
      {prog.meta.valor != null && (
        <div className="space-y-1.5">
          <Progresso atual={prog.vendido} alvo={prog.meta.valor} ritmo={atual ? prog.decorrido : undefined} rotulo={`Meta ${quem} em valor`} />
          <p className="tabular text-[13px]">
            <span className="font-semibold">{formatarMoeda(prog.vendido)}</span> <span className="text-muted-foreground">de {formatarMoeda(prog.meta.valor)} ({pct(prog.pctValor)})</span>
            {atual && faltam != null && faltam > 0 && <span className="text-muted-foreground"> · faltam {formatarMoeda(faltam)}</span>}
          </p>
        </div>
      )}
      {prog.meta.quantidade != null && (
        <p className="tabular text-xs text-muted-foreground">{prog.ganhos} de {prog.meta.quantidade} {prog.meta.quantidade === 1 ? 'venda' : 'vendas'} ({pct(prog.pctQtd)})</p>
      )}
    </GlassCard>
  );
}

/* ---------------- Metas ---------------- */

function Metas({ crm }: { crm: Painel }) {
  const admin = crm.papel === 'admin';
  const [delta, setDelta] = useState(0);
  const mes = intervaloDoMes(delta);
  const chave = chaveMes(mes.inicio);
  const anterior = chaveMes(intervaloDoMes(delta - 1).inicio);
  const temAnterior = crm.metas.some((m) => m.mes === anterior);

  const copiarAnterior = async () => {
    for (const m of crm.metas.filter((x) => x.mes === anterior)) {
      if (!metaDe(crm.metas, m.usuario_id, chave)) await crm.salvarMeta({ usuario_id: m.usuario_id, mes: chave, valor: m.valor, quantidade: m.quantidade });
    }
  };

  const navegacao = (
    <div className="flex items-center gap-1">
      <Button size="icon-sm" variant="outline" onClick={() => setDelta(delta - 1)} aria-label="Mês anterior"><ChevronLeft /></Button>
      <span className="min-w-36 text-center text-[13px] font-semibold capitalize" aria-live="polite">{mes.rotulo}</span>
      <Button size="icon-sm" variant="outline" onClick={() => setDelta(delta + 1)} disabled={delta >= 2} aria-label="Próximo mês"><ChevronRight /></Button>
    </div>
  );

  if (!admin) {
    return (
      <div className="space-y-5">
        <PageHeader titulo="Metas" subtitulo="Sua meta e a do time. Conta o que foi marcado como ganho no mês." acoes={navegacao} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 [&>*]:min-w-0">
          <CartaoMeta crm={crm} leads={crm.leads} usuarioId={crm.userId} mesInicio={mes.inicio} />
          <CartaoMeta crm={crm} leads={crm.leads} usuarioId={null} mesInicio={mes.inicio} />
        </div>
      </div>
    );
  }

  const linhas: { id: string | null; nome: string }[] = [{ id: null, nome: 'Time inteiro' }, ...crm.equipe.map((m) => ({ id: m.id, nome: m.nome || m.email || 'Sem nome' }))];
  return (
    <div className="space-y-5">
      <PageHeader titulo="Metas" subtitulo="Meta mensal de vendas em R$ e, se quiser, em número de negócios. Conta o que foi marcado como ganho no mês." acoes={navegacao} />
      <GlassCard className="p-2 sm:p-3">
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-[13px]">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="rounded-l-xl bg-pill-active/55 px-3 py-2.5 font-medium dark:bg-white/5">Quem</th>
                <th className="bg-pill-active/55 px-3 py-2.5 font-medium dark:bg-white/5">Meta em R$</th>
                <th className="bg-pill-active/55 px-3 py-2.5 font-medium dark:bg-white/5">Nº de vendas</th>
                <th className="rounded-r-xl bg-pill-active/55 px-3 py-2.5 font-medium dark:bg-white/5">Andamento</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <LinhaMeta key={`${l.id ?? 'time'}-${chave}`} crm={crm} usuarioId={l.id} nome={l.nome} mesInicio={mes.inicio} chave={chave} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 pt-3 pb-1">
          <p className="text-xs text-muted-foreground">Salva ao sair do campo. Deixe em branco para não ter meta.</p>
          {temAnterior && <Button size="sm" variant="outline" onClick={copiarAnterior}><Copy /> Copiar metas do mês anterior</Button>}
        </div>
      </GlassCard>
    </div>
  );
}

function LinhaMeta({ crm, usuarioId, nome, mesInicio, chave }: { crm: Painel; usuarioId: string | null; nome: string; mesInicio: Date; chave: string }) {
  const meta = metaDe(crm.metas, usuarioId, chave);
  const [valor, setValor] = useState(meta?.valor != null ? String(meta.valor) : '');
  const [qtd, setQtd] = useState(meta?.quantidade != null ? String(meta.quantidade) : '');
  const [ultima, setUltima] = useState(meta);
  if (meta !== ultima) { setUltima(meta); setValor(meta?.valor != null ? String(meta.valor) : ''); setQtd(meta?.quantidade != null ? String(meta.quantidade) : ''); }
  const prog = progressoMeta(crm.leads, crm.etapas, crm.metas, usuarioId, mesInicio);

  const salvar = async () => {
    const v = valor.trim() === '' ? null : Number(valor.replace(',', '.'));
    const q = qtd.trim() === '' ? null : Math.round(Number(qtd));
    if ((v != null && (!Number.isFinite(v) || v < 0)) || (q != null && (!Number.isFinite(q) || q < 0))) return;
    if (v === (meta?.valor ?? null) && q === (meta?.quantidade ?? null)) return;
    await crm.salvarMeta({ usuario_id: usuarioId, mes: chave, valor: v, quantidade: q });
  };
  const aoTeclar = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') e.currentTarget.blur(); };

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className={cn('px-3 py-3', usuarioId === null ? 'font-semibold' : 'font-medium')}>{nome}</td>
      <td className="px-3 py-3">
        <label className="relative inline-flex items-center">
          <span className="sr-only">Meta em reais de {nome}</span>
          <span className="pointer-events-none absolute left-3 text-xs text-muted-foreground" aria-hidden>R$</span>
          <input type="number" inputMode="decimal" min={0} step="100" value={valor} onChange={(e) => setValor(e.target.value)} onBlur={salvar} onKeyDown={aoTeclar} placeholder="—" className="tabular h-9 w-36 rounded-xl border border-input bg-background/60 pr-3 pl-9 text-right text-[13px] dark:bg-white/6" />
        </label>
      </td>
      <td className="px-3 py-3">
        <label>
          <span className="sr-only">Meta em número de vendas de {nome}</span>
          <input type="number" inputMode="numeric" min={0} value={qtd} onChange={(e) => setQtd(e.target.value)} onBlur={salvar} onKeyDown={aoTeclar} placeholder="—" className="tabular h-9 w-20 rounded-xl border border-input bg-background/60 px-3 text-right text-[13px] dark:bg-white/6" />
        </label>
      </td>
      <td className="w-64 px-3 py-3">
        {prog.meta?.valor ? (
          <div className="space-y-1">
            <Progresso atual={prog.vendido} alvo={prog.meta.valor} ritmo={chave === chaveMes(new Date()) ? prog.decorrido : undefined} rotulo={`Andamento da meta de ${nome}`} />
            <span className="tabular text-xs text-muted-foreground">{formatarMoedaCurta(prog.vendido)} · {pct(prog.pctValor)}</span>
          </div>
        ) : (
          <span className="tabular text-xs text-muted-foreground">{prog.vendido > 0 ? `${formatarMoeda(prog.vendido)} vendidos` : 'Sem vendas'}{prog.meta?.quantidade ? ` · ${prog.ganhos}/${prog.meta.quantidade}` : ''}</span>
        )}
      </td>
    </tr>
  );
}

/* ---------------- Relatório mensal com a marca ---------------- */

function RelatorioMensal({ crm }: { crm: Painel }) {
  const [delta, setDelta] = useState(-1 + (new Date().getDate() >= 25 ? 1 : 0));
  const mes = useMemo(() => intervaloDoMes(delta), [delta]);
  const leads = crm.papel === 'admin' ? crm.leads : crm.leads.filter((l) => l.vendedor_id === crm.userId);
  const d = useMemo(() => calcularDesempenho({ leads, etapas: crm.etapas, movimentos: crm.movimentos, equipe: crm.equipe }, mes), [leads, crm.etapas, crm.movimentos, crm.equipe, mes]);
  const frases = oQueMudou(d, mes.comparacao);
  const montado = useSyncExternalStore(() => () => {}, () => true, () => false);
  const meses = Array.from({ length: 12 }, (_, i) => -i);

  return (
    <div className="space-y-5">
      <div>
        <PageHeader
          titulo="Relatório mensal"
          subtitulo="Resumo do mês com a marca da empresa, pronto para imprimir ou salvar em PDF e mandar ao dono."
          acoes={
            <>
              <label className="relative">
                <span className="sr-only">Mês do relatório</span>
                <CalendarRange className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <select value={delta} onChange={(e) => setDelta(Number(e.target.value))} className={cn(SELECT, 'pl-10 capitalize')}>
                  {meses.map((m) => <option key={m} value={m}>{nomeMes(intervaloDoMes(m).inicio)}</option>)}
                </select>
              </label>
              <Button onClick={() => window.print()}><Printer /> Imprimir ou salvar PDF</Button>
            </>
          }
        />
      </div>

      {crm.papel === 'admin' && <EnvioPorEmail crm={crm} mes={mes.inicio} />}
      <PapelRelatorio crm={crm} leads={leads} d={d} mes={mes} frases={frases} />
      {montado && createPortal(<div id="relatorio-impressao" className="hidden print:block"><PapelRelatorio crm={crm} leads={leads} d={d} mes={mes} frases={frases} impressao /></div>, document.body)}
    </div>
  );
}

/** Relatório mensal por e-mail: ligar/desligar, destinatários extras, prévia e últimos envios. */
function EnvioPorEmail({ crm, mes }: { crm: Painel; mes: Date }) {
  const ativo = crm.empresa?.relatorio_email_ativo ?? true;
  const extras = crm.empresa?.relatorio_emails_extras ?? [];
  const admins = crm.equipe.filter((m) => m.role === 'admin');
  const [novo, setNovo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [envios, setEnvios] = useState<EnvioRelatorio[] | null>(null);
  const [versao, setVersao] = useState(0);
  const mesIso = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    let vivo = true;
    void crm.carregarEnviosRelatorio().then((r) => { if (vivo) setEnvios(r); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versao]);

  const incluir = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = novo.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setErro('Escreva um e-mail válido, como dono@empresa.com.br.'); return; }
    if (extras.includes(email) || admins.some((a) => a.email?.toLowerCase() === email)) { setErro('Esse e-mail já recebe.'); return; }
    if (extras.length >= 5) { setErro('Até 5 e-mails extras.'); return; }
    setErro(null);
    if (await crm.salvarEnvioRelatorio({ relatorio_emails_extras: [...extras, email] })) setNovo('');
  };
  const previa = async () => { setEnviando(true); await crm.enviarPreviaRelatorio(mesIso); setEnviando(false); setVersao((v) => v + 1); };

  return (
    <GlassCard className="space-y-4 print:hidden">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardTitle titulo="Envio por e-mail" descricao="Todo dia 1, às 8h, o resumo do mês que fechou chega por e-mail com o logo e a cor da empresa." />
        <span className="flex items-center gap-2 text-[13px] font-medium">
          {ativo ? 'Ligado' : 'Desligado'}
          <Toggle ativo={ativo} aoMudar={(v) => void crm.salvarEnvioRelatorio({ relatorio_email_ativo: v })} rotulo="Enviar o relatório mensal por e-mail" />
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Quem recebe</p>
          <ul className="flex flex-wrap gap-1.5 text-[13px]">
            {admins.map((a) => (
              <li key={a.id} className="inline-flex h-8 items-center rounded-full bg-pill-active/55 px-3 dark:bg-white/6" title="Administrador: sempre recebe">
                {a.email}<span className="ml-1.5 text-[11px] text-muted-foreground">admin</span>
              </li>
            ))}
            {extras.map((e) => (
              <li key={e} className="inline-flex h-8 items-center gap-1 rounded-full border border-glass-border pr-1 pl-3">
                {e}
                <button type="button" onClick={() => void crm.salvarEnvioRelatorio({ relatorio_emails_extras: extras.filter((x) => x !== e) })} aria-label={`Parar de enviar para ${e}`} className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-pill-active hover:text-foreground dark:hover:bg-white/10">
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={incluir} className="flex gap-2" noValidate>
            <input
              type="email" value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="dono@empresa.com.br"
              aria-label="Incluir e-mail que recebe o relatório" aria-invalid={!!erro} aria-describedby="envio-extra-ajuda"
              className="h-9 min-w-0 flex-1 rounded-xl border border-input bg-background/60 px-3 text-[13px] dark:bg-white/6"
            />
            <Button type="submit" size="sm" variant="outline" disabled={!novo.trim() || extras.length >= 5}><Plus /> Incluir</Button>
          </form>
          <p id="envio-extra-ajuda" className={cn('text-xs', erro ? 'font-medium text-destructive' : 'text-muted-foreground')} role={erro ? 'alert' : undefined}>
            {erro ?? `Administradores sempre recebem. Inclua até 5 e-mails extras, como o do dono ou da diretoria (${extras.length}/5).`}
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Testar</p>
          <Button size="sm" variant="outline" disabled={enviando} onClick={previa}><Send /> {enviando ? 'Enviando…' : `Enviar prévia de ${nomeMes(mes)} para mim`}</Button>
          <p className="text-xs text-muted-foreground">Só você recebe, com “[Prévia]” no assunto. O envio do dia 1 não é afetado.</p>
          {envios && envios.length > 0 && (
            <ul className="space-y-1 pt-1 text-xs">
              {envios.map((e) => (
                <li key={e.id} className="flex flex-wrap justify-between gap-x-3">
                  <span>{e.tipo === 'previa' ? 'Prévia' : 'Envio mensal'} de {nomeMes(new Date(`${e.mes}T12:00:00`))}{e.erro ? '' : ` · ${e.destinatarios} ${e.destinatarios === 1 ? 'pessoa' : 'pessoas'}`}</span>
                  <span className={e.erro ? 'font-medium text-destructive' : 'text-muted-foreground'}>{e.erro ? 'falhou' : new Date(e.enviado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function PapelRelatorio({ crm, leads, d, mes, frases, impressao }: { crm: Painel; leads: Lead[]; d: Desempenho; mes: ReturnType<typeof intervaloDoMes>; frases: string[]; impressao?: boolean }) {
  const cor = crm.empresa?.cor_primaria || COR_PADRAO;
  const solida = corSolida(cor);
  const { atual: n, anterior: p } = d;
  return (
      <article className={cn('mx-auto overflow-hidden bg-white text-[#1b1716]', impressao ? 'w-full' : 'max-w-[860px] rounded-[22px] shadow-[0_20px_50px_-24px_rgb(40_25_15/0.45)]')} aria-hidden={impressao || undefined}>
        <div className="h-2" style={{ backgroundColor: cor }} aria-hidden />
        <header className="flex flex-wrap items-center justify-between gap-4 px-8 pt-7 pb-5">
          <div className="flex items-center gap-3">
            {crm.imagens.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={crm.imagens.logo} alt="" className="size-12 rounded-xl object-contain p-1" style={{ backgroundColor: fundoDoLogo(crm.empresa?.cor_fundo_logo) ?? 'transparent' }} />
            ) : (
              <span className="grid size-12 place-items-center rounded-xl text-lg font-bold" style={{ backgroundColor: solida.fundo, color: solida.texto }} aria-hidden>{(crm.empresa?.nome || 'C').slice(0, 2).toUpperCase()}</span>
            )}
            <div>
              <p className="text-lg font-bold">{crm.empresa?.nome || 'Minha empresa'}</p>
              <p className="text-[13px] text-[#5c534f]">Relatório de vendas</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">{mes.rotulo.charAt(0).toUpperCase() + mes.rotulo.slice(1)}</p>
            <p className="text-xs text-[#5c534f]">{crm.papel === 'admin' ? 'Time inteiro' : `Vendas de ${crm.nomeUsuario}`}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-px border-y border-[#e9e2dc] bg-[#e9e2dc] sm:grid-cols-4" aria-label="Resumo">
          {[
            { r: 'Vendido', v: formatarMoeda(n.vendido), dv: variacao(n.vendido, p.vendido) },
            { r: 'Negócios ganhos', v: String(n.ganhos), dv: variacao(n.ganhos, p.ganhos) },
            { r: 'Leads novos', v: String(n.novos), dv: variacao(n.novos, p.novos) },
            { r: 'Taxa de ganho', v: pct(n.taxaGanho), dv: null },
          ].map((k) => (
            <div key={k.r} className="min-w-0 bg-white px-5 py-4">
              <p className="text-xs text-[#5c534f]">{k.r}</p>
              <p className="tabular mt-1 text-xl font-bold whitespace-nowrap">{k.v}</p>
              {k.dv != null && <p className={cn('tabular mt-0.5 text-xs font-medium', k.dv >= 0 ? 'text-[#13774f]' : 'text-[#b3261e]')}>{k.dv >= 0 ? '▲' : '▼'} {Math.abs(k.dv)}% {mes.comparacao}</p>}
            </div>
          ))}
        </section>

        <div className="grid gap-x-10 gap-y-7 px-8 py-7 md:grid-cols-2">
          <section className="md:col-span-2">
            <h2 className="mb-2 text-[15px] font-bold">O que mudou no mês</h2>
            <ul className="list-disc space-y-1 pl-5 text-[13px] leading-relaxed">
              {frases.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[15px] font-bold">Funil do mês</h2>
            {n.novos === 0 ? <p className="text-[13px] text-[#5c534f]">Nenhum lead entrou no mês.</p> : (
              <ol className="space-y-2.5">
                {d.funil.map((f) => <BarraPapel key={f.etapa.id} rotulo={f.etapa.nome} valor={`${f.alcancaram} · ${pct(f.pctTotal)}`} largura={f.pctTotal} cor={f.etapa.cor} />)}
              </ol>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-[15px] font-bold">Motivos de perda</h2>
            {d.motivos.length === 0 ? <p className="text-[13px] text-[#5c534f]">Nenhum negócio perdido no mês.</p> : (
              <ol className="space-y-2.5">
                {d.motivos.slice(0, 6).map((m) => <BarraPapel key={m.motivo} rotulo={m.motivo} valor={`${m.n} · ${formatarMoeda(m.valor)}`} largura={(m.n / d.motivos[0].n) * 100} cor="#b3261e" />)}
              </ol>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-[15px] font-bold">De onde vieram os leads</h2>
            {d.origens.length === 0 ? <p className="text-[13px] text-[#5c534f]">Nenhum lead entrou no mês.</p> : (
              <table className="w-full text-left text-[13px]">
                <thead className="text-xs text-[#5c534f]"><tr><th className="pb-1 font-medium">Origem</th><th className="pb-1 text-right font-medium">Leads</th><th className="pb-1 text-right font-medium">Vendas</th></tr></thead>
                <tbody className="tabular">
                  {d.origens.slice(0, 6).map((o) => <tr key={o.origem} className="border-t border-[#efe9e4]"><td className="py-1.5">{o.origem}</td><td className="py-1.5 text-right">{o.leads}</td><td className="py-1.5 text-right">{o.ganhos}</td></tr>)}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-[15px] font-bold">{crm.papel === 'admin' ? 'Equipe e metas' : 'Sua meta'}</h2>
            <table className="w-full text-left text-[13px]">
              <thead className="text-xs text-[#5c534f]"><tr><th className="pb-1 font-medium">Quem</th><th className="pb-1 text-right font-medium">Vendido</th><th className="pb-1 text-right font-medium">Meta</th></tr></thead>
              <tbody className="tabular">
                {(crm.papel === 'admin' ? [null, ...crm.equipe.map((m) => m.id)] : [crm.userId]).map((id) => {
                  const prog = progressoMeta(leads, crm.etapas, crm.metas, id, mes.inicio);
                  const nome = id === null ? 'Time inteiro' : crm.equipe.find((m) => m.id === id)?.nome || crm.equipe.find((m) => m.id === id)?.email || 'Você';
                  return (
                    <tr key={id ?? 'time'} className="border-t border-[#efe9e4]">
                      <td className={cn('py-1.5', id === null && 'font-semibold')}>{nome}</td>
                      <td className="py-1.5 text-right">{formatarMoeda(prog.vendido)}</td>
                      <td className="py-1.5 text-right">{prog.meta?.valor ? `${pct(prog.pctValor)} de ${formatarMoedaCurta(prog.meta.valor)}` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>

        <footer className="flex flex-wrap justify-between gap-2 border-t border-[#e9e2dc] px-8 py-4 text-[11px] text-[#5c534f]">
          <span>Ciclo médio de venda: {n.cicloDias == null ? '—' : `${Math.round(n.cicloDias)} dias`} · Ticket médio: {n.ticket == null ? '—' : formatarMoeda(n.ticket)}</span>
          <span>Gerado em {new Date().toLocaleDateString('pt-BR')}</span>
        </footer>
      </article>
  );
}

function BarraPapel({ rotulo, valor, largura, cor }: { rotulo: string; valor: string; largura: number; cor: string }) {
  return (
    <li>
      <div className="flex justify-between gap-3 text-[13px]"><span className="truncate">{rotulo}</span><span className="tabular shrink-0 font-semibold">{valor}</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#f1ece8]" aria-hidden>
        <div className="h-full rounded-full" style={{ width: `${Math.max(Math.min(largura, 100), largura > 0 ? 2 : 0)}%`, backgroundColor: cor, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }} />
      </div>
    </li>
  );
}
