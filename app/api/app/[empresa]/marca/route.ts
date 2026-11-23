import { carregarMarcaApp } from '@/lib/app-marca';

/** Nome e cor da empresa para a tela de login aberta pelo app instalado. */
export async function GET(_req: Request, { params }: { params: Promise<{ empresa: string }> }) {
  const { empresa } = await params;
  const m = await carregarMarcaApp(empresa);
  return Response.json(m.id ? { id: m.id, nome: m.nome, cor: m.cor, versao: m.versao } : { id: null }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
