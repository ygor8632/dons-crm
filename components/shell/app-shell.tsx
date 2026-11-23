'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { MotionConfig, motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { Bell, CircleHelp, LogOut, Moon, Plus, Search, Sun, UserRound, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { estiloMarca, saudacao } from '@/lib/marca';
import { iniciais } from '@/components/glass';
import { useTema } from '@/components/theme/theme';
import { fundoDoLogo } from '@/lib/marca-logo';

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export type Visao = { id: string; label: string };
export type Secao = { id: string; label: string; icone: LucideIcon; visoes: Visao[] };
export type ItemBusca = { id: string; titulo: string; subtitulo?: string; meta?: string };
export type ItemNotificacao = { id: string; titulo: string; subtitulo?: string; tom: 'atrasada' | 'hoje' | 'info' };

type AppShellProps = {
  marca: { nome: string; logoUrl?: string | null; corFundoLogo?: string | null; cor?: string | null };
  fundoUrl?: string | null;
  usuario: { nome: string; papel: string };
  secoes: Secao[];
  secao: string;
  visao: string;
  aoNavegar: (secao: string, visao?: string) => void;
  criar: { rotulo: string; aoClicar: () => void };
  busca: { itens: ItemBusca[]; placeholder: string; aoSelecionar: (id: string) => void };
  notificacoes: { itens: ItemNotificacao[]; vazio: string; aoSelecionar?: (id: string) => void };
  aoSair: () => void;
  /** Abre "Meu perfil" (nome, e-mail, aparência) a partir do menu do usuário. */
  aoAbrirPerfil?: () => void;
  /** Central de ajuda: endereço aberto pelo botão "?" do topo. */
  ajudaHref?: string;
  /** Faixa opcional no topo do painel (ex.: aviso da demonstração). */
  aviso?: React.ReactNode;
  children: React.ReactNode;
};

/* ------------------------------------------------------------------ */
/* Navegação sincronizada com a URL (?secao=...&visao=...)             */
/* ------------------------------------------------------------------ */

const assinarUrl = (aoMudar: () => void) => {
  window.addEventListener('popstate', aoMudar);
  return () => window.removeEventListener('popstate', aoMudar);
};

export function useNavegacao(secoes: Secao[], padrao: string) {
  // A URL vem por useSyncExternalStore: no servidor (e na hidratação) vale o padrão,
  // logo depois vale a URL real, sem descompasso entre servidor e cliente.
  const buscaUrl = useSyncExternalStore(assinarUrl, () => window.location.search, () => '');
  // Depois do primeiro clique, o pedido da pessoa manda; a validação acontece no render,
  // porque as seções podem mudar (ex.: o papel do usuário carrega).
  const [pedido, setPedido] = useState<{ secao: string; visao: string } | null>(null);

  const daUrl = new URLSearchParams(buscaUrl);
  const alvo = pedido ?? { secao: daUrl.get('secao') ?? padrao, visao: daUrl.get('visao') ?? '' };
  const secaoAtual = secoes.find((s) => s.id === alvo.secao) ?? secoes.find((s) => s.id === padrao) ?? secoes[0];
  const visaoAtual = secaoAtual?.visoes.find((v) => v.id === alvo.visao)?.id ?? secaoAtual?.visoes[0]?.id ?? '';

  const navegar = useCallback(
    (secao: string, visao?: string) => {
      const s = secoes.find((x) => x.id === secao);
      if (!s) return;
      const v = visao && s.visoes.some((x) => x.id === visao) ? visao : s.visoes[0]?.id ?? '';
      setPedido({ secao, visao: v });
      const url = new URL(window.location.href);
      url.searchParams.set('secao', secao);
      if (v) url.searchParams.set('visao', v);
      else url.searchParams.delete('visao');
      window.history.replaceState(null, '', url);
    },
    [secoes],
  );

  return { secao: secaoAtual?.id ?? padrao, visao: visaoAtual, navegar };
}

