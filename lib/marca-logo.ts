'use client';

/**
 * Fundo do logo. Logos com transparência somem sobre o vidro dependendo das
 * cores (logo escuro no tema escuro, logo branco no tema claro). Aqui o logo
 * é analisado e ganha uma "placa" branca ou escura com contraste.
 *
 * Valores de empresas.cor_fundo_logo:
 *  - 'transparent' (padrão do banco) = ainda não decidido → o painel decide sozinho;
 *  - 'none' = o admin escolheu "Sem fundo";
 *  - '#rrggbb' = cor da placa.
 */
export const FUNDO_CLARO = '#ffffff';
export const FUNDO_ESCURO = '#1b1716';

export type AnaliseLogo = { transparente: boolean; luminancia: number; sugestao: string | null };

const lin = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const luminanciaRgb = (r: number, g: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contraste = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

function carregar(url: string) {
  return new Promise<HTMLImageElement>((ok, falha) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => ok(img);
    img.onerror = () => falha(new Error('Não foi possível ler o logo.'));
    img.src = url;
  });
}

/** Mede transparência e o brilho dos pixels visíveis; sugere a placa de maior contraste. */
export async function analisarLogo(url: string): Promise<AnaliseLogo> {
  const img = await carregar(url);
  const lado = 96;
  const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * escala)), h = Math.max(1, Math.round(img.naturalHeight * escala));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Sem canvas.');
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  let transparentes = 0, pesos = 0, somaLum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255;
    if (a < 0.5) { transparentes++; continue; }
    somaLum += luminanciaRgb(data[i], data[i + 1], data[i + 2]) * a;
    pesos += a;
  }
  const total = data.length / 4;
  const transparente = transparentes / total > 0.05;
  const luminancia = pesos ? somaLum / pesos : 0.5;
  if (!transparente) return { transparente, luminancia, sugestao: null };
  const sobreClaro = contraste(luminancia, 1);
  const sobreEscuro = contraste(luminancia, luminanciaRgb(0x1b, 0x17, 0x16));
  return { transparente, luminancia, sugestao: sobreClaro >= sobreEscuro ? FUNDO_CLARO : FUNDO_ESCURO };
}

/** Cor de fundo a aplicar atrás do logo (undefined = sem placa). */
export function fundoDoLogo(valor?: string | null) {
  return valor && valor !== 'transparent' && valor !== 'none' ? valor : undefined;
}
