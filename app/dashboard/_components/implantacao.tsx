'use client';

import { useMemo, useState } from 'react';
import { Check, CircleDashed, ClipboardCheck, Minus, Sparkles, Undo2 } from 'lucide-react';
import { CardTitle, EmptyState, GlassCard, PageHeader } from '@/components/glass';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TEMPLATES, nomeSegmento, templatePorId } from '@/lib/templates-segmento';
import { PRAZO_IMPLANTACAO, situacaoChecklist, type Dashboard, type EmpresaAdmin } from '../_lib/use-dashboard';

/** Resumo do template: etapas com chance, motivos e quantas mensagens. */
export function PreviaTemplate({ id, className }: { id: string; className?: string }) {
  const t = templatePorId(id);
  if (!t) return null;
  return (
    <div className={cn('rounded-2xl bg-pill-active/45 p-3 text-xs dark:bg-white/5', className)}>
      <p className="text-muted-foreground">{t.descricao}</p>
      <ol className="mt-2 flex flex-wrap gap-1.5" aria-label="Etapas do funil">
        {t.etapas.map((e) => (
          <li key={e.nome} className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-2 py-0.5 dark:bg-white/8">
            <span className="size-2 rounded-full" style={{ backgroundColor: e.cor }} aria-hidden />{e.nome}
            {e.probabilidade != null && e.probabilidade < 100 && <span className="tabular text-muted-foreground">{e.probabilidade}%</span>}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-muted-foreground">{t.mensagens.length} mensagens prontas · perdas: {t.motivos.join(', ')}</p>
    </div>
  );
}

export function Implantacao({ dash, visao }: { dash: Dashboard; visao: string }) {
  return visao === 'templates' ? <Templates /> : <Andamento dash={dash} />;
}

function Andamento({ dash }: { dash: Dashboard }) {
  const [filtro, setFiltro] = useState<'andamento' | 'concluidas' | 'todas'>('andamento');
  const linhas = useMemo(() => dash.empresas
    .filter((e) => e.ativo)
    .map((e) => ({ e, s: situacaoChecklist(e, dash.checklist.find((c) => c.empresa_id === e.id)) }))
    .sort((a, b) => Number(b.s.atrasado) - Number(a.s.atrasado) || a.s.feitos / a.s.total - b.s.feitos / b.s.total), [dash.empresas, dash.checklist]);
  const visiveis = linhas.filter(({ s }) => (filtro === 'todas' ? true : filtro === 'concluidas' ? s.completo : !s.completo));
  const atrasadas = linhas.filter(({ s }) => s.atrasado).length;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Implantação"
        subtitulo={`O que falta para cada cliente ficar pronto. A promessa do site é ${PRAZO_IMPLANTACAO} dias${atrasadas ? ` · ${atrasadas} ${atrasadas === 1 ? 'passou' : 'passaram'} do prazo` : ''}.`}
        acoes={
          <div className="flex rounded-full bg-muted p-1 text-[13px]" role="tablist" aria-label="Filtrar implantações">
            {([['andamento', 'Em andamento'], ['concluidas', 'Concluídas'], ['todas', 'Todas']] as const).map(([id, rotulo]) => (
              <button key={id} role="tab" aria-selected={filtro === id} type="button" onClick={() => setFiltro(id)} className={cn('h-8 rounded-full px-3 font-medium', filtro === id ? 'bg-background shadow-sm dark:bg-white/15' : 'text-muted-foreground hover:text-foreground')}>{rotulo}</button>
            ))}
          </div>
        }
      />
      {visiveis.length === 0 ? (
        <GlassCard><EmptyState icone={ClipboardCheck} titulo={filtro === 'andamento' ? 'Nenhuma implantação pendente' : 'Nada por aqui'} texto="Ao criar uma empresa, o checklist dela aparece aqui." /></GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 [&>*]:min-w-0">
          {visiveis.map(({ e, s }) => <CartaoImplantacao key={e.id} dash={dash} emp={e} s={s} />)}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Itens com <Sparkles className="inline size-3 align-[-1px]" aria-label="automático" /> são conferidos sozinhos pelo sistema. Os outros você marca depois de fazer. Planilha, equipe e site podem ser dispensados quando não se aplicam.</p>
    </div>
  );
}

function CartaoImplantacao({ dash, emp, s }: { dash: Dashboard; emp: EmpresaAdmin; s: ReturnType<typeof situacaoChecklist> }) {
  const [tpl, setTpl] = useState(emp.segmento ?? 'geral');
  const [aplicando, setAplicando] = useState(false);
  const pct = Math.round((s.feitos / s.total) * 100);

  return (
    <GlassCard className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold">{emp.nome}</h2>
          <p className="text-xs text-muted-foreground">{nomeSegmento(emp.segmento)} · {s.completo ? 'implantação concluída' : s.dia == null ? 'cliente anterior ao checklist' : `dia ${s.dia} de ${PRAZO_IMPLANTACAO}`}</p>
        </div>
        <span className={cn('tabular shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold', s.completo ? 'bg-positive text-positive-foreground' : s.atrasado ? 'bg-destructive/12 text-destructive' : 'bg-muted')}>
          {s.feitos} de {s.total}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-chart-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Implantação de ${emp.nome}`}>
        <div className={cn('h-full rounded-full', s.atrasado ? 'bg-destructive' : 'bg-brand')} style={{ width: `${pct}%` }} />
      </div>
      <ul className="space-y-1">
        {s.itens.map((i) => (
          <li key={i.id} className="flex items-start gap-2.5 rounded-xl px-1.5 py-1.5">
            <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full', i.estado === 'pendente' ? 'text-muted-foreground' : i.estado === 'dispensado' ? 'bg-muted text-muted-foreground' : 'bg-positive text-positive-foreground')} aria-hidden>
              {i.estado === 'pendente' ? <CircleDashed className="size-4" /> : i.estado === 'dispensado' ? <Minus className="size-3" /> : <Check className="size-3" strokeWidth={3} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn('text-[13px] font-medium', i.estado === 'dispensado' && 'text-muted-foreground line-through')}>
                {i.titulo} {i.auto && <Sparkles className="inline size-3 align-[-1px] text-muted-foreground" aria-label="(conferido automaticamente)" />}
              </p>
              <p className="text-xs text-muted-foreground">{i.estado === 'dispensado' ? 'Não se aplica a este cliente' : i.dica}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              {i.estado === 'pendente' && !i.auto && <Button size="xs" variant="outline" onClick={() => void dash.marcarItem(emp, i.id, 'feito')}>Feito</Button>}
              {i.estado === 'pendente' && i.podeDispensar && <Button size="xs" variant="ghost" onClick={() => void dash.marcarItem(emp, i.id, 'dispensado')}>Não se aplica</Button>}
              {(i.estado === 'manual' || i.estado === 'dispensado') && (
                <Button size="xs" variant="ghost" aria-label={`Desfazer “${i.titulo}”`} onClick={() => void dash.marcarItem(emp, i.id, null)}><Undo2 /></Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <label htmlFor={`tpl-${emp.id}`} className="text-xs text-muted-foreground">Template</label>
        <select id={`tpl-${emp.id}`} value={tpl} onChange={(e) => setTpl(e.target.value)} className="h-8 appearance-none rounded-full border border-input bg-pill-active/55 px-3 text-xs dark:bg-white/6">
          {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <Button size="xs" variant="outline" disabled={aplicando} onClick={async () => { setAplicando(true); await dash.aplicarTemplate(emp, tpl); setAplicando(false); }}>
          {aplicando ? 'Aplicando…' : 'Aplicar template'}
        </Button>
      </div>
    </GlassCard>
  );
}

function Templates() {
  return (
    <div className="space-y-6">
      <PageHeader titulo="Templates por segmento" subtitulo="O que cada cliente recebe ao ser criado: funil com chance de fechar e prazo de parado, mensagens prontas de WhatsApp e motivos de perda. O cliente ajusta tudo depois." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        {TEMPLATES.map((t) => (
          <GlassCard key={t.id} className="space-y-4">
            <CardTitle titulo={t.nome} descricao={t.descricao} />
            <ol className="space-y-1.5">
              {t.etapas.map((e, i) => (
                <li key={e.nome} className="flex items-center gap-2.5 text-[13px]">
                  <span className="tabular w-4 text-xs text-muted-foreground">{i + 1}</span>
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: e.cor }} aria-hidden />
                  <span className="flex-1 font-medium">{e.nome}</span>
                  <span className="tabular text-xs text-muted-foreground">{e.probabilidade ?? 0}%{e.dias_parado ? ` · parado em ${e.dias_parado}d` : ''}</span>
                </li>
              ))}
            </ol>
            <div>
              <p className="text-xs font-medium">Mensagens prontas</p>
              <ul className="mt-1 space-y-1">
                {t.mensagens.map((m) => (
                  <li key={m.titulo} className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{m.titulo}</span>{m.etapa != null ? ` (${t.etapas[m.etapa]?.nome})` : ''}: {m.texto}</li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Motivos de perda:</span> {t.motivos.join(', ')}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

