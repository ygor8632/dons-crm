// Sem 'use client': importado pelo layout (servidor) para injetar no <head>.
export const CHAVE_TEMA = 'dons-tema';

/** Executado antes da pintura para evitar o "flash" do tema errado. */
export const scriptTema = `(function(){try{var t=localStorage.getItem('${CHAVE_TEMA}');var d=t?t==='escuro':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;
