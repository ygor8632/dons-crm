'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { BUCKET_MARCA } from '@/lib/marca-storage';

export const ARQUIVO_ICONE = 'icone-app.png';

/**
 * Desenha o ícone do app (512×512, PNG) a partir do logo: fundo cheio e o logo
 * dentro da zona segura central (60%), para não ser cortado pelas máscaras do
 * Android nem pelos cantos arredondados do iPhone.
 */
export async function desenharIconeApp(logoUrl: string, fundo?: string | null): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((ok, falha) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => ok(i);
    i.onerror = () => falha(new Error('Não foi possível ler o logo para criar o ícone.'));
    i.src = logoUrl;
  });
  const L = 512;
  const canvas = document.createElement('canvas');
  canvas.width = L; canvas.height = L;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Seu navegador não conseguiu criar o ícone.');
  ctx.fillStyle = fundo && fundo !== 'transparent' && fundo !== 'none' ? fundo : '#ffffff';
  ctx.fillRect(0, 0, L, L);
  const area = L * 0.6;
  const escala = Math.min(area / img.naturalWidth, area / img.naturalHeight);
  const w = img.naturalWidth * escala, h = img.naturalHeight * escala;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (L - w) / 2, (L - h) / 2, w, h);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'));
  if (!blob) throw new Error('Seu navegador não conseguiu criar o ícone.');
  return blob;
}

export async function enviarIconeApp(supabase: SupabaseClient, empresaId: string, blob: Blob) {
  const { error } = await supabase.storage.from(BUCKET_MARCA).upload(`${empresaId}/${ARQUIVO_ICONE}`, blob, { contentType: 'image/png', cacheControl: '60', upsert: true });
  if (error) throw new Error('O ícone do app não foi salvo.');
}

export async function removerIconeApp(supabase: SupabaseClient, empresaId: string) {
  await supabase.storage.from(BUCKET_MARCA).remove([`${empresaId}/${ARQUIVO_ICONE}`]);
}
