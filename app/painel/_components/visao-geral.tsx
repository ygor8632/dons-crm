'use client';

import { useMemo } from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarClock, CircleDollarSign, Inbox, Percent, Trophy } from 'lucide-react';
import { CardTitle, EmptyState, GlassCard, PageHeader, StatCard } from '@/components/glass';
import { Button } from '@/components/ui/button';
import { formatarMoeda, formatarMoedaCurta } from '@/lib/marca';
import { cn } from '@/lib/utils';
import type { Painel } from '../_lib/use-painel';
import type { Lead } from '../_lib/tipos';
import { formatarDataHora, grupoTarefa, leadsPorMes, tempoRelativo, variacaoMensal } from '../_lib/util';

type Props = { crm: Painel; visao: string; abrirLead: (l: Lead) => void; irPara: (secao: string, visao?: string) => void; novoLead: () => void };

/* Tooltip de vidro compartilhado pelos gráficos */
function DicaGrafico({ active, payload, label, formato }: { active?: boolean; payload?: { value: number; payload: Record<string, unknown> }[]; label?: string; formato: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-xs">
      <p className="font-medium capitalize">{label ?? String(payload[0].payload.name ?? '')}</p>
      <p className="tabular text-muted-foreground">{formato(payload[0].value)}</p>
    </div>
  );
}

