'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { TEMPLATES, templatePorId, type TemplateSegmento } from '@/lib/templates-segmento';

export type EmpresaAdmin = {
  id: string;
  nome: string;
  email?: string | null;
  plano?: string | null;
  ativo: boolean;
  valido_ate?: string | null;
  cor_primaria?: string | null;
  created_at: string;
  logo_url?: string | null;
  segmento?: string | null;
  motivos_perda?: string[] | null;
  /** Itens marcados à mão: { treinamento: "2026-11-23T…", planilha: "dispensado", inicio: "…" } */
  implantacao?: Record<string, string> | null;
};

/** O que o banco mede sozinho para o checklist (função checklist_implantacao). */
export type ChecklistAuto = {
  empresa_id: string;
  tem_logo: boolean;
  etapas: number;
  membros: number;
  acessaram: number;
  importados: number;
  leads_webhook: number;
  modelos: number;
  leads: number;
};

export type ItemChecklist = { id: string; titulo: string; dica: string; auto?: (c: ChecklistAuto) => boolean; podeDispensar?: boolean };

/** Escopo da implantação: o que a Dons entrega em até 7 dias. */
export const ITENS_CHECKLIST: ItemChecklist[] = [
  { id: 'marca', titulo: 'Marca configurada', dica: 'Logo e cor da empresa no painel.', auto: (c) => c.tem_logo },
  { id: 'funil', titulo: 'Funil revisado com o cliente', dica: 'Etapas, chance de fechar e prazo de "parado" conferidos na reunião.' },
  { id: 'planilha', titulo: 'Planilha importada', dica: 'Contatos que o cliente já tinha, sem repetidos.', auto: (c) => c.importados > 0, podeDispensar: true },
  { id: 'equipe', titulo: 'Equipe convidada', dica: 'Pelo menos um vendedor além do administrador.', auto: (c) => c.membros >= 2, podeDispensar: true },
  { id: 'acesso', titulo: 'Equipe entrou no CRM', dica: 'Todos os convidados criaram a senha e entraram.', auto: (c) => c.membros > 0 && c.acessaram >= c.membros },
  { id: 'site', titulo: 'Site ligado', dica: 'Primeiro lead chegou sozinho pelo webhook.', auto: (c) => c.leads_webhook > 0, podeDispensar: true },
  { id: 'mensagens', titulo: 'Mensagens prontas', dica: 'Pelo menos uma mensagem de WhatsApp cadastrada.', auto: (c) => c.modelos > 0 },
  { id: 'treinamento', titulo: 'Treinamento feito', dica: 'Equipe treinada na tela Hoje, no Kanban e na ficha do lead.' },
];

export const PRAZO_IMPLANTACAO = 7;

/** Situação de cada item: feito sozinho, marcado à mão, dispensado ou pendente. */
export function situacaoChecklist(emp: EmpresaAdmin, auto?: ChecklistAuto) {
  const marcas = emp.implantacao ?? {};
  const itens = ITENS_CHECKLIST.map((item) => {
    const marca = marcas[item.id];
    const feitoAuto = !!(auto && item.auto?.(auto));
    const estado: 'auto' | 'manual' | 'dispensado' | 'pendente' = feitoAuto ? 'auto' : marca === 'dispensado' ? 'dispensado' : marca ? 'manual' : 'pendente';
    return { ...item, estado, em: marca && marca !== 'dispensado' ? marca : null };
  });
  const feitos = itens.filter((i) => i.estado !== 'pendente').length;
  // Empresas criadas antes do checklist não têm data de início: ficam sem prazo
  const inicio = marcas.inicio ?? null;
  const dia = inicio ? Math.max(1, Math.floor((Date.now() - new Date(inicio).getTime()) / 864e5) + 1) : null;
  return { itens, feitos, total: itens.length, completo: feitos === itens.length, dia, atrasado: dia != null && feitos < itens.length && dia > PRAZO_IMPLANTACAO };
}

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

/** Números de adoção de uma empresa (função saude_empresas do banco). */
export type SaudeEmpresa = {
  empresa_id: string;
  usuarios: number;
  ativos_7d: number;
  leads_7d: number;
  leads_7d_anterior: number;
  abertos: number;
  sem_proximo_passo: number;
  atrasados: number;
  parados: number;
  ultima_atividade: string | null;
};

