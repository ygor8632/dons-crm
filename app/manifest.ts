import type { MetadataRoute } from 'next';

/** Manifesto padrão (Dons CRM). No painel, ele é trocado pelo da empresa. */
export default function manifest(): MetadataRoute.Manifest {
  const icone = (t: number) => `/api/app/padrao/icone/${t}?v=1`;
  return {
    id: '/login',
    name: 'Dons CRM',
    short_name: 'Dons CRM',
    description: 'CRM de vendas com a marca da sua empresa',
    lang: 'pt-BR',
    start_url: '/login',
    scope: '/',
    display: 'standalone',
    background_color: '#f3ece6',
    theme_color: '#da4c3c',
    icons: [
      { src: icone(192), sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: icone(512), sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: icone(512), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
