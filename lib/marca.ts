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

/**
 * "R$ 112,2 mil", "R$ 1,5 mi". Feita à mão porque a notação compacta do Intl
 * muda entre Node e navegador ("140 mil" × "140,0 mil") e quebra a hidratação.
 */
export function formatarMoedaCurta(valor: number) {
  const abs = Math.abs(valor);
  const [div, sufixo] = abs >= 1e9 ? [1e9, ' bi'] : abs >= 1e6 ? [1e6, ' mi'] : abs >= 1e3 ? [1e3, ' mil'] : [1, ''];
  const n = Math.round((valor / div) * 10) / 10;
  const texto = n.toFixed(Number.isInteger(n) ? 0 : 1).replace('.', ',');
  return `R$ ${texto}${sufixo}`;
}
