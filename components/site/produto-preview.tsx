import { CalendarClock, Inbox, LayoutDashboard, Plug, Settings, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Prévia estática do painel real (mesmos tokens e materiais), usada na home e no login.
 * É uma figura: o leitor de tela recebe uma descrição única, não cada número.
 */
const barras = [38, 52, 44, 63, 58, 86];
const colunas = [
  { nome: 'Aguardando contato', cor: 'var(--chart-3)', leads: [['Clínica Vida Plena', 'R$ 4.500'], ['Pet Shop Patas', 'R$ 900']] },
  { nome: 'Em atendimento', cor: 'var(--chart-1)', leads: [['Construtora Horizonte', 'R$ 18.000'], ['Auto Peças Rodovia', 'R$ 7.800']] },
  { nome: 'Venda concluída', cor: 'var(--chart-5)', leads: [['Ótica Visão Clara', 'R$ 3.100']] },
];

export function ProdutoPreview({ className, variante = 'resumo' }: { className?: string; variante?: 'resumo' | 'kanban' }) {
  return (
    <div
      role="img"
      aria-label={variante === 'kanban'
        ? 'Painel do Dons CRM na visão Kanban: leads em colunas por etapa do funil, com valor de cada negócio.'
        : 'Painel do Dons CRM: saudação no topo, valor em pipeline, leads do mês, gráfico de leads por mês e o funil em colunas.'}
      className={cn('relative isolate overflow-hidden rounded-[28px] border border-glass-border bg-[var(--bg-base)] p-3 shadow-[0_40px_80px_-40px_rgb(40_25_15/0.55)] select-none', className)}
    >
      <div className="app-bg !absolute" aria-hidden />
      {/* topo */}
      <div className="glass-pill relative flex items-center justify-between px-2 py-1.5">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-full bg-brand text-[9px] font-bold text-brand-foreground">DT</span>
          <span className="text-[11px] font-semibold">Bom dia, Marina</span>
        </div>
        <span className="hidden h-6 w-1/3 rounded-full bg-pill-active/60 sm:block dark:bg-white/8" />
        <span className="size-6 rounded-full bg-pill-active" />
      </div>
      <div className="relative mt-3 flex gap-3">
        {/* trilho */}
        <div className="glass-pill hidden flex-col items-center gap-1 self-center p-1 sm:flex">
          {[LayoutDashboard, Inbox, Users, Plug, Settings].map((I, i) => (
            <span key={i} className={cn('grid size-7 place-items-center rounded-full', i === (variante === 'kanban' ? 1 : 0) ? 'bg-pill-active text-pill-active-foreground' : 'text-foreground/60')}>
              <I className="size-3.5" />
            </span>
          ))}
        </div>
        {/* painel */}
        <div className="glass min-w-0 flex-1 rounded-[20px] p-3 sm:p-4">
          {variante === 'resumo' ? (
            <>
              <p className="text-[15px] font-bold tracking-[-0.02em] sm:text-lg">Seu funil hoje, Marina</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-2xl bg-linear-to-br from-emerald-from to-emerald-to p-2.5 text-white">
                  <p className="text-[9px]">Valor em pipeline</p>
                  <p className="tabular mt-2 text-sm font-bold sm:text-base">R$ 112 mil</p>
                </div>
                {[['Leads no mês', '38'], ['Vendas', '9'], ['Conversão', '21%']].map(([r, v]) => (
                  <div key={r} className="glass-card rounded-2xl p-2.5">
                    <p className="text-[9px] text-muted-foreground">{r}</p>
                    <p className="tabular mt-2 text-sm font-bold sm:text-base">{v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-5">
                <div className="glass-card rounded-2xl p-2.5 sm:col-span-2">
                  <p className="text-[9px] font-semibold">Leads por mês</p>
                  <div className="mt-2 flex h-16 items-end gap-1.5">
                    {barras.map((h, i) => (
                      <span key={i} className={cn('flex-1 rounded-md', i === barras.length - 1 ? 'hatch text-brand' : 'bg-foreground/80')} style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
                <div className="hidden gap-1.5 sm:col-span-3 sm:grid sm:grid-cols-3">
                  {colunas.map((c) => (
                    <div key={c.nome} className="rounded-xl bg-muted p-1.5">
                      <p className="flex items-center gap-1 truncate text-[8px] font-semibold"><span className="size-1.5 shrink-0 rounded-full" style={{ background: c.cor }} />{c.nome}</p>
                      {c.leads.map(([n]) => <div key={n} className="glass-card mt-1 truncate rounded-lg px-1.5 py-1 text-[8px]">{n}</div>)}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-bold tracking-[-0.02em] sm:text-lg">Leads</p>
                <span className="rounded-full bg-primary px-2.5 py-1 text-[9px] font-medium text-primary-foreground">Novo lead</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {colunas.map((c) => (
                  <div key={c.nome} className="min-w-0 rounded-2xl bg-muted p-2">
                    <p className="flex items-center gap-1.5 truncate text-[10px] font-semibold"><span className="size-2 shrink-0 rounded-full" style={{ background: c.cor }} />{c.nome}</p>
                    {c.leads.map(([n, v]) => (
                      <div key={n} className="glass-card mt-1.5 rounded-xl p-2">
                        <p className="truncate text-[10px] font-semibold">{n}</p>
                        <p className="tabular mt-1 text-[9px] text-muted-foreground">{v}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="glass-card mt-2 flex items-center gap-2 rounded-xl p-2 text-[9px]">
                <CalendarClock className="size-3 shrink-0 text-destructive" />
                <span className="truncate"><b className="font-semibold">Ligar para confirmar proposta</b> · hoje, 14:00</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
