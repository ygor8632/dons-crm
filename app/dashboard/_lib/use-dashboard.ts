'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';

export type EmpresaAdmin = {
  id: string;
  nome: string;
  email?: string | null;
  plano?: string | null;
  ativo: boolean;
  valido_ate?: string | null;
  cor_primaria?: string | null;
  created_at: string;
};

export const PLANOS = [
  { id: 'trial', label: 'Trial' },
  { id: 'basico', label: 'Básico' },
  { id: 'pro', label: 'Pro' },
  { id: 'enterprise', label: 'Enterprise' },
] as const;

export const rotuloPlano = (p?: string | null) => PLANOS.find((x) => x.id === p)?.label ?? (p || '—');

/** Dias até a validade (negativo = vencido; null = vitalício). */
export function diasParaVencer(valido_ate?: string | null) {
  if (!valido_ate) return null;
  return Math.ceil((new Date(valido_ate).getTime() - Date.now()) / 864e5);
}

/** Estado e ações do painel do superadmin. Mesmas consultas da versão anterior. */
export function useDashboard() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [carregando, setCarregando] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<EmpresaAdmin[]>([]);
  const [perfis, setPerfis] = useState<{ id: string; empresa_id: string | null }[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);

  const carregar = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }
    const { data: meu } = await supabase.from('perfis').select('role').eq('id', session.user.id).single();
    if (meu?.role !== 'superadmin') {
      toast.error('Acesso restrito ao superadmin.');
      router.push('/painel');
      return;
    }
    setEmail(session.user.email ?? null);
    const [{ data: emps }, { data: pfs }, { count }] = await Promise.all([
      supabase.from('empresas').select('*').order('created_at', { ascending: false }),
      supabase.from('perfis').select('id, empresa_id'),
      supabase.from('leads').select('*', { count: 'exact', head: true }),
    ]);
    setEmpresas((emps as EmpresaAdmin[]) || []);
    setPerfis(pfs || []);
    setTotalLeads(count ?? 0);
    setCarregando(false);
  }, [supabase, router]);

  // Busca inicial: os setState acontecem depois dos awaits, não em cascata no render.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void carregar(); }, [carregar]);

  const sair = useCallback(async () => { await supabase.auth.signOut(); router.push('/login'); }, [supabase, router]);

  const alternarStatus = useCallback(async (emp: EmpresaAdmin) => {
    const novo = !emp.ativo;
    const { error } = await supabase.from('empresas').update({ ativo: novo }).eq('id', emp.id);
    if (error) { toast.error('Não foi possível alterar o acesso.'); return; }
    setEmpresas((prev) => prev.map((e) => (e.id === emp.id ? { ...e, ativo: novo } : e)));
    toast.success(novo ? `${emp.nome} reativada` : `${emp.nome} suspensa`);
  }, [supabase]);

  /** Onboarding completo: empresa → funil inicial → convite do admin. */
  const criarEmpresa = useCallback(async (d: { nome: string; emailAdmin: string; plano: string; validoAte: string }) => {
    try {
      const { data: emp, error } = await supabase.from('empresas').insert([{
        nome: d.nome, email: d.emailAdmin, plano: d.plano,
        valido_ate: d.validoAte ? new Date(d.validoAte).toISOString() : null, ativo: true,
      }]).select().single();
      if (error) throw new Error('O banco recusou o cadastro da empresa.');

      const { error: erroFunil } = await supabase.from('etapas_funil').insert([
        { empresa_id: emp.id, nome: 'Aguardando Contato', cor: '#c99a06', ordem: 1 },
        { empresa_id: emp.id, nome: 'Em Atendimento', cor: '#5d73e0', ordem: 2 },
        { empresa_id: emp.id, nome: 'Venda Concluída', cor: '#1f8f4e', ordem: 3 },
      ]);
      if (erroFunil) console.error('Erro ao semear funil:', erroFunil);

      const r = await fetch('/api/equipe/convite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: d.emailAdmin, empresa_id: emp.id, role: 'admin' }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Falha ao enviar o convite.');

      toast.success(`${d.nome} criada`, { description: `Convite enviado para ${d.emailAdmin}.` });
      void carregar();
      return true;
    } catch (e) {
      toast.error('Não foi possível concluir a implementação', { description: e instanceof Error ? e.message : undefined });
      return false;
    }
  }, [supabase, carregar]);

  const membros = useCallback((empresaId: string) => perfis.filter((p) => p.empresa_id === empresaId).length, [perfis]);

  return { carregando, email, empresas, perfis, totalLeads, sair, alternarStatus, criarEmpresa, membros };
}

export type Dashboard = ReturnType<typeof useDashboard>;