export type NivelSaude = 'risco' | 'atencao' | 'saudavel' | 'sem_uso';

/** Classifica a adoção e diz por quê, em frases curtas. */
export function avaliarSaude(s: SaudeEmpresa | undefined): { nivel: NivelSaude; motivos: string[] } {
  if (!s || (s.usuarios === 0 && s.abertos === 0 && !s.ultima_atividade)) return { nivel: 'sem_uso', motivos: ['Ainda sem uso'] };
  const risco: string[] = [];
  const atencao: string[] = [];
  const diasSemUso = s.ultima_atividade ? Math.floor((Date.now() - new Date(s.ultima_atividade).getTime()) / 864e5) : null;
  if (s.ativos_7d === 0) risco.push(diasSemUso == null ? 'Ninguém usou ainda' : `Ninguém usou há ${diasSemUso} dias`);
  else if (s.usuarios >= 3 && s.ativos_7d / s.usuarios < 0.5) atencao.push(`Só ${s.ativos_7d} de ${s.usuarios} pessoas usaram na semana`);
  if (s.leads_7d_anterior >= 4 && s.leads_7d <= s.leads_7d_anterior * 0.5) risco.push(`Leads caíram de ${s.leads_7d_anterior} para ${s.leads_7d} na semana`);
  const semPasso = s.abertos ? s.sem_proximo_passo / s.abertos : 0;
  if (s.abertos >= 5 && semPasso >= 0.6) risco.push(`${Math.round(semPasso * 100)}% dos leads sem próximo passo`);
  else if (s.abertos >= 5 && semPasso >= 0.35) atencao.push(`${Math.round(semPasso * 100)}% dos leads sem próximo passo`);
  if (s.atrasados >= 10) risco.push(`${s.atrasados} follow-ups atrasados`);
  else if (s.atrasados >= 3) atencao.push(`${s.atrasados} follow-ups atrasados`);
  if (s.abertos >= 5 && s.parados / s.abertos >= 0.4) atencao.push(`${s.parados} leads parados`);
  if (risco.length) return { nivel: 'risco', motivos: [...risco, ...atencao] };
  if (atencao.length) return { nivel: 'atencao', motivos: atencao };
  return { nivel: 'saudavel', motivos: ['Time usando e funil em dia'] };
}

