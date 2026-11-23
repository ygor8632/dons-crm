import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { Marca, botaoPrimario, botaoVidro } from '@/components/site/site';
import { CONTATO_URL } from '@/lib/contato';
import { cn } from '@/lib/utils';
import { CAPITULOS } from './conteudo';
import { AjudaBusca } from './busca';

export const metadata: Metadata = {
  title: 'Central de ajuda · Dons CRM',
  description: 'Como usar cada recurso do Dons CRM, passo a passo e com imagens: tela Hoje, Kanban, WhatsApp, relatórios, metas, importação, webhook, LGPD e app no celular.',
};

export default function Ajuda() {
  return (
    <div className="relative min-h-dvh">
      <div className="app-bg" aria-hidden />
      <a href="#conteudo" className="sr-only z-50 rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-20 focus:left-4">Pular para o conteúdo</a>
      <header className="glass-pill fixed inset-x-3 top-3 z-40 mx-auto flex h-[60px] max-w-[1200px] items-center justify-between gap-3 pr-2 pl-3 md:inset-x-6 md:top-4">
        <Marca />
        <div className="flex items-center gap-1.5">
          <Link href="/painel" className={cn(botaoVidro, 'hidden sm:inline-flex')}><ArrowLeft className="size-4" aria-hidden /> Voltar ao CRM</Link>
          <a href={CONTATO_URL} target="_blank" rel="noopener" className={botaoPrimario}><MessageCircle className="size-4" aria-hidden /> Suporte</a>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 pt-28 pb-20 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:pt-32">
        <nav aria-label="Capítulos da ajuda" className="hidden lg:block">
          <ol className="sticky top-28 space-y-1 text-[13px]">
            {CAPITULOS.map((c) => (
              <li key={c.id}>
                <a href={`#${c.id}`} className="block rounded-xl px-3 py-2 text-ink-2 hover:bg-white/40 hover:text-foreground dark:hover:bg-white/8">{c.titulo}</a>
              </li>
            ))}
          </ol>
        </nav>

        <main id="conteudo" className="min-w-0">
          <h1 className="text-[36px] leading-[1.05] font-bold tracking-[-0.03em] sm:text-[48px]">Central de ajuda</h1>
          <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-ink-2">Como usar cada recurso do CRM, passo a passo. Itens marcados como <span className="rounded-full bg-foreground/8 px-2 py-0.5 text-xs font-semibold text-foreground">Administrador</span> só aparecem para quem administra a conta.</p>
          <AjudaBusca capitulos={CAPITULOS} />

          <div className="mt-12 glass-card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Não achou o que procurava?</h2>
              <p className="text-sm text-ink-2">Fale com o suporte da Dons pelo WhatsApp. Diga o nome da empresa e, se puder, mande um print.</p>
            </div>
            <a href={CONTATO_URL} target="_blank" rel="noopener" className={cn(botaoPrimario, 'h-11 px-5')}><MessageCircle className="size-4" aria-hidden /> Falar com o suporte</a>
          </div>
        </main>
      </div>
    </div>
  );
}
