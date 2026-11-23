import { carregarMarcaApp, MARCA_PADRAO, nomeCurto } from '@/lib/app-marca';

/**
 * Manifesto do app instalável com a marca de cada empresa. O painel troca o
 * <link rel="manifest"> para esta rota depois do login; "padrao" = Dons CRM.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ empresa: string }> }) {
  const { empresa } = await params;
  const m = empresa === 'padrao' ? MARCA_PADRAO : await carregarMarcaApp(empresa);
  const base = m.id ? `/api/app/${m.id}` : '/api/app/padrao';
  const inicio = m.id ? `/painel?empresa=${m.id}` : '/login';
  const icone = (t: number) => `${base}/icone/${t}?v=${m.versao}`;

  const manifesto = {
    id: inicio,
    name: m.id ? m.nome : 'Dons CRM',
    short_name: nomeCurto(m.nome),
    description: m.id ? `CRM de vendas da ${m.nome}` : 'CRM de vendas com a marca da sua empresa',
    lang: 'pt-BR',
    start_url: inicio,
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f3ece6',
    theme_color: m.cor,
    icons: [
      { src: icone(192), sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: icone(512), sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: icone(512), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: m.id ? [
      { name: 'Hoje', short_name: 'Hoje', url: `/painel?empresa=${m.id}&secao=leads&visao=hoje`, icons: [{ src: icone(192), sizes: '192x192', type: 'image/png' }] },
      { name: 'Funil', short_name: 'Funil', url: `/painel?empresa=${m.id}&secao=leads&visao=kanban`, icons: [{ src: icone(192), sizes: '192x192', type: 'image/png' }] },
    ] : undefined,
  };

  return new Response(JSON.stringify(manifesto), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}
