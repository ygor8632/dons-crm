'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Download, Share, SquarePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ConviteInstalacao = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
declare global {
  interface Window { __convitePWA?: ConviteInstalacao | null }
  interface Navigator { standalone?: boolean }
}

const assinar = (avisar: () => void) => {
  window.addEventListener('convite-pwa', avisar);
  const mq = window.matchMedia('(display-mode: standalone)');
  mq.addEventListener('change', avisar);
  return () => { window.removeEventListener('convite-pwa', avisar); mq.removeEventListener('change', avisar); };
};

const estado = () => {
  const instalado = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  // No iPhone só o Safari instala; nos outros navegadores do iOS o menu também tem "Adicionar à Tela de Início" (iOS 16.4+)
  return `${instalado ? 1 : 0}|${ios ? 1 : 0}|${window.__convitePWA ? 1 : 0}`;
};

/** Situação da instalação do app neste aparelho. */
export function useInstalacao() {
  const snap = useSyncExternalStore(assinar, estado, () => '0|0|0');
  const [instalado, ios, temConvite] = snap.split('|').map((x) => x === '1');
  const instalar = useCallback(async () => {
    const convite = window.__convitePWA;
    if (!convite) return false;
    await convite.prompt();
    const { outcome } = await convite.userChoice;
    window.__convitePWA = null;
    window.dispatchEvent(new Event('convite-pwa'));
    return outcome === 'accepted';
  }, []);
  return { instalado, ios, podeInstalar: temConvite, instalar };
}

/** Passo a passo do iPhone/iPad (Safari não tem botão de instalar). */
export function PassosIphone({ nome, className }: { nome: string; className?: string }) {
  const n = 'tabular mt-px grid size-5 shrink-0 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background';
  const ic = 'mx-0.5 inline size-4 -translate-y-px align-middle';
  return (
    <ol className={cn('space-y-1.5 text-[13px] leading-5', className)}>
      <li className="flex gap-2"><span className={n}>1</span><span>Toque em <Share className={ic} aria-hidden /> <span className="font-medium">Compartilhar</span>, na barra do Safari</span></li>
      <li className="flex gap-2"><span className={n}>2</span><span>Escolha <SquarePlus className={ic} aria-hidden /> <span className="font-medium">Adicionar à Tela de Início</span></span></li>
      <li className="flex gap-2"><span className={n}>3</span><span>Confirme o nome “{nome}” e toque em <span className="font-medium">Adicionar</span></span></li>
    </ol>
  );
}

const CHAVE_FECHADO = 'dons-convite-app-fechado';
const fechadoHaPouco = () => { try { return Date.now() - Number(localStorage.getItem(CHAVE_FECHADO) || 0) < 30 * 864e5; } catch { return false; } };

/**
 * Convite discreto para instalar o app, no topo do painel. Aparece no celular
 * (ou onde o navegador oferece instalação), some se o app já estiver instalado
 * e, se fechado, só volta depois de 30 dias.
 */
export function ConviteApp({ nome, icone }: { nome: string; icone?: string | null }) {
  const { instalado, ios, podeInstalar, instalar } = useInstalacao();
  const [oculto, setOculto] = useState<boolean | null>(null);
  const [passos, setPassos] = useState(false);

  // localStorage só existe no navegador: lê depois de montar para não divergir do HTML do servidor
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setOculto(fechadoHaPouco()); }, []);

  const fechar = () => {
    try { localStorage.setItem(CHAVE_FECHADO, String(Date.now())); } catch { /* sem armazenamento: só esconde agora */ }
    setOculto(true);
  };

  if (oculto !== false || instalado) return null;
  if (!podeInstalar && !ios) return null;

  return (
    <div role="region" aria-label="Instalar o app" className="glass-strong flex flex-col gap-3 rounded-[22px] p-3.5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {icone ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icone} alt="" width={40} height={40} className="size-10 shrink-0 rounded-[10px] shadow-sm" />
        ) : (
          <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-brand-solid text-brand-solid-foreground" aria-hidden><Download className="size-4" /></span>
        )}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">Tenha o {nome} na tela inicial</p>
          <p className="text-xs text-muted-foreground">Abre direto no CRM, em tela cheia, com o ícone da sua empresa.</p>
        </div>
      </div>
      {passos && ios && <PassosIphone nome={nome} className="sm:hidden" />}
      <div className="flex shrink-0 items-center gap-1.5">
        {podeInstalar ? (
          <Button size="sm" onClick={() => void instalar()}><Download /> Instalar app</Button>
        ) : (
          <Button size="sm" variant="outline" aria-expanded={passos} onClick={() => setPassos((v) => !v)}>{passos ? 'Entendi' : 'Como instalar'}</Button>
        )}
        <button type="button" onClick={fechar} aria-label="Fechar convite para instalar o app" className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-pill-active hover:text-foreground dark:hover:bg-white/10">
          <X className="size-4" />
        </button>
      </div>
      {passos && ios && <PassosIphone nome={nome} className="hidden sm:block" />}
    </div>
  );
}

/**
 * Troca o manifesto, o ícone do iPhone, o título e a cor da barra para os da
 * empresa logada: é o que o celular usa ao instalar o app.
 */
export function MarcaDoApp({ empresaId, nome, cor, versao }: { empresaId: string; nome: string; cor?: string | null; versao: string }) {
  useEffect(() => {
    const garantir = (seletor: string, criar: () => HTMLElement) => (document.head.querySelector(seletor) as HTMLElement | null) ?? document.head.appendChild(criar());
    const link = (rel: string) => () => Object.assign(document.createElement('link'), { rel });
    const meta = (name: string) => () => Object.assign(document.createElement('meta'), { name });

    const manifesto = garantir('link[rel="manifest"]', link('manifest')) as HTMLLinkElement;
    const manifestoAntes = manifesto.href;
    manifesto.href = `/api/app/${empresaId}/manifest?v=${versao}`;

    const toque = garantir('link[rel="apple-touch-icon"]', link('apple-touch-icon')) as HTMLLinkElement;
    const toqueAntes = toque.href;
    toque.href = `/api/app/${empresaId}/icone/180?v=${versao}`;

    const titulo = garantir('meta[name="apple-mobile-web-app-title"]', meta('apple-mobile-web-app-title')) as HTMLMetaElement;
    const tituloAntes = titulo.content;
    titulo.content = nome;

    const tema = garantir('meta[name="theme-color"]', meta('theme-color')) as HTMLMetaElement;
    const temaAntes = tema.content;
    if (cor) tema.content = cor;

    // Lembra a empresa: o login aberto pelo app mostra a marca dela
    try { localStorage.setItem('dons-empresa-app', empresaId); } catch { /* opcional */ }

    return () => { manifesto.href = manifestoAntes; toque.href = toqueAntes; titulo.content = tituloAntes; tema.content = temaAntes; };
  }, [empresaId, nome, cor, versao]);
  return null;
}