export function VisaoGeral({ crm, visao, abrirLead, irPara, novoLead }: Props) {
  const { leads, etapas, tarefas, nomeUsuario } = crm;

  const metricas = useMemo(() => {
    const ultima = etapas[etapas.length - 1];
    const ganhos = ultima ? leads.filter((l) => l.etapa_id === ultima.id) : [];
    const abertos = leads.filter((l) => l.etapa_id !== ultima?.id);
    return {
      pipeline: abertos.reduce((s, l) => s + (l.valor || 0), 0),
      pipelineVar: variacaoMensal(abertos, (l) => l.created_at, (l) => l.valor || 0).delta,
      mes: variacaoMensal(leads, (l) => l.created_at),
      ganhos: ganhos.length,
      ganhosValor: ganhos.reduce((s, l) => s + (l.valor || 0), 0),
      conversao: leads.length ? (ganhos.length / leads.length) * 100 : 0,
      ultimaEtapa: ultima?.nome,
    };
  }, [leads, etapas]);

  const porMes = useMemo(() => leadsPorMes(leads), [leads]);
  const funil = useMemo(
    () => etapas.map((e) => ({ name: e.nome, value: leads.filter((l) => l.etapa_id === e.id).length, cor: e.cor })),
    [etapas, leads],
  );
  const origens = useMemo(() => {
    const m = new Map<string, number>();
    leads.forEach((l) => m.set(l.origem || 'Outros', (m.get(l.origem || 'Outros') || 0) + 1));
    return [...m.entries()].map(([origem, n]) => ({ origem, n })).sort((a, b) => b.n - a.n).slice(0, 6);
  }, [leads]);
  const proximos = useMemo(() => tarefas.filter((t) => !t.concluida).slice(0, 4), [tarefas]);

  const primeiroNome = nomeUsuario.split(' ')[0];

  if (visao === 'atividade') {
    return (
      <div className="space-y-6">
        <PageHeader titulo="Atividade recente" subtitulo="Os leads que entraram por último, de todas as origens." />
        <GlassCard className="p-2 sm:p-3">
          <TabelaRecentes leads={leads.slice(0, 25)} crm={crm} abrirLead={abrirLead} />
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={`Seu funil hoje, ${primeiroNome}`}
        subtitulo="Acompanhe o pipeline, as conversões e o que precisa de retorno."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 [&>*]:min-w-0">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-7 [&>*]:min-w-0">
          <StatCard className="col-span-2 sm:col-span-1" destaque rotulo="Valor em pipeline" icone={CircleDollarSign} valor={formatarMoedaCurta(metricas.pipeline)} delta={metricas.pipelineVar} legenda="este mês" />
          <StatCard rotulo="Leads no mês" icone={Inbox} valor={metricas.mes.atual} delta={metricas.mes.delta} legenda="vs. mês anterior" />
          <StatCard rotulo={metricas.ultimaEtapa ?? 'Vendas'} icone={Trophy} valor={metricas.ganhos} legenda={formatarMoeda(metricas.ganhosValor)} />
          <StatCard className="col-span-2 sm:col-span-1" rotulo="Conversão" icone={Percent} valor={`${metricas.conversao.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`} legenda={`${leads.length} leads no total`} />
        </div>

        <GlassCard className="flex flex-col lg:col-span-5">
          <CardTitle titulo="Leads por mês" descricao="Últimos 6 meses · mês atual em destaque" />
          <div className="mt-4 h-56 min-h-56 text-brand" role="img" aria-label={`Leads por mês: ${porMes.map((m) => `${m.mes} ${m.quantidade}`).join(', ')}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porMes} margin={{ top: 8, right: 4, left: -28, bottom: 0 }} barCategoryGap="28%">
                <defs>
                  <pattern id="hachura" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="6" height="6" fill="var(--brand)" opacity="0.55" />
                    <rect width="3" height="6" fill="var(--brand)" />
                  </pattern>
                </defs>
                <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <Tooltip cursor={{ fill: 'var(--muted)', radius: 8 }} content={<DicaGrafico formato={(v) => `${v} ${v === 1 ? 'lead' : 'leads'}`} />} />
                <Bar dataKey="quantidade" radius={[8, 8, 8, 8]} maxBarSize={34}>
                  {porMes.map((m) => (
                    <Cell key={m.mes} fill={m.atual ? 'url(#hachura)' : 'var(--foreground)'} fillOpacity={m.atual ? 1 : 0.86} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-5">
          <CardTitle titulo="Distribuição do funil" descricao="Leads por etapa" acao={<Button size="xs" variant="outline" onClick={() => irPara('leads', 'kanban')}>Abrir Kanban</Button>} />
          {leads.length === 0 ? (
            <EmptyState icone={Inbox} titulo="Nenhum lead ainda" texto="Adicione o primeiro lead ou conecte o webhook do seu site." acao={<Button size="sm" onClick={novoLead}>Novo lead</Button>} />
          ) : (
            <div className="mt-2 flex flex-col items-center gap-5 sm:flex-row">
              <div className="relative size-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={funil.filter((f) => f.value > 0)} dataKey="value" innerRadius="72%" outerRadius="100%" paddingAngle={3} cornerRadius={6} stroke="none" isAnimationActive={false}>
                      {funil.filter((f) => f.value > 0).map((f) => <Cell key={f.name} fill={f.cor} />)}
                    </Pie>
                    <Tooltip content={<DicaGrafico formato={(v) => `${v} ${v === 1 ? 'lead' : 'leads'}`} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="tabular text-2xl font-bold tracking-[-0.02em]">{leads.length}</p>
                    <p className="text-[11px] text-muted-foreground">leads</p>
                  </div>
                </div>
              </div>
              <ul className="w-full space-y-3">
                {funil.map((f) => {
                  const pct = leads.length ? (f.value / leads.length) * 100 : 0;
                  return (
                    <li key={f.name}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: f.cor }} aria-hidden />
                          <span className="truncate font-medium">{f.name}</span>
                        </span>
                        <span className="tabular shrink-0 text-muted-foreground">{f.value} · {pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-chart-muted">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: f.cor }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </GlassCard>

        <GlassCard className="lg:col-span-4">
          <CardTitle titulo="Leads por origem" descricao="De onde vêm os contatos" />
          <ul className="mt-4 space-y-3">
            {origens.length === 0 && <li className="text-xs text-muted-foreground">Sem dados ainda.</li>}
            {origens.map((o, i) => (
              <li key={o.origem} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3 text-xs">
                <span className="truncate font-medium" title={o.origem}>{o.origem}</span>
                <div className="h-2.5 rounded-full bg-chart-muted">
                  <div
                    className={cn('h-full rounded-full', i === 0 ? 'hatch text-brand' : 'bg-foreground/80')}
                    style={{ width: `${(o.n / origens[0].n) * 100}%` }}
                  />
                </div>
                <span className="tabular w-6 text-right text-muted-foreground">{o.n}</span>
              </li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard className="lg:col-span-3">
          <CardTitle titulo="Próximos follow-ups" acao={<Button size="xs" variant="outline" onClick={() => irPara('leads', 'tarefas')}>Ver todos</Button>} />
          <ul className="mt-3 space-y-1">
            {proximos.length === 0 && <li className="py-6 text-center text-xs text-muted-foreground">Nenhum follow-up pendente.</li>}
            {proximos.map((t) => {
              const lead = leads.find((l) => l.id === t.lead_id);
              const g = grupoTarefa(t);
              return (
                <li key={t.id}>
                  <button type="button" onClick={() => lead && abrirLead(lead)} className="flex w-full items-start gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-muted">
                    <CalendarClock className={cn('mt-0.5 size-4 shrink-0', g === 'atrasada' ? 'text-destructive' : 'text-muted-foreground')} aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium">{t.descricao}</span>
                      <span className={cn('block truncate text-xs', g === 'atrasada' ? 'text-destructive' : 'text-muted-foreground')}>
                        {g === 'atrasada' ? 'Atrasado · ' : ''}{formatarDataHora(t.data_vencimento)}{lead ? ` · ${lead.nome}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </GlassCard>

        <GlassCard className="p-2 sm:p-3 lg:col-span-12">
          <div className="flex items-center justify-between px-3 pt-2 pb-3">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em]">Últimos leads</h3>
            <Button size="xs" variant="outline" onClick={() => irPara('visao', 'atividade')}>Ver atividade</Button>
          </div>
          <TabelaRecentes leads={leads.slice(0, 5)} crm={crm} abrirLead={abrirLead} />
        </GlassCard>
      </div>
    </div>
  );
}

function TabelaRecentes({ leads, crm, abrirLead }: { leads: Lead[]; crm: Painel; abrirLead: (l: Lead) => void }) {
  if (leads.length === 0) return <p className="px-3 py-8 text-center text-xs text-muted-foreground">Nenhum lead ainda.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-[13px]">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="rounded-l-xl bg-pill-active/55 px-3 py-2.5 font-medium dark:bg-white/5">Lead</th>
            <th className="bg-pill-active/55 px-3 py-2.5 font-medium dark:bg-white/5">Origem</th>
            <th className="bg-pill-active/55 px-3 py-2.5 font-medium dark:bg-white/5">Etapa</th>
            <th className="bg-pill-active/55 px-3 py-2.5 text-right font-medium dark:bg-white/5">Valor</th>
            <th className="rounded-r-xl bg-pill-active/55 px-3 py-2.5 text-right font-medium dark:bg-white/5">Entrou</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => {
            const etapa = crm.etapas.find((e) => e.id === l.etapa_id);
            return (
              <tr key={l.id} className="border-b border-border/60 last:border-0">
                <td className="max-w-[260px] px-3 py-3">
                  <button type="button" onClick={() => abrirLead(l)} className="block max-w-full truncate font-medium hover:underline">{l.nome}</button>
                </td>
                <td className="px-3 py-3 text-muted-foreground">{l.origem || 'Direto'}</td>
                <td className="px-3 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <span className="size-2 rounded-full" style={{ backgroundColor: etapa?.cor }} aria-hidden />
                    {etapa?.nome ?? 'Sem etapa'}
                  </span>
                </td>
                <td className="tabular px-3 py-3 text-right">{formatarMoeda(l.valor || 0)}</td>
                <td className="px-3 py-3 text-right text-muted-foreground">{tempoRelativo(l.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