/** Estado e ações do painel do superadmin. Mesmas consultas da versão anterior. */
export function useDashboard() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [carregando, setCarregando] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [meuId, setMeuId] = useState<string | null>(null);
  const [nome, setNome] = useState<string>('');
  const [empresas, setEmpresas] = useState<EmpresaAdmin[]>([]);
  const [perfis, setPerfis] = useState<{ id: string; empresa_id: string | null }[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [saude, setSaude] = useState<SaudeEmpresa[]>([]);
  const [checklist, setChecklist] = useState<ChecklistAuto[]>([]);

  const carregar = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }
    const { data: meu } = await supabase.from('perfis').select('role, nome').eq('id', session.user.id).single();
    if (meu?.role !== 'superadmin') {
      toast.error('Acesso restrito ao superadmin.');
      router.push('/painel');
      return;
    }
    setEmail(session.user.email ?? null);
    setMeuId(session.user.id);
    setNome((meu?.nome as string) || '');
    const [{ data: emps }, { data: pfs }, { count }, { data: sde, error: erroSaude }, { data: chk, error: erroChk }] = await Promise.all([
      supabase.from('empresas').select('*').order('created_at', { ascending: false }),
      supabase.from('perfis').select('id, empresa_id'),
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.rpc('saude_empresas'),
      supabase.rpc('checklist_implantacao'),
    ]);
    if (erroChk) console.error('Checklist de implantação:', erroChk.message);
    setChecklist((chk as ChecklistAuto[]) || []);
    if (erroSaude) console.error('Saúde dos clientes:', erroSaude.message);
    setSaude((sde as SaudeEmpresa[]) || []);
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
  /** Grava funil, mensagens e motivos do template. Funil só é trocado se a empresa não tiver leads. */
  const gravarTemplate = useCallback(async (empresaId: string, tpl: TemplateSegmento, trocarFunil: boolean) => {
    let etapasIds: string[] = [];
    if (trocarFunil) {
      await supabase.from('etapas_funil').delete().eq('empresa_id', empresaId);
      const { data, error } = await supabase.from('etapas_funil')
        .insert(tpl.etapas.map((e, i) => ({ empresa_id: empresaId, nome: e.nome, cor: e.cor, ordem: i + 1, probabilidade: e.probabilidade, dias_parado: e.dias_parado })))
        .select('id, ordem');
      if (error) throw new Error('O funil do template não foi gravado.');
      etapasIds = [...(data ?? [])].sort((a, b) => a.ordem - b.ordem).map((e) => e.id as string);
    }
    const mensagens = tpl.mensagens
      .filter((m) => m.etapa == null || etapasIds[m.etapa])
      .map((m, i) => ({ empresa_id: empresaId, etapa_id: m.etapa == null ? null : etapasIds[m.etapa], titulo: m.titulo, texto: m.texto, ordem: i + 1 }));
    if (mensagens.length) await supabase.from('modelos_mensagem').insert(mensagens);
    await supabase.from('empresas').update({ segmento: tpl.id, motivos_perda: tpl.motivos }).eq('id', empresaId);
  }, [supabase]);

  const criarEmpresa = useCallback(async (d: { nome: string; emailAdmin: string; plano: string; validoAte: string; segmento: string }) => {
    try {
      const { data: emp, error } = await supabase.from('empresas').insert([{
        nome: d.nome, email: d.emailAdmin, plano: d.plano,
        valido_ate: d.validoAte ? new Date(d.validoAte).toISOString() : null, ativo: true,
        implantacao: { inicio: new Date().toISOString() },
      }]).select().single();
      if (error) throw new Error('O banco recusou o cadastro da empresa.');

      const tpl = templatePorId(d.segmento) ?? TEMPLATES[0];
      try { await gravarTemplate(emp.id, tpl, true); } catch (e) { console.error('Template:', e); }

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
  }, [supabase, carregar, gravarTemplate]);

  /** Aplica um template numa empresa existente (funil só se ela ainda não tiver leads). */
  const aplicarTemplate = useCallback(async (emp: EmpresaAdmin, templateId: string) => {
    const tpl = templatePorId(templateId);
    if (!tpl) return false;
    const leads = checklist.find((c) => c.empresa_id === emp.id)?.leads ?? 0;
    try {
      await gravarTemplate(emp.id, tpl, leads === 0);
      toast.success(`Template "${tpl.nome}" aplicado em ${emp.nome}`, {
        description: leads === 0 ? 'Funil, mensagens prontas e motivos de perda.' : 'A empresa já tem leads: o funil foi mantido; entraram mensagens e motivos de perda.',
      });
      void carregar();
      return true;
    } catch (e) {
      toast.error('Não foi possível aplicar o template', { description: e instanceof Error ? e.message : undefined });
      return false;
    }
  }, [checklist, gravarTemplate, carregar]);

  /** Marca, desmarca ou dispensa um item manual do checklist. */
  const marcarItem = useCallback(async (emp: EmpresaAdmin, itemId: string, valor: 'feito' | 'dispensado' | null) => {
    const atual = { ...(emp.implantacao ?? {}) };
    if (valor === null) delete atual[itemId];
    else atual[itemId] = valor === 'feito' ? new Date().toISOString() : 'dispensado';
    setEmpresas((prev) => prev.map((e) => (e.id === emp.id ? { ...e, implantacao: atual } : e)));
    const { error } = await supabase.from('empresas').update({ implantacao: atual }).eq('id', emp.id);
    if (error) { toast.error('Não foi possível salvar o checklist.'); void carregar(); }
  }, [supabase, carregar]);

  const salvarNome = useCallback(async (novo: string) => {
    if (!meuId) return false;
    const { error } = await supabase.from('perfis').update({ nome: novo }).eq('id', meuId);
    if (error) { toast.error('Não foi possível salvar o nome.'); return false; }
    setNome(novo);
    toast.success('Nome atualizado');
    return true;
  }, [meuId, supabase]);

  const membros = useCallback((empresaId: string) => perfis.filter((p) => p.empresa_id === empresaId).length, [perfis]);

  return { carregando, email, nome, empresas, perfis, totalLeads, saude, checklist, sair, alternarStatus, criarEmpresa, aplicarTemplate, marcarItem, membros, salvarNome };
}

export type Dashboard = ReturnType<typeof useDashboard>;
