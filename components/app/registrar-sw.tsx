'use client';

import { useEffect } from 'react';

/** Registra o service worker (só em HTTPS ou localhost, e fora do modo dev). */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    const registrar = () => { navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {}); };
    if (document.readyState === 'complete') registrar();
    else window.addEventListener('load', registrar, { once: true });
  }, []);
  return null;
}
