'use client';

import { useMemo, useState } from 'react';
import { CalendarClock, Check, Filter, PartyPopper, Plug, Plus, Search, Upload } from 'lucide-react';
import { EmptyState, GlassCard, PageHeader, Segmented } from '@/components/glass';
import { Button } from '@/components/ui/button';
import { formatarMoeda } from '@/lib/marca';
import { cn } from '@/lib/utils';
import type { Painel } from '../_lib/use-painel';
import type { Lead, Tarefa } from '../_lib/tipos';
import { diasParado, emAberto, estaGanho, etapaFinal, formatarDataHora, grupoTarefa, ordenarPorProximaAtividade, semProximoPasso, valorPonderado, type GrupoTarefa } from '../_lib/util';
import { BotaoWhatsApp, MenuLead, SeloSituacao, SinaisLead } from './acoes-lead';
import { emDias, SUGESTOES } from './proximo-passo';

type Props = { crm: Painel; visao: string; abrirLead: (l: Lead) => void; novoLead: () => void; irPara: (secao: string, visao?: string) => void };

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function Leads({ crm, visao, abrirLead, novoLead, irPara }: Props) {
  const [busca, setBusca] = useState('');
  const [etapaFiltro, setEtapaFiltro] = useState('todas');
  const [situacao, setSituacao] = useState<'aberto' | 'ganho' | 'perdido' | 'todas'>('aberto');

  const filtrados = useMemo(() => {
    const t = normalizar(busca.trim());
    return crm.leads.filter((l) => {
      const okBusca = !t || normalizar(`${l.nome} ${l.email ?? ''} ${l.telefone ?? ''}`).includes(t);
      return okBusca && (etapaFiltro === 'todas' || l.etapa_id === etapaFiltro);
    });
  }, [crm.leads, busca, etapaFiltro]);

  if (visao === 'tarefas') return <Tarefas crm={crm} abrirLead={abrirLead} />;
  if (visao === 'hoje') return <Hoje crm={crm} abrirLead={abrirLead} novoLead={novoLead} irPara={irPara} />;

  const noFunil = crm.leads.filter((l) => (l.situacao ?? 'aberto') !== 'perdido');
  const daLista = filtrados.filter((l) => {
    if (situacao === 'todas') return true;
    if (situacao === 'perdido') return l.situacao === 'perdido';
    if (situacao === 'ganho') return estaGanho(l, crm.etapas) && l.situacao !== 'perdido';
    return emAberto(l, crm.etapas);
  });

  const acoes = (
    <>
      {crm.papel === 'admin' && (
        <Button variant="outline" onClick={() => irPara('integracoes', 'importar')}>
          <Upload /> Importar planilha
        </Button>
      )}
      <Button onClick={novoLead}>Novo lead</Button>
    </>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Leads"
        subtitulo={visao === 'lista' ? `${daLista.length} ${daLista.length === 1 ? 'lead' : 'leads'} nesta lista` : `${noFunil.length} no funil · arraste os cards ou use o menu ⋯ para mudar de etapa`}
        acoes={acoes}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar por nome, e-mail ou telefone"
            aria-label="Filtrar leads"
            className="h-10 w-full rounded-full border border-glass-border bg-pill-active/55 pr-4 pl-10 text-[13px] placeholder:text-muted-foreground dark:bg-white/6"
          />
        </div>
        {visao === 'lista' && (
          <>
            <div className="relative sm:w-56">
              <Filter className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <select
                value={etapaFiltro}
                onChange={(e) => setEtapaFiltro(e.target.value)}
                aria-label="Filtrar por etapa"
                className="h-10 w-full appearance-none rounded-full border border-glass-border bg-pill-active/55 pr-4 pl-10 text-[13px] dark:bg-white/6"
              >
                <option value="todas">Todas as etapas</option>
                {crm.etapas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <Segmented
              rotulo="Situação"
              valor={situacao}
              aoMudar={setSituacao}
              opcoes={[{ id: 'aberto', label: 'Em aberto' }, { id: 'ganho', label: 'Ganhos' }, { id: 'perdido', label: 'Perdidos' }, { id: 'todas', label: 'Todos' }]}
            />
          </>
        )}
      </div>

      {crm.leads.length === 0 ? (
        <FunilVazio crm={crm} novoLead={novoLead} irPara={irPara} />
      ) : visao === 'lista' ? (
        <Lista crm={crm} leads={daLista} abrirLead={abrirLead} />
      ) : (
        <Kanban crm={crm} leads={filtrados.filter((l) => (l.situacao ?? 'aberto') !== 'perdido')} abrirLead={abrirLead} />
      )}
    </div>
  );
}

/** Estado vazio que ensina: os três jeitos de o lead chegar. */
function FunilVazio({ crm, novoLead, irPara }: { crm: Painel; novoLead: () => void; irPara: (secao: string, visao?: string) => void }) {
  const admin = crm.papel === 'admin';
  const passos = [
    { icone: Plus, titulo: 'Cadastre à mão', texto: 'Nome, WhatsApp e origem. Leva 10 segundos.', acao: <Button size="sm" onClick={novoLead}>Novo lead</Button> },
    ...(admin ? [
      { icone: Upload, titulo: 'Traga sua planilha', texto: 'CSV do Excel ou Google Planilhas. Você confere antes de importar.', acao: <Button size="sm" variant="outline" onClick={() => irPara('integracoes', 'importar')}>Importar</Button> },
      { icone: Plug, titulo: 'Ligue seu site', texto: 'O formulário do site cria o lead sozinho, sem duplicar.', acao: <Button size="sm" variant="outline" onClick={() => irPara('integracoes', 'webhook')}>Ver webhook</Button> },
    ] : []),
  ];
  return (
    <GlassCard>
      <div className="px-2 py-6 text-center">
        <p className="text-base font-semibold">Seu funil está vazio</p>
        <p className="mx-auto mt-1 max-w-md text-[13px] text-muted-foreground">Cada lead vira um card que anda pelas etapas até a venda. Escolha como começar:</p>
      </div>
      <ol className={cn('grid gap-3', passos.length > 1 && 'md:grid-cols-3')}>
        {passos.map((p, i) => (
          <li key={p.titulo} className="flex flex-col items-start gap-2 rounded-2xl bg-pill-active/45 p-4 dark:bg-white/5">
            <span className="flex items-center gap-2 text-[13px] font-semibold">
              <span className="tabular grid size-6 place-items-center rounded-full bg-foreground text-[11px] text-background">{i + 1}</span>
              {p.titulo}
            </span>
            <p className="flex-1 text-xs text-muted-foreground">{p.texto}</p>
            {p.acao}
          </li>
        ))}
      </ol>
    </GlassCard>
  );
}

/* ---------------- Kanban ---------------- */

function Kanban({ crm, leads, abrirLead }: { crm: Painel; leads: Lead[]; abrirLead: (l: Lead) => void }) {
  const [sobre, setSobre] = useState<string | null>(null);
  const final = etapaFinal(crm.etapas);
  return (
    <div className="relative -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
      {crm.etapas.map((etapa) => {
        const daEtapa = ordenarPorProximaAtividade(leads.filter((l) => l.etapa_id === etapa.id), crm.tarefas);
        const total = daEtapa.reduce((s, l) => s + (l.valor || 0), 0);
        const ponderado = daEtapa.reduce((s, l) => s + valorPonderado(l, crm.etapas), 0);
        const ehFinal = etapa.id === final?.id;
        return (
          <section
            key={etapa.id}
            aria-label={etapa.nome}
            onDragOver={(e) => { e.preventDefault(); setSobre(etapa.id); }}
            onDragLeave={() => setSobre((s) => (s === etapa.id ? null : s))}
            onDrop={(e) => { e.preventDefault(); setSobre(null); const id = e.dataTransfer.getData('leadId'); if (id) void crm.moverLead(id, etapa.id); }}
            className={cn(
              'flex min-h-[420px] w-[78vw] max-w-[300px] shrink-0 snap-start flex-col rounded-[22px] bg-muted p-2.5 transition-[background-color,box-shadow] duration-150 sm:w-[290px]',
              sobre === etapa.id && 'bg-pill-active/50 shadow-[inset_0_0_0_2px_var(--brand)] dark:bg-white/8',
            )}
          >
            <header className="px-2 pt-1.5 pb-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex min-w-0 items-center gap-2 text-[13px] font-semibold">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: etapa.cor }} aria-hidden />
                  <span className="truncate">{etapa.nome}</span>
                </h2>
                <span className="tabular shrink-0 rounded-full bg-pill-active/80 px-2 py-0.5 text-[11px] font-semibold dark:bg-white/10">{daEtapa.length}</span>
              </div>
              <p className="tabular mt-1 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{formatarMoeda(total)}</span>
                {!ehFinal && total > 0 && (
                  <span title={`Valor × chance de fechar (${etapa.probabilidade ?? 0}% nesta etapa)`}>≈ {formatarMoeda(ponderado)} provável</span>
                )}
              </p>
            </header>
            <div className="flex flex-1 flex-col gap-2">
              {daEtapa.map((lead) => (
                <article
                  key={lead.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('leadId', lead.id)}
                  className="glass-card lift group cursor-grab rounded-2xl p-3.5 active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-1">
                    <button type="button" onClick={() => abrirLead(lead)} className="min-w-0 flex-1 text-left">
                      <span className="line-clamp-2 text-[13px] font-semibold">{lead.nome}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">{lead.telefone || lead.email || 'Sem contato'}</span>
                    </button>
                    <BotaoWhatsApp crm={crm} lead={lead} />
                    <MenuLead crm={crm} lead={lead} />
                  </div>
                  <SinaisLead crm={crm} lead={lead} className="mt-2.5" />
                  <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-muted-foreground">{lead.origem || 'Direto'}</span>
                    {(lead.valor ?? 0) > 0 && <span className="tabular shrink-0 font-semibold">{formatarMoeda(lead.valor || 0)}</span>}
                  </div>
                </article>
              ))}
              {daEtapa.length === 0 && (
                <p className="grid flex-1 place-items-center rounded-2xl border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
                  {ehFinal ? 'Vendas fechadas aparecem aqui' : 'Arraste um lead para cá'}
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ---------------- Lista ---------------- */

function Lista({ crm, leads, abrirLead }: { crm: Painel; leads: Lead[]; abrirLead: (l: Lead) => void }) {
  return (
    <GlassCard className="p-2 sm:p-3">
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="rounded-l-xl bg-pill-active/55 px-3 py-2.5 font-medium dark:bg-white/5">Lead</th>
              <th className="bg-pill-active/55 px-3 py-2.5 font-medium dark:bg-white/5">Etapa</th>
              <th className="bg-pill-active/55 px-3 py-2.5 font-medium dark:bg-white/5">Responsável</th>
              <th className="bg-pill-active/55 px-3 py-2.5 text-right font-medium dark:bg-white/5">Valor</th>
              <th className="rounded-r-xl bg-pill-active/55 px-3 py-2.5 text-right font-medium dark:bg-white/5"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr><td colSpan={5} className="py-10 text-center text-xs text-muted-foreground">Nenhum lead com esse filtro.</td></tr>
            )}
            {leads.map((lead) => {
              const etapa = crm.etapas.find((e) => e.id === lead.etapa_id);
              const fechado = (lead.situacao ?? 'aberto') !== 'aberto';
              return (
                <tr key={lead.id} className="border-b border-border/60 last:border-0">
                  <td className="max-w-[300px] px-3 py-3">
                    <button type="button" onClick={() => abrirLead(lead)} className="block max-w-full truncate py-1 font-medium hover:underline">{lead.nome}</button>
                    <span className="block truncate text-xs text-muted-foreground">{lead.telefone || lead.email || 'Sem contato'}</span>
                    {fechado ? <SeloSituacao lead={lead} /> : <SinaisLead crm={crm} lead={lead} className="mt-1" />}
                  </td>
                  <td className="px-3 py-3">
                    <label className="relative inline-flex items-center">
                      <span className="sr-only">Etapa de {lead.nome}</span>
                      <span className="pointer-events-none absolute left-2.5 size-2 rounded-full" style={{ backgroundColor: etapa?.cor }} aria-hidden />
                      <select
                        value={lead.etapa_id ?? ''}
                        disabled={lead.situacao === 'perdido'}
                        onChange={(e) => void crm.moverLead(lead.id, e.target.value)}
                        className="h-8 appearance-none rounded-full border border-glass-border bg-pill-active/60 pr-3 pl-6 text-xs font-medium disabled:opacity-60 dark:bg-white/8"
                      >
                        {crm.etapas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                      </select>
                    </label>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{lead.vendedor?.nome || '—'}</td>
                  <td className="tabular px-3 py-3 text-right">{formatarMoeda(lead.valor || 0)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <BotaoWhatsApp crm={crm} lead={lead} />
                      <MenuLead crm={crm} lead={lead} />
                      <Button size="xs" variant="outline" onClick={() => abrirLead(lead)}>Ficha</Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

/* ---------------- Hoje ---------------- */

const ADIAR = [{ dias: 1, rotulo: 'Amanhã' }, { dias: 3, rotulo: 'Em 3 dias' }, { dias: 7, rotulo: 'Em 1 semana' }];

function Hoje({ crm, abrirLead, novoLead, irPara }: { crm: Painel; abrirLead: (l: Lead) => void; novoLead: () => void; irPara: (secao: string, visao?: string) => void }) {
  const agora = new Date();
  const leadDe = (id: string) => crm.leads.find((l) => l.id === id);
  const abertas = crm.tarefas.filter((t) => { const l = leadDe(t.lead_id); return !t.concluida && (!l || (l.situacao ?? 'aberto') !== 'perdido'); });
  const atrasadas = abertas.filter((t) => grupoTarefa(t, agora) === 'atrasada');
  const deHoje = abertas.filter((t) => grupoTarefa(t, agora) === 'hoje');
  const semPasso = crm.leads.filter((l) => semProximoPasso(l, crm.etapas, crm.tarefas));
  const parados = crm.leads
    .map((l) => ({ l, dias: diasParado(l, crm.etapas, agora.getTime()) }))
    .filter((x): x is { l: Lead; dias: number } => x.dias != null && !semPasso.includes(x.l))
    .sort((a, b) => b.dias - a.dias);
  const total = atrasadas.length + deHoje.length + semPasso.length + parados.length;
  const data = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  if (crm.leads.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader titulo="Hoje" subtitulo={data.charAt(0).toUpperCase() + data.slice(1)} />
        <FunilVazio crm={crm} novoLead={novoLead} irPara={irPara} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Hoje"
        subtitulo={`${data.charAt(0).toUpperCase() + data.slice(1)} · ${total === 0 ? 'nada pendente' : `${total} ${total === 1 ? 'coisa pede' : 'coisas pedem'} atenção`}`}
      />
      {total === 0 ? (
        <GlassCard>
          <EmptyState icone={PartyPopper} titulo="Tudo em dia" texto="Nenhum follow-up atrasado, todo lead em negociação tem um próximo passo e nada está parado." acao={<Button size="sm" variant="outline" onClick={() => irPara('leads', 'kanban')}>Ver o funil</Button>} />
        </GlassCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {atrasadas.length > 0 && (
            <GlassCard>
              <TituloBloco titulo="Atrasados" n={atrasadas.length} tom="perigo" />
              <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">Reagendar todos:</span>
                {ADIAR.map((a) => (
                  <button key={a.dias} type="button" onClick={() => void crm.reagendarTarefas(atrasadas.map((t) => t.id), a.dias)} className="h-7 rounded-full border border-glass-border px-2.5 font-medium hover:bg-pill-active dark:hover:bg-white/10">{a.rotulo}</button>
                ))}
              </div>
              <ListaTarefas crm={crm} tarefas={atrasadas} abrirLead={abrirLead} atrasada />
            </GlassCard>
          )}
          {deHoje.length > 0 && (
            <GlassCard>
              <TituloBloco titulo="Para hoje" n={deHoje.length} tom="atencao" />
              <ListaTarefas crm={crm} tarefas={deHoje} abrirLead={abrirLead} />
            </GlassCard>
          )}
          {semPasso.length > 0 && (
            <GlassCard>
              <TituloBloco titulo="Sem próximo passo" n={semPasso.length} tom="atencao" />
              <p className="-mt-1 mb-3 text-xs text-muted-foreground">Em negociação e sem follow-up marcado. Um clique agenda.</p>
              <ul className="space-y-1">
                {semPasso.map((l) => (
                  <li key={l.id} className="rounded-xl px-2 py-2 hover:bg-muted">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => abrirLead(l)} className="min-w-0 flex-1 truncate text-left text-[13px] font-medium hover:underline">{l.nome}</button>
                      <span className="shrink-0 text-xs text-muted-foreground">{crm.etapas.find((e) => e.id === l.etapa_id)?.nome}</span>
                      <BotaoWhatsApp crm={crm} lead={l} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {SUGESTOES.map((s) => (
                        <button key={s.id} type="button" onClick={() => void crm.agendar(l.id, s.descricao, emDias(s.dias))} className="inline-flex h-7 items-center gap-1 rounded-full border border-glass-border px-2.5 text-[11px] font-medium hover:bg-pill-active dark:hover:bg-white/10">
                          <s.icone className="size-3" aria-hidden /> {s.rotulo}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </GlassCard>
          )}
          {parados.length > 0 && (
            <GlassCard>
              <TituloBloco titulo="Parados" n={parados.length} tom="neutro" />
              <p className="-mt-1 mb-3 text-xs text-muted-foreground">Sem nenhuma atividade além do prazo da etapa. Mande um oi ou feche como perdido.</p>
              <ul className="space-y-1">
                {parados.map(({ l, dias }) => (
                  <li key={l.id} className="flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-muted">
                    <button type="button" onClick={() => abrirLead(l)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-[13px] font-medium hover:underline">{l.nome}</span>
                      <span className="block truncate text-xs text-muted-foreground">{crm.etapas.find((e) => e.id === l.etapa_id)?.nome} · {dias} dias sem atividade</span>
                    </button>
                    <BotaoWhatsApp crm={crm} lead={l} />
                    <MenuLead crm={crm} lead={l} />
                  </li>
                ))}
              </ul>
            </GlassCard>
          )}
        </div>
      )}
    </div>
  );
}

function TituloBloco({ titulo, n, tom }: { titulo: string; n: number; tom: 'perigo' | 'atencao' | 'neutro' }) {
  return (
    <h2 className={cn('mb-3 flex items-center gap-2 text-[15px] font-semibold', tom === 'perigo' && 'text-destructive')}>
      {titulo}
      <span className="tabular rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">{n}</span>
    </h2>
  );
}

function ListaTarefas({ crm, tarefas, abrirLead, atrasada }: { crm: Painel; tarefas: Tarefa[]; abrirLead: (l: Lead) => void; atrasada?: boolean }) {
  return (
    <ul className="space-y-1">
      {tarefas.map((t) => {
        const lead = crm.leads.find((l) => l.id === t.lead_id);
        return (
          <li key={t.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted">
            <button
              type="button"
              role="checkbox"
              aria-checked={false}
              aria-label={`Marcar “${t.descricao}” como concluído`}
              onClick={() => void crm.alternarTarefa(t.id, false)}
              className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-foreground/30 transition-colors duration-150 hover:border-brand"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{t.descricao}</p>
              <p className={cn('truncate text-xs', atrasada ? 'text-destructive' : 'text-muted-foreground')}>
                {formatarDataHora(t.data_vencimento)}
                {lead && <> · <button type="button" onClick={() => abrirLead(lead)} className="text-muted-foreground underline-offset-2 hover:underline">{lead.nome}</button></>}
              </p>
            </div>
            {lead && <BotaoWhatsApp crm={crm} lead={lead} />}
            <button type="button" onClick={() => void crm.reagendarTarefas([t.id], 1)} className="h-7 shrink-0 rounded-full px-2 text-xs font-medium text-muted-foreground hover:bg-pill-active hover:text-foreground dark:hover:bg-white/10" aria-label={`Adiar “${t.descricao}” para amanhã`}>
              Adiar
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------- Tarefas ---------------- */

const GRUPOS: { id: GrupoTarefa; titulo: string }[] = [
  { id: 'atrasada', titulo: 'Atrasados' },
  { id: 'hoje', titulo: 'Hoje' },
  { id: 'proxima', titulo: 'Próximos' },
  { id: 'concluida', titulo: 'Concluídos' },
];

function Tarefas({ crm, abrirLead }: { crm: Painel; abrirLead: (l: Lead) => void }) {
  const agora = new Date();
  const porGrupo = GRUPOS.map((g) => ({ ...g, itens: crm.tarefas.filter((t) => grupoTarefa(t, agora) === g.id) }));
  const pendentes = crm.tarefas.filter((t) => !t.concluida).length;

  return (
    <div className="space-y-5">
      <PageHeader titulo="Follow-ups" subtitulo={pendentes ? `${pendentes} ${pendentes === 1 ? 'retorno pendente' : 'retornos pendentes'}` : 'Tudo em dia.'} />
      {crm.tarefas.length === 0 ? (
        <GlassCard>
          <EmptyState icone={CalendarClock} titulo="Nenhum follow-up agendado" texto="Abra a ficha de um lead e agende o próximo retorno. Ele aparece aqui e no sino." />
        </GlassCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {porGrupo.filter((g) => g.itens.length > 0).map((g) => (
            <GlassCard key={g.id}>
              <h2 className={cn('mb-3 flex items-center gap-2 text-[15px] font-semibold', g.id === 'atrasada' && 'text-destructive')}>
                {g.titulo}
                <span className="tabular rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">{g.itens.length}</span>
              </h2>
              <ul className="space-y-1">
                {g.itens.map((t) => {
                  const lead = crm.leads.find((l) => l.id === t.lead_id);
                  return (
                    <li key={t.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={t.concluida}
                        aria-label={`Marcar “${t.descricao}” como ${t.concluida ? 'pendente' : 'concluído'}`}
                        onClick={() => void crm.alternarTarefa(t.id, t.concluida)}
                        className={cn('grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors duration-150', t.concluida ? 'border-brand-solid bg-brand-solid text-brand-solid-foreground' : 'border-foreground/30 hover:border-brand')}
                      >
                        {t.concluida && <Check className="size-3" strokeWidth={3} />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={cn('truncate text-[13px] font-medium', t.concluida && 'text-muted-foreground line-through')}>{t.descricao}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatarDataHora(t.data_vencimento)}
                          {lead && <> · <button type="button" onClick={() => abrirLead(lead)} className="underline-offset-2 hover:underline">{lead.nome}</button></>}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
