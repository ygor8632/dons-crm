'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Imagens de identidade visual no bucket privado `marca` (pasta = id da empresa).
 * No banco guardamos o caminho do objeto; URLs http(s) antigas continuam valendo.
 */
export const BUCKET_MARCA = 'marca';
export type TipoImagem = 'logo' | 'fundo';

const VALIDADE_LINK = 60 * 60 * 24; // 24 h
const LIMITE_BUCKET = 5 * 1024 * 1024;
const LIMITE_ENTRADA = 20 * 1024 * 1024;
const CONFIG: Record<TipoImagem, { lado: number; qualidade: number }> = {
  logo: { lado: 512, qualidade: 0.9 },
  fundo: { lado: 2400, qualidade: 0.82 },
};

export const ehUrl = (v?: string | null) => !!v && /^https?:\/\//i.test(v);
export const ehCaminho = (v?: string | null) => !!v && !ehUrl(v);

/** Converte logo/fundo do banco em URLs exibíveis (links assinados para caminhos). */
export async function resolverImagens(supabase: SupabaseClient, valores: (string | null | undefined)[]) {
  const caminhos = valores.filter(ehCaminho) as string[];
  const assinados = new Map<string, string>();
  if (caminhos.length) {
    const { data } = await supabase.storage.from(BUCKET_MARCA).createSignedUrls(caminhos, VALIDADE_LINK);
    data?.forEach((d) => { if (d.path && d.signedUrl) assinados.set(d.path, d.signedUrl); });
  }
  return valores.map((v) => (!v ? null : ehUrl(v) ? v : assinados.get(v) ?? null));
}

function carregarImagem(arquivo: File) {
  return new Promise<HTMLImageElement>((ok, falha) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(url); falha(new Error('Não foi possível ler essa imagem. Use PNG, JPEG ou WebP.')); };
    img.src = url;
  });
}

/** Reduz para o tamanho de uso e converte para WebP (mantém transparência do logo). */
export async function prepararImagem(arquivo: File, tipo: TipoImagem): Promise<Blob> {
  if (!arquivo.type.startsWith('image/') || arquivo.type === 'image/svg+xml') {
    throw new Error('Envie uma imagem PNG, JPEG ou WebP.');
  }
  if (arquivo.size > LIMITE_ENTRADA) throw new Error('A imagem passa de 20 MB. Escolha um arquivo menor.');

  const img = await carregarImagem(arquivo);
  const { lado, qualidade } = CONFIG[tipo];
  const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Seu navegador não conseguiu processar a imagem.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  for (let q = qualidade; q >= 0.5; q -= 0.1) {
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/webp', q));
    if (!blob) break;
    if (blob.size <= LIMITE_BUCKET) return blob;
  }
  throw new Error('Mesmo comprimida, a imagem passou de 5 MB.');
}

/** Envia a imagem para marca/<empresa>/<tipo>-<data>.webp e devolve o caminho. */
export async function enviarImagem(supabase: SupabaseClient, empresaId: string, tipo: TipoImagem, arquivo: File) {
  const blob = await prepararImagem(arquivo, tipo);
  const caminho = `${empresaId}/${tipo}-${Date.now()}.webp`;
  const { error } = await supabase.storage.from(BUCKET_MARCA).upload(caminho, blob, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
  if (error) throw new Error('O envio foi recusado. Confira se você é administrador desta empresa.');
  return caminho;
}

/** Apaga um objeto antigo do bucket (ignora URLs externas e falhas silenciosamente). */
export async function apagarImagem(supabase: SupabaseClient, valor?: string | null) {
  if (!ehCaminho(valor)) return;
  await supabase.storage.from(BUCKET_MARCA).remove([valor!]);
}
