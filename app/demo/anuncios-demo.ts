'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { Anuncios, ContaMeta, LeadMeta } from '../painel/_lib/anuncios';

/* Anúncios da Meta na demonstração: Página conectada e alguns leads recebidos dos formulários. */

const min = (m: number) => new Date(Date.now() - m * 60e3).toISOString();

const CONTA: ContaMeta = {
  id: 'meta-demo', empresa_id: 'demo', page_id: '100000000000777', page_nome: 'Studio Fit', verify_token: 'f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1',
  status: 'conectado', status_detalhe: null, ultimo_evento_em: min(18), created_at: min(60 * 24 * 30),
};

const RECEBIDOS: LeadMeta[] = [
  { id: 'ml1', leadgen_id: '1', formulario: 'Aula experimental grátis', campanha: 'Black Friday 2026', anuncio: 'Vídeo depoimento', lead_id: 'l1', resultado: 'criado', erro: null, recebido_em: min(18) },
  { id: 'ml2', leadgen_id: '2', formulario: 'Aula experimental grátis', campanha: 'Black Friday 2026', anuncio: 'Carrossel planos', lead_id: 'l13', resultado: 'criado', erro: null, recebido_em: min(140) },
  { id: 'ml3', leadgen_id: '3', formulario: 'Plano empresarial', campanha: 'Empresas Brasília', anuncio: 'Imagem academia', lead_id: 'l2', resultado: 'duplicado', erro: null, recebido_em: min(60 * 26) },
  { id: 'ml4', leadgen_id: '4', formulario: 'Aula experimental grátis', campanha: 'Black Friday 2026', anuncio: 'Vídeo depoimento', lead_id: 'l9', resultado: 'criado', erro: null, recebido_em: min(60 * 50) },
];

export function useAnunciosDemo(): Anuncios {
  const [conta, setConta] = useState<ContaMeta | null>(CONTA);
  const aviso = () => toast('Na demonstração nada é salvo', { description: 'No seu CRM, o token fica guardado em um cofre criptografado.' });

  const conectar = useCallback(async () => { setConta(CONTA); aviso(); return true; }, []);
  const testar = useCallback(async () => ({ ok: true, pagina: 'Studio Fit' }), []);
  const sincronizar = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 400));
    return { formularios: 2, criado: 0, duplicado: 0, ja_recebido: 4, erro: 0 };
  }, []);
  const desconectar = useCallback(async () => { setConta(null); toast.success('Anúncios desconectados (demonstração).'); return true; }, []);

  return {
    carregando: false, conta, recebidos: conta ? RECEBIDOS : [], webhookUrl: 'https://seu-projeto.supabase.co/functions/v1/meta-leads',
    podeReaproveitarSegredo: true, conectar, testar, sincronizar, desconectar, recarregar: async () => {},
  };
}
