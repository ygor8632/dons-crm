'use client';

import { useMemo, useState } from 'react';
import { CalendarClock, Check, Filter, Inbox, MessageCircle, Search, Upload } from 'lucide-react';
import { EmptyState, GlassCard, PageHeader } from '@/components/glass';
import { Button } from '@/components/ui/button';
import { formatarMoeda } from '@/lib/marca';
import { cn } from '@/lib/utils';
import type { Painel } from '../_lib/use-painel';
import type { Lead } from '../_lib/tipos';
import { abrirWhatsApp, formatarDataHora, grupoTarefa, type GrupoTarefa } from '../_lib/util';

type Props = { crm: Painel; visao: string; abrirLead: (l: Lead) => void; novoLead: () => void; irPara: (secao: string, visao?: string) => void };

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function Leads({ crm, visao, abrirLead, novoLead, irPara }: Props) {
  const [busca, setBusca] = useState('');
  const [etapaFiltro, setEtapaFiltro] = useState('todas');

  const filtrados = useMemo(() => {
    const t = normalizar(busca.trim());
    return crm.leads.filter((l) => {
      const okBusca = !t || normalizar(`${l.nome} ${l.email ?? ''} ${l.telefone ?? ''}`).includes(t);
      return okBusca && (etapaFiltro === 'todas' || l.etapa_id === etapaFiltro);
    });
  }, [crm.leads, busca, etapaFiltro]);

  if (visao === 'tarefas') return <Tarefas crm={crm} abrirLead={abrirLead} />;

  const acoes = (
    <>
      {crm.papel === 'admin' && (
        <Button variant="outline" onClick={() => irPara('integracoes', 'importar')}>
          <Upload /> Importar CSV
        </Button>
      )}
      <Button onClick={novoLead}>Novo lead</Button>
    </>
  );

  return (
    <div className="space-y-5">
      <PageHeader titulo="Leads" subtitulo={`${crm.leads.length} no funil · arraste os cards para mudar de etapa`} acoes={acoes} />

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar por nome, e-mail ou telefone"
            aria-label="Filtrar leads"
            className="h-10 w-full rounded-full border border-glass-border bg-pill-active/55 pr-4 pl-10 text-[13px] outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/25 dark:bg-white/6"
          />
        </div>
        {visao === 'lista' && (
          <div className="relative sm:w-56">
            <Filter className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <select
              value={etapaFiltro}
              onChange={(e) => setEtapaFiltro(e.target.value)}
              aria-label="Filtrar por etapa"
              className="h-10 w-full appearance-none rounded-full border border-glass-border bg-pill-active/55 pr-4 pl-10 text-[13px] outline-none focus-visible:ring-3 focus-visible:ring-ring/25 dark:bg-white/6"
            >
              <option value="todas">Todas as etapas</option>
              {crm.etapas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
        )}
      </div>

      {crm.leads.length === 0 ? (
        <GlassCard>
          <EmptyState icone={Inbox} titulo="Seu funil está vazio" texto="Adicione um lead à mão, importe uma planilha ou conecte o webhook do seu site." acao={<Button size="sm" onClick={novoLead}>Novo lead</Button>} />
        </GlassCard>
      ) : visao === 'lista' ? (
        <Lista crm={crm} leads={filtrados} abrirLead={abrirLead} />
      ) : (
        <Kanban crm={crm} leads={filtrados} abrirLead={abrirLead} />
      )}
    </div>
  );
}

/* ---------------- Kanban ---------------- */

function Kanban({ crm, leads, abrirLead }: { crm: Painel; leads: Lead[]; abrirLead: (l: Lead) => void }) {
  const [sobre, setSobre] = useState<string | null>(null);
  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
      {crm.etapas.map((etapa) => {
        const daEtapa = leads.filter((l) => l.etapa_id === etapa.id);
        const total = daEtapa.reduce((s, l) => s + (l.valor || 0), 0);
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
            <header className="flex items-center justify-between gap-2 px-2 pt-1.5 pb-3">
              <h3 className="flex min-w-0 items-center gap-2 text-[13px] font-semibold">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: etapa.cor }} aria-hidden />
                <span className="truncate">{etapa.nome}</span>
              </h3>
              <span className="tabular shrink-0 rounded-full bg-pill-active/80 px-2 py-0.5 text-[11px] font-semibold dark:bg-white/10">{daEtapa.length}</span>
            </header>
            {total > 0 && <p className="tabular -mt-2 px-2 pb-2 text-xs text-muted-foreground">{formatarMoeda(total)}</p>}
            <div className="flex flex-1 flex-col gap-2">
              {daEtapa.map((lead) => (
                <article
                  key={lead.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('leadId', lead.id)}
                  className="glass-card lift group cursor-grab rounded-2xl p-3.5 active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" onClick={() => abrirLead(lead)} className="min-w-0 text-left">
                      <span className="line-clamp-2 text-[13px] font-semibold">{lead.nome}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">{lead.telefone || lead.email || 'Sem contato'}</span>
                    </button>
                    {lead.telefone && (
                      <button
                        type="button"
                        onClick={() => abrirWhatsApp(lead.telefone)}
                        aria-label={`WhatsApp de ${lead.nome}`}
                        className="grid size-7 shrink-0 place-items-center rounded-full text-positive-foreground hover:bg-positive"
                      >
                        <MessageCircle className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-muted-foreground">{lead.origem || 'Direto'}</span>
                    {(lead.valor ?? 0) > 0 && <span className="tabular shrink-0 font-semibold">{formatarMoeda(lead.valor || 0)}</span>}
                  </div>
                </article>
              ))}
              {daEtapa.length === 0 && (
                <p className="grid flex-1 place-items-center rounded-2xl border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
                  Arraste um lead para cá
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[13px]">
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
              return (
                <tr key={lead.id} className="border-b border-border/60 last:border-0">
                  <td className="max-w-[280px] px-3 py-3">
                    <button type="button" onClick={() => abrirLead(lead)} className="block max-w-full truncate font-medium hover:underline">{lead.nome}</button>
                    <span className="block truncate text-xs text-muted-foreground">{lead.telefone || lead.email || 'Sem contato'}</span>
                  </td>
                  <td className="px-3 py-3">
                    <label className="relative inline-flex items-center">
                      <span className="sr-only">Etapa de {lead.nome}</span>
                      <span className="pointer-events-none absolute left-2.5 size-2 rounded-full" style={{ backgroundColor: etapa?.cor }} aria-hidden />
                      <select
                        value={lead.etapa_id ?? ''}
                        onChange={(e) => void crm.moverLead(lead.id, e.target.value)}
                        className="h-8 appearance-none rounded-full border border-glass-border bg-pill-active/60 pr-3 pl-6 text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/25 dark:bg-white/8"
                      >
                        {crm.etapas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                      </select>
                    </label>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{lead.vendedor?.nome || '—'}</td>
                  <td className="tabular px-3 py-3 text-right">{formatarMoeda(lead.valor || 0)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {lead.telefone && (
                        <button type="button" onClick={() => abrirWhatsApp(lead.telefone)} aria-label={`WhatsApp de ${lead.nome}`} className="grid size-8 place-items-center rounded-full text-positive-foreground hover:bg-positive">
                          <MessageCircle className="size-4" />
                        </button>
                      )}
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
              <h3 className={cn('mb-3 flex items-center gap-2 text-[15px] font-semibold', g.id === 'atrasada' && 'text-destructive')}>
                {g.titulo}
                <span className="tabular rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">{g.itens.length}</span>
              </h3>
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
                        className={cn('grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors duration-150', t.concluida ? 'border-brand bg-brand text-brand-foreground' : 'border-foreground/30 hover:border-brand')}
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
