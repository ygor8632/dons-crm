import type { CSSProperties } from 'react';

export const COR_PADRAO = '#da4c3c';

export function hexValido(cor?: string | null): cor is string {
  return !!cor && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(cor.trim());
}

function canal(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminancia(hex: string) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Texto sobre a cor da marca: branco ou quase preto, o que tiver mais contraste. */
export function corTextoSobre(hex: string) {
  const l = luminancia(hex);
  const contrasteBranco = 1.05 / (l + 0.05);
  const contrastePreto = (l + 0.05) / (luminancia('#1b1716') + 0.05);
  return contrasteBranco >= contrastePreto ? '#ffffff' : '#1b1716';
}

/** Variáveis CSS da empresa: a cor dela substitui o coral da referência. */
export function estiloMarca(cor?: string | null): CSSProperties {
  const brand = hexValido(cor) ? cor.trim() : COR_PADRAO;
  return { '--brand': brand, '--brand-foreground': corTextoSobre(brand) } as CSSProperties;
}

export function saudacao(data = new Date()) {
  const h = data.getHours();
  if (h < 5) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: valor % 1 ? 2 : 0 }).format(valor);

export const formatarMoedaCurta = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(valor);
