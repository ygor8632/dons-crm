import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CONTATO_URL } from '@/lib/contato';

/** Marca do Dons CRM: o "D" num círculo da cor da marca + o nome. */
export function Marca({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2.5 rounded-full outline-offset-4', className)}>
      <span className="grid size-9 place-items-center rounded-full bg-brand-solid text-sm font-bold text-brand-solid-foreground shadow-[inset_0_0_0_2px_rgb(255_255_255/0.55)]" aria-hidden>D</span>
      <span className="text-[15px] font-semibold tracking-[-0.01em]">Dons CRM</span>
    </Link>
  );
}

const linkBotao =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-medium whitespace-nowrap [transition:transform_160ms_var(--ease-out),background-color_160ms_var(--ease-out)] hover:-translate-y-px active:scale-[0.97]';
export const botaoPrimario = cn(linkBotao, 'bg-primary text-primary-foreground hover:bg-primary/85');
export const botaoVidro = cn(linkBotao, 'border border-glass-border bg-pill-active/70 text-foreground shadow-[inset_0_1px_0_var(--glass-edge)] hover:bg-pill-active dark:bg-white/8 dark:hover:bg-white/14');

export function SiteNav() {
  return (
    <header className="glass-pill fixed inset-x-3 top-3 z-40 mx-auto flex h-[60px] max-w-[1200px] items-center justify-between gap-3 pr-2 pl-3 md:inset-x-6 md:top-4">
      <Marca />
      <nav aria-label="Seções da página" className="hidden items-center gap-1 text-[13px] lg:flex">
        {[['#painel', 'Painel'], ['#webhook', 'Captação'], ['#marca', 'Sua marca'], ['#garantias', 'Garantias'], ['#perguntas', 'Perguntas']].map(([href, rotulo]) => (
          <a key={href} href={href} className="rounded-full px-3 py-2 text-foreground/75 transition-colors duration-150 hover:bg-white/35 hover:text-foreground dark:hover:bg-white/8">{rotulo}</a>
        ))}
      </nav>
      <div className="flex items-center gap-1.5">
        <Link href="/login" className={cn(linkBotao, 'text-foreground/80 hover:bg-white/35 hover:text-foreground dark:hover:bg-white/8')}>Entrar</Link>
        <Link href="/demo" className={cn(botaoPrimario, 'hidden sm:inline-flex')}>Experimente agora</Link>
      </div>
    </header>
  );
}

export function SiteRodape() {
  return (
    <footer className="mx-auto flex max-w-[1200px] flex-col gap-4 px-6 pt-6 pb-10 text-[13px] text-ink-2 sm:flex-row sm:items-center sm:justify-between">
      <span>© 2026 Dons CRM</span>
      <nav aria-label="Rodapé" className="flex flex-wrap gap-x-5 gap-y-2">
        <Link href="/demo" className="inline-block py-2 underline-offset-4 hover:text-foreground hover:underline">Experimente sem cadastro</Link>
        <Link href="/login" className="inline-block py-2 underline-offset-4 hover:text-foreground hover:underline">Área do cliente</Link>
        <a href={CONTATO_URL} target="_blank" rel="noopener" className="inline-block py-2 underline-offset-4 hover:text-foreground hover:underline">Falar com um consultor</a>
      </nav>
    </footer>
  );
}
