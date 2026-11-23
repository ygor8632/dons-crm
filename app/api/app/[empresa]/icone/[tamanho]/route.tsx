import { ImageResponse } from 'next/og';
import { carregarMarcaApp, iniciais, MARCA_PADRAO } from '@/lib/app-marca';
import { corSolida } from '@/lib/marca';

const TAMANHOS = new Set([180, 192, 512]);

/**
 * Ícone do app (PNG). Usa o ícone gerado do logo da empresa; sem ele, desenha as
 * iniciais na cor da marca. Fundo cheio e margem de segurança: serve como
 * "maskable" no Android e como apple-touch-icon no iPhone.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ empresa: string; tamanho: string }> }) {
  const { empresa, tamanho } = await params;
  const lado = TAMANHOS.has(Number(tamanho)) ? Number(tamanho) : 192;
  const m = empresa === 'padrao' ? MARCA_PADRAO : await carregarMarcaApp(empresa, true);
  const cabecalhos = { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' };

  if (m.icone) {
    return new ImageResponse(
      // eslint-disable-next-line @next/next/no-img-element
      <img src={m.icone} width={lado} height={lado} alt="" />,
      { width: lado, height: lado, headers: cabecalhos },
    );
  }

  const { fundo, texto } = corSolida(m.cor);
  const sigla = m.id ? iniciais(m.nome) : 'D';
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: fundo, color: texto, fontSize: lado * (sigla.length > 1 ? 0.36 : 0.46), fontWeight: 700, letterSpacing: lado * 0.01, WebkitTextStroke: `${Math.max(1, Math.round(lado * 0.014))}px ${texto}` }}>
        {sigla}
      </div>
    ),
    { width: lado, height: lado, headers: cabecalhos },
  );
}
