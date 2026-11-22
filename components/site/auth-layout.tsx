import { Marca } from './site';
import { ProdutoPreview } from './produto-preview';

/** Layout das telas de acesso: formulário em vidro à esquerda, prévia do painel à direita (desktop). */
export function AuthLayout({ titulo, subtitulo, children, rodape }: { titulo: string; subtitulo: string; children: React.ReactNode; rodape?: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh">
      <div className="app-bg" aria-hidden />
      <div className="mx-auto grid min-h-dvh w-full max-w-[1200px] items-center gap-12 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <main className="mx-auto w-full max-w-[440px] lg:mx-0">
          <div className="glass-strong entra rounded-[32px] p-6 sm:p-8">
            <Marca />
            <h1 className="mt-8 text-[28px] leading-tight font-bold tracking-[-0.025em]">{titulo}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{subtitulo}</p>
            <div className="mt-7">{children}</div>
          </div>
          {rodape && <div className="entra mt-5 px-2 text-center text-[13px] text-ink-2" style={{ ['--i' as string]: 2 }}>{rodape}</div>}
        </main>
        <aside aria-label="Prévia do painel" className="entra hidden lg:block" style={{ ['--i' as string]: 1 }}>
          <ProdutoPreview />
        </aside>
      </div>
    </div>
  );
}

/** Mensagem de erro do formulário, anunciada ao leitor de tela. */
export function AvisoErro({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-2xl bg-negative px-4 py-3 text-[13px] font-medium text-negative-foreground">{children}</p>
  );
}
