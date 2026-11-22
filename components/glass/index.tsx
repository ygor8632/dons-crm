import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Card de vidro dentro do painel. Sem blur próprio: o painel já desfoca o fundo. */
export function GlassCard({ className, lift, ...props }: React.ComponentProps<'div'> & { lift?: boolean }) {
  return <div className={cn('glass-card p-5', lift && 'lift', className)} {...props} />;
}

export function CardTitle({ titulo, descricao, acao, className }: { titulo: string; descricao?: string; acao?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{titulo}</h3>
        {descricao && <p className="mt-0.5 text-xs text-muted-foreground">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}

/** Chip de variação: verde para alta, rosa para queda. */
export function DeltaChip({ valor, className }: { valor: number; className?: string }) {
  const positivo = valor >= 0;
  const Icone = positivo ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        'tabular inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
        positivo ? 'bg-positive text-positive-foreground' : 'bg-negative text-negative-foreground',
        className,
      )}
    >
      <Icone className="size-3" aria-hidden />
      {positivo ? '+' : '−'}
      {Math.abs(valor).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%
      <span className="sr-only">{positivo ? 'de alta' : 'de queda'}</span>
    </span>
  );
}

type StatCardProps = {
  rotulo: string;
  valor: React.ReactNode;
  icone: LucideIcon;
  delta?: number | null;
  legenda?: string;
  destaque?: boolean;
  className?: string;
};

/** Card KPI: rótulo + ícone no canto, valor grande, chip e legenda. */
export function StatCard({ rotulo, valor, icone: Icone, delta, legenda, destaque, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'lift flex min-h-[132px] min-w-0 flex-col justify-between rounded-[22px] p-4 sm:min-h-[148px] sm:p-5',
        destaque
          ? 'border border-white/30 bg-linear-to-br from-emerald-from to-emerald-to text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_16px_32px_-16px_rgb(19_119_91/0.6)]'
          : 'glass-card',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn('text-[13px] font-medium', destaque ? 'text-white/90' : 'text-muted-foreground')}>{rotulo}</span>
        <span
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-full',
            destaque ? 'bg-white/20 text-white' : 'bg-pill-active/80 text-foreground dark:bg-white/10',
          )}
          aria-hidden
        >
          <Icone className="size-4" />
        </span>
      </div>
      <div>
        <div className="tabular mt-3 truncate text-[22px] leading-none font-bold tracking-[-0.02em] sm:text-[28px] md:text-[32px]">{valor}</div>
        {(delta != null || legenda) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {delta != null && (
              <DeltaChip valor={delta} className={destaque ? 'bg-white/20 text-white' : undefined} />
            )}
            {legenda && <span className={destaque ? 'text-white/85' : 'text-muted-foreground'}>{legenda}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/** Título de página grande, subtítulo esmaecido e ações à direita. */
export function PageHeader({ titulo, subtitulo, acoes }: { titulo: string; subtitulo?: string; acoes?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[28px] leading-tight font-bold tracking-[-0.025em] text-balance md:text-[38px]">{titulo}</h1>
        {subtitulo && <p className="mt-1.5 text-sm text-muted-foreground">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex shrink-0 flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

/** Seletor segmentado (Esta semana / Este mês / Este ano). */
export function Segmented<T extends string>({
  opcoes,
  valor,
  aoMudar,
  rotulo,
  className,
}: {
  opcoes: { id: T; label: string }[];
  valor: T;
  aoMudar: (v: T) => void;
  rotulo: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={rotulo} className={cn('inline-flex rounded-full bg-muted p-1', className)}>
      {opcoes.map((o) => (
        <button
          key={o.id}
          role="tab"
          type="button"
          aria-selected={valor === o.id}
          onClick={() => aoMudar(o.id)}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-150',
            valor === o.id
              ? 'bg-pill-active text-pill-active-foreground shadow-[0_1px_3px_rgb(40_25_15/0.12)]'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Estado vazio que ensina o próximo passo. */
export function EmptyState({ icone: Icone, titulo, texto, acao }: { icone: LucideIcon; titulo: string; texto: string; acao?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-3 grid size-12 place-items-center rounded-full bg-pill-active/70 dark:bg-white/8" aria-hidden>
        <Icone className="size-5 text-muted-foreground" />
      </span>
      <p className="text-sm font-semibold">{titulo}</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{texto}</p>
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}

/** Toggle estilo iOS. */
export function Toggle({ ativo, aoMudar, rotulo, disabled }: { ativo: boolean; aoMudar: (v: boolean) => void; rotulo: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ativo}
      aria-label={rotulo}
      disabled={disabled}
      onClick={() => aoMudar(!ativo)}
      className={cn(
        'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50',
        ativo ? 'bg-brand' : 'bg-chart-muted',
      )}
    >
      <span
        className={cn(
          'inline-block size-5 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-transform duration-200 ease-(--ease-out)',
          ativo ? 'translate-x-[18px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

/** Iniciais para avatares sem imagem. */
export function iniciais(nome?: string | null) {
  if (!nome) return '?';
  const partes = nome.trim().split(/[\s@._-]+/).filter(Boolean);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[1][0] : partes[0]?.[1] ?? '')).toUpperCase();
}
