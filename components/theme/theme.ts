'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { CHAVE_TEMA } from './script';

// Preferência salva: 'claro' | 'escuro'. Sem preferência, segue o sistema.

function lerEscuro() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

function assinarClasse(aoMudar: () => void) {
  const obs = new MutationObserver(aoMudar);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => obs.disconnect();
}

/** Estado do tema atual (lido da classe .dark no <html>) e alternância. */
export function useTema() {
  const escuro = useSyncExternalStore(assinarClasse, lerEscuro, () => false);

  // Sem preferência salva, acompanha mudanças do sistema
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const aoMudarSistema = (e: MediaQueryListEvent) => {
      try { if (localStorage.getItem(CHAVE_TEMA)) return; } catch {}
      document.documentElement.classList.toggle('dark', e.matches);
    };
    mq.addEventListener('change', aoMudarSistema);
    return () => mq.removeEventListener('change', aoMudarSistema);
  }, []);

  const alternar = useCallback(() => {
    const proximo = !lerEscuro();
    document.documentElement.classList.toggle('dark', proximo);
    try { localStorage.setItem(CHAVE_TEMA, proximo ? 'escuro' : 'claro'); } catch {}
  }, []);

  const seguirSistema = useCallback(() => {
    try { localStorage.removeItem(CHAVE_TEMA); } catch {}
    document.documentElement.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

  return { escuro, alternar, seguirSistema };
}