/* ------------------------------------------------------------------ */
/* Utilitários                                                         */
/* ------------------------------------------------------------------ */

function useFecharFora(aberto: boolean, fechar: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const aoClicar = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) fechar();
    };
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && fechar();
    document.addEventListener('pointerdown', aoClicar);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('pointerdown', aoClicar);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto, fechar]);
  return ref;
}

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const MOLA = { type: 'spring', stiffness: 520, damping: 40, mass: 0.8 } as const;

/* ------------------------------------------------------------------ */
/* Fundo                                                               */
/* ------------------------------------------------------------------ */

function Fundo({ url }: { url?: string | null }) {
  return (
    <div className="app-bg" data-fundo={url ? 'imagem' : 'padrao'} aria-hidden>
      {url && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" />
          <div className="app-bg-scrim" />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Topo: avatar + saudação · busca · notificações                      */
/* ------------------------------------------------------------------ */

function Avatar({ marca, className }: { marca: AppShellProps['marca']; className?: string }) {
  const fundo = fundoDoLogo(marca.corFundoLogo);
  return (
    <span
      className={cn(
        'grid size-10 shrink-0 place-items-center overflow-hidden rounded-full text-sm font-bold shadow-[inset_0_0_0_1px_var(--glass-border)]',
        marca.logoUrl ? 'bg-pill-active' : 'bg-brand-solid text-brand-solid-foreground shadow-[inset_0_0_0_2px_rgb(255_255_255/0.6)]',
        className,
      )}
      style={fundo && marca.logoUrl ? { backgroundColor: fundo } : undefined}
    >
      {marca.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={marca.logoUrl} alt="" className="size-full object-contain p-1" />
      ) : (
        iniciais(marca.nome)
      )}
    </span>
  );
}

function MenuUsuario({ marca, usuario, aoSair, aoAbrirPerfil, ajudaHref }: Pick<AppShellProps, 'marca' | 'usuario' | 'aoSair' | 'aoAbrirPerfil' | 'ajudaHref'>) {
  const [aberto, setAberto] = useState(false);
  const fechar = useCallback(() => setAberto(false), []);
  const ref = useFecharFora(aberto, fechar);
  const { escuro, alternar } = useTema();
  const primeiroNome = usuario.nome.split(' ')[0];

  return (
    <div ref={ref} className="relative flex min-w-0 items-center">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        className="flex min-w-0 items-center gap-3 rounded-full py-1 pr-3 pl-1 transition-colors duration-150 hover:bg-white/30 dark:hover:bg-white/6"
      >
        <Avatar marca={marca} />
        <span className="min-w-0 text-left">
          <span className="block truncate text-[15px] font-semibold tracking-[-0.01em]">
            <span suppressHydrationWarning>{saudacao()}</span>, {primeiroNome}
          </span>
          <span className="hidden truncate text-xs text-muted-foreground sm:block">{marca.nome}</span>
        </span>
      </button>
      {aberto && (
        <div role="menu" className="glass-strong animate-pop absolute top-[calc(100%+12px)] left-0 z-50 w-64 origin-top-left rounded-2xl p-1.5">
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-semibold">{usuario.nome}</p>
            <p className="truncate text-xs text-muted-foreground">{usuario.papel} · {marca.nome}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          {aoAbrirPerfil && (
            <button role="menuitem" type="button" onClick={() => { fechar(); aoAbrirPerfil(); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] hover:bg-muted">
              <UserRound className="size-4" /> Meu perfil e nome
            </button>
          )}
          {ajudaHref && (
            <a role="menuitem" href={ajudaHref} target="_blank" rel="noopener" onClick={fechar} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] hover:bg-muted">
              <CircleHelp className="size-4" /> Central de ajuda
            </a>
          )}
          <button role="menuitem" type="button" onClick={alternar} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] hover:bg-muted">
            {escuro ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {escuro ? 'Usar tema claro' : 'Usar vidro fumê (escuro)'}
          </button>
          <button role="menuitem" type="button" onClick={aoSair} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] text-destructive hover:bg-destructive/10">
            <LogOut className="size-4" /> Sair
          </button>
        </div>
      )}
    </div>
  );
}

function Busca({ itens, placeholder, aoSelecionar, compacta }: AppShellProps['busca'] & { compacta?: boolean }) {
  const [termo, setTermo] = useState('');
  const [aberto, setAberto] = useState(false);
  const [expandida, setExpandida] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaId = useId();
  const fechar = useCallback(() => { setAberto(false); setExpandida(false); }, []);
  const ref = useFecharFora(aberto || expandida, fechar);

  const resultados = useMemo(() => {
    const t = normalizar(termo.trim());
    if (!t) return [];
    return itens.filter((i) => normalizar(`${i.titulo} ${i.subtitulo ?? ''} ${i.meta ?? ''}`).includes(t)).slice(0, 7);
  }, [itens, termo]);

  // Atalhos: "/" ou Ctrl/⌘+K focam a busca
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      const digitando = alvo.closest('input, textarea, select, [contenteditable="true"]');
      if ((e.key === '/' && !digitando) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setExpandida(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, []);

  const escolher = (id: string) => {
    aoSelecionar(id);
    setTermo('');
    fechar();
    inputRef.current?.blur();
  };

  const mostrarCampo = !compacta || expandida;

  return (
    <div ref={ref} className={cn('relative', compacta ? (expandida ? 'absolute inset-x-2 top-1/2 z-10 -translate-y-1/2' : '') : 'w-full max-w-[460px]')}>
      {!mostrarCampo && (
        <button
          type="button"
          aria-label="Buscar"
          onClick={() => { setExpandida(true); requestAnimationFrame(() => inputRef.current?.focus()); }}
          className="grid size-10 place-items-center rounded-full bg-pill-active/70 dark:bg-white/8"
        >
          <Search className="size-[18px]" />
        </button>
      )}
      {mostrarCampo && (
        <div className={cn('relative', compacta && 'animate-pop')}>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={aberto && resultados.length > 0}
            aria-controls={listaId}
            aria-activedescendant={resultados[ativo] ? `${listaId}-${ativo}` : undefined}
            aria-label={placeholder}
            value={termo}
            placeholder={placeholder}
            onChange={(e) => { setTermo(e.target.value); setAberto(true); setAtivo(0); }}
            onFocus={() => setAberto(true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setAtivo((a) => Math.min(a + 1, resultados.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((a) => Math.max(a - 1, 0)); }
              if (e.key === 'Enter' && resultados[ativo]) { e.preventDefault(); escolher(resultados[ativo].id); }
            }}
            className="h-10 w-full rounded-full border border-glass-border bg-pill-active/55 pr-12 pl-10 text-[13px] shadow-[inset_0_1px_2px_rgb(40_25_15/0.06)] placeholder:text-muted-foreground focus:bg-pill-active/85 dark:bg-white/6 dark:focus:bg-white/10"
          />
          {compacta ? (
            <button type="button" aria-label="Fechar busca" onClick={fechar} className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-full hover:bg-muted">
              <X className="size-4" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border border-border px-1.5 py-0.5 font-sans text-[10px] text-muted-foreground lg:block">/</kbd>
          )}
        </div>
      )}
      {aberto && termo.trim() && (
        <div className="glass-strong animate-pop absolute top-[calc(100%+10px)] right-0 left-0 z-50 overflow-hidden rounded-2xl p-1.5">
          {resultados.length === 0 ? (
            <p className="px-3 py-4 text-center text-[13px] text-muted-foreground">Nada encontrado para “{termo.trim()}”.</p>
          ) : (
            <ul id={listaId} role="listbox" aria-label="Resultados">
              {resultados.map((r, i) => (
                <li
                  key={r.id}
                  id={`${listaId}-${i}`}
                  role="option"
                  aria-selected={i === ativo}
                  onPointerEnter={() => setAtivo(i)}
                  onPointerDown={(e) => { e.preventDefault(); escolher(r.id); }}
                  className={cn('flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5', i === ativo && 'bg-muted')}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">{r.titulo}</span>
                    {r.subtitulo && <span className="block truncate text-xs text-muted-foreground">{r.subtitulo}</span>}
                  </span>
                  {r.meta && <span className="shrink-0 text-xs text-muted-foreground">{r.meta}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Notificacoes({ itens, vazio, aoSelecionar }: AppShellProps['notificacoes']) {
  const [aberto, setAberto] = useState(false);
  const fechar = useCallback(() => setAberto(false), []);
  const ref = useFecharFora(aberto, fechar);
  const urgentes = itens.filter((i) => i.tom !== 'info').length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-label={itens.length ? `Notificações: ${itens.length}` : 'Notificações'}
        className="relative grid size-10 place-items-center rounded-full bg-pill-active text-pill-active-foreground shadow-[0_1px_3px_rgb(40_25_15/0.12)] transition-transform duration-150 active:scale-95"
      >
        <Bell className="size-[18px]" />
        {itens.length > 0 && (
          <span className={cn('tabular absolute -top-0.5 -right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold text-white ring-2 ring-pill-active', urgentes ? 'bg-brand-solid text-brand-solid-foreground' : 'bg-foreground text-background')}>
            {itens.length > 9 ? '9+' : itens.length}
          </span>
        )}
      </button>
      {aberto && (
        <div className="glass-strong animate-pop absolute top-[calc(100%+12px)] right-0 z-50 w-[min(340px,calc(100vw-24px))] origin-top-right rounded-2xl p-1.5">
          <p className="px-3 pt-2 pb-1.5 text-[13px] font-semibold">Notificações</p>
          {itens.length === 0 ? (
            <p className="px-3 pt-2 pb-4 text-[13px] text-muted-foreground">{vazio}</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {itens.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => { aoSelecionar?.(n.id); fechar(); }}
                    className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted"
                  >
                    <span
                      className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.tom === 'atrasada' ? 'bg-destructive' : n.tom === 'hoje' ? 'bg-chart-3' : 'bg-chart-1')}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium">{n.titulo}</span>
                      {n.subtitulo && <span className="block text-xs text-muted-foreground">{n.subtitulo}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trilho vertical (desktop)                                           */
/* ------------------------------------------------------------------ */

function Trilho({ secoes, secao, aoNavegar }: Pick<AppShellProps, 'secoes' | 'secao' | 'aoNavegar'>) {
  const { escuro, alternar } = useTema();
  return (
    <nav aria-label="Seções" className="glass-pill fixed top-1/2 left-4 z-40 hidden -translate-y-1/2 flex-col items-center gap-1.5 p-1.5 md:flex">
      {secoes.map((s) => (
        <BotaoTrilho key={s.id} rotulo={s.label} ativo={s.id === secao} onClick={() => aoNavegar(s.id)}>
          <s.icone className="size-[18px]" />
        </BotaoTrilho>
      ))}
      <span className="my-1 h-px w-6 bg-border" aria-hidden />
      <BotaoTrilho rotulo={escuro ? 'Tema claro' : 'Vidro fumê'} onClick={alternar}>
        {escuro ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
      </BotaoTrilho>
    </nav>
  );
}

function BotaoTrilho({ rotulo, ativo, onClick, children }: { rotulo: string; ativo?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      aria-current={ativo ? 'page' : undefined}
      className={cn(
        'group relative grid size-11 place-items-center rounded-full transition-colors duration-150',
        ativo ? 'text-pill-active-foreground' : 'text-foreground/70 hover:bg-white/35 hover:text-foreground dark:hover:bg-white/8',
      )}
    >
      {ativo && (
        <motion.span layoutId="trilho-ativo" transition={MOLA} className="absolute inset-0 rounded-full bg-pill-active shadow-[0_2px_8px_rgb(40_25_15/0.16)]" />
      )}
      <span className="relative">{children}</span>
      <span
        role="tooltip"
        className="glass-strong pointer-events-none absolute top-1/2 left-[calc(100%+14px)] -translate-x-1 -translate-y-1/2 scale-95 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-foreground opacity-0 transition-[opacity,transform] duration-150 ease-(--ease-out) group-hover:translate-x-0 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:scale-100 group-focus-visible:opacity-100"
      >
        {rotulo}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Abas inferiores + botão "+"                                         */
/* ------------------------------------------------------------------ */

function BotaoCriar({ criar }: Pick<AppShellProps, 'criar'>) {
  return (
    <button
      type="button"
      onClick={criar.aoClicar}
      aria-label={criar.rotulo}
      title={criar.rotulo}
      className="grid size-11 shrink-0 place-items-center rounded-full bg-pill-active text-pill-active-foreground shadow-[0_2px_10px_rgb(40_25_15/0.18)] transition-transform duration-150 ease-(--ease-out) hover:scale-105 active:scale-95"
    >
      <Plus className="size-5" />
    </button>
  );
}

function AbasInferiores({ secoes, secao, visao, aoNavegar, criar }: Pick<AppShellProps, 'secoes' | 'secao' | 'visao' | 'aoNavegar' | 'criar'>) {
  const atual = secoes.find((s) => s.id === secao);
  return (
    <>
      {/* Desktop: visões da seção atual */}
      <div className="fixed bottom-5 left-1/2 z-40 hidden -translate-x-1/2 items-center gap-2 md:flex">
        <nav aria-label={`Visões de ${atual?.label ?? ''}`} className="glass-pill flex items-center gap-1 p-1.5">
          {atual?.visoes.map((v) => {
            const ativa = v.id === visao;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => aoNavegar(secao, v.id)}
                aria-current={ativa ? 'page' : undefined}
                className={cn('relative rounded-full px-5 py-2.5 text-[13px] font-medium transition-colors duration-150', ativa ? 'text-pill-active-foreground' : 'text-foreground/70 hover:text-foreground')}
              >
                {ativa && <motion.span layoutId="aba-ativa" transition={MOLA} className="absolute inset-0 rounded-full bg-pill-active shadow-[0_2px_8px_rgb(40_25_15/0.14)]" />}
                <span className="relative">{v.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="glass-pill p-1.5">
          <BotaoCriar criar={criar} />
        </div>
      </div>

      {/* Mobile: o trilho vira doca inferior com as seções */}
      <nav aria-label="Seções" className="glass-pill fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-40 flex items-center justify-between gap-1 p-1.5 md:hidden">
        {secoes.map((s) => {
          const ativa = s.id === secao;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => aoNavegar(s.id)}
              aria-label={s.label}
              aria-current={ativa ? 'page' : undefined}
              className={cn('relative grid h-11 flex-1 place-items-center rounded-full', ativa ? 'text-pill-active-foreground' : 'text-foreground/70')}
            >
              {ativa && <motion.span layoutId="doca-ativa" transition={MOLA} className="absolute inset-0 rounded-full bg-pill-active shadow-[0_2px_8px_rgb(40_25_15/0.14)]" />}
              <s.icone className="relative size-5" />
            </button>
          );
        })}
        <BotaoCriar criar={criar} />
      </nav>
    </>
  );
}

/** No celular as visões aparecem como segmentado no topo do conteúdo. */
function VisoesMobile({ secoes, secao, visao, aoNavegar }: Pick<AppShellProps, 'secoes' | 'secao' | 'visao' | 'aoNavegar'>) {
  const atual = secoes.find((s) => s.id === secao);
  if (!atual || atual.visoes.length < 2) return null;
  return (
    <div className="-mx-1 mb-5 overflow-x-auto px-1 md:hidden">
      <div role="tablist" aria-label={`Visões de ${atual.label}`} className="inline-flex rounded-full bg-muted p-1">
        {atual.visoes.map((v) => (
          <button
            key={v.id}
            role="tab"
            type="button"
            aria-selected={v.id === visao}
            onClick={() => aoNavegar(secao, v.id)}
            className={cn('rounded-full px-4 py-2 text-[13px] font-medium whitespace-nowrap', v.id === visao ? 'bg-pill-active text-pill-active-foreground shadow-sm' : 'text-muted-foreground')}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

export function AppShell(props: AppShellProps) {
  const { marca, fundoUrl, usuario, secoes, secao, visao, aoNavegar, criar, busca, notificacoes, aoSair, aoAbrirPerfil, ajudaHref, aviso, children } = props;
  const painelRef = useRef<HTMLElement>(null);

  // Ao trocar de seção, volta o painel ao topo
  useEffect(() => { painelRef.current?.scrollTo({ top: 0 }); }, [secao]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-dvh" style={estiloMarca(marca.cor)} data-fundo={fundoUrl ? 'imagem' : undefined}>
        <Fundo url={fundoUrl} />

        <header className="glass-pill fixed inset-x-3 top-3 z-40 flex h-[60px] items-center justify-between gap-3 px-2 md:inset-x-4 md:top-4">
          <MenuUsuario marca={marca} usuario={usuario} aoSair={aoSair} aoAbrirPerfil={aoAbrirPerfil} ajudaHref={ajudaHref} />
          <div className="hidden flex-1 justify-center md:flex">
            <Busca {...busca} />
          </div>
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <Busca {...busca} compacta />
            </div>
            {ajudaHref && (
              <a
                href={ajudaHref}
                target="_blank"
                rel="noopener"
                aria-label="Central de ajuda (abre em nova aba)"
                title="Ajuda"
                className="grid size-10 place-items-center rounded-full bg-pill-active text-pill-active-foreground shadow-[0_1px_3px_rgb(40_25_15/0.12)] transition-transform duration-150 active:scale-95"
              >
                <CircleHelp className="size-[18px]" />
              </a>
            )}
            <Notificacoes {...notificacoes} />
          </div>
        </header>

        <Trilho secoes={secoes} secao={secao} aoNavegar={aoNavegar} />

        <main
          ref={painelRef}
          className="glass fixed inset-x-3 top-[76px] bottom-0 z-10 overflow-y-auto rounded-t-[28px] border-b-0 md:top-[88px] md:right-4 md:left-[92px] md:rounded-t-[32px]"
        >
          <div className="mx-auto w-full max-w-[1320px] px-4 pt-6 pb-32 sm:px-6 md:px-10 md:pt-10">
            {aviso && <div className="mb-6 empty:hidden">{aviso}</div>}
            <VisoesMobile secoes={secoes} secao={secao} visao={visao} aoNavegar={aoNavegar} />
            <div key={`${secao}:${visao}`} className="animate-surge">
              {children}
            </div>
          </div>
        </main>

        <AbasInferiores secoes={secoes} secao={secao} visao={visao} aoNavegar={aoNavegar} criar={criar} />
      </div>
    </MotionConfig>
  );
}

/** Tela de carregamento no mesmo mundo visual (sem o shell inteiro). */
export function ShellCarregando({ texto }: { texto: string }) {
  return (
    <div className="relative grid min-h-dvh place-items-center">
      <Fundo />
      <div className="glass-pill flex items-center gap-3 px-5 py-3 text-[13px] font-medium" role="status">
        <span className="size-2.5 animate-pulse rounded-full bg-brand" aria-hidden />
        {texto}
      </div>
    </div>
  );
}
