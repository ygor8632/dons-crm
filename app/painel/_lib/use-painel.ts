'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { apagarImagem, enviarImagem, resolverImagens, type TipoImagem } from '@/lib/marca-storage';
import type { Anotacao, Empresa, Etapa, Lead, Membro, Papel, Tarefa } from './tipos';
import { lerLeadsCSV } from './util';

/**
 * Estado e ações do painel do cliente. Mesmas consultas da versão anterior
 * (o RLS protege os dados); a UI só chama estas funções.
 */
export function usePainel() {
  const router = useRouter();
  const [supabase] = useState(createClient);

  const [carregando, setCarregando] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [papel, setPapel] = useState<Papel>('vendedor');
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [equipe, setEquipe] = useState<Membro[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  // URLs exibíveis do logo e do fundo (links assinados do bucket privado)
  const [imagens, setImagens] = useState<{ logo: string | null; fundo: string | null }>({ logo: null, fundo: null });
  const cacheImagens = useRef(new Map<string, string | null>());

  /** Resolve logo/fundo reaproveitando links já assinados (a imagem não pisca a cada recarga). */
  const atualizarImagens = useCallback(async (logo?: string | null, fundo?: string | null) => {
    const faltando = [logo, fundo].filter((v): v is string => !!v && !cacheImagens.current.has(v));
    if (faltando.length) {
      const urls = await resolverImagens(supabase, faltando);
      faltando.forEach((v, i) => cacheImagens.current.set(v, urls[i]));
    }
    setImagens({
      logo: logo ? cacheImagens.current.get(logo) ?? null : null,
      fundo: fundo ? cacheImagens.current.get(fundo) ?? null : null,
    });
  }, [supabase]);

  const carregar = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }
    setUserEmail(session.user.email ?? null);
    setUserId(session.user.id);

    const { data: perfil } = await supabase.from('perfis').select('empresa_id, role').eq('id', session.user.id).single();
    if (!perfil?.empresa_id) { setCarregando(false); return; }
    const empresaId = perfil.empresa_id as string;
    setPapel((perfil.role as Papel) || 'vendedor');

    const [{ data: emp }, { data: etp }, { data: lds }, { data: eqp }, { data: trf }] = await Promise.all([
      supabase.from('empresas').select('*').eq('id', empresaId).single(),
      supabase.from('etapas_funil').select('*').eq('empresa_id', empresaId).order('ordem', { ascending: true }),
      supabase.from('leads').select('*, vendedor:perfis(nome)').eq('empresa_id', empresaId).order('created_at', { ascending: false }),
      supabase.from('perfis').select('*').eq('empresa_id', empresaId),
      supabase.from('tarefas').select('*').eq('empresa_id', empresaId).order('data_vencimento', { ascending: true }),
    ]);

    if (emp && !emp.ativo) {
      toast.error('Acesso suspenso', { description: 'Entre em contato com o suporte financeiro.' });
      await supabase.auth.signOut();
      router.push('/login');
      return;
    }
    setEmpresa(emp as Empresa);
    await atualizarImagens(emp?.logo_url, emp?.fundo_url);
    setEtapas((etp as Etapa[]) || []);
    setLeads((lds as Lead[]) || []);
    setEquipe((eqp as Membro[]) || []);
    setTarefas((trf as Tarefa[]) || []);
    setCarregando(false);
  }, [supabase, router, atualizarImagens]);

  // Busca inicial: os setState acontecem depois dos awaits, não em cascata no render.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void carregar(); }, [carregar]);

  const sair = useCallback(async () => { await supabase.auth.signOut(); router.push('/login'); }, [supabase, router]);

  /* ---------- Leads ---------- */

  const criarLead = useCallback(async (dados: { nome: string; email: string; telefone: string; origem: string; vendedor_id: string; valor: string }) => {
    if (!empresa || etapas.length === 0) { toast.error('Crie ao menos uma etapa do funil antes de adicionar leads.'); return false; }
    const responsavel = papel === 'vendedor' ? userId : dados.vendedor_id || null;
    const { error } = await supabase.from('leads').insert([{
      nome: dados.nome, email: dados.email || null, telefone: dados.telefone || null, origem: dados.origem,
      etapa_id: etapas[0].id, empresa_id: empresa.id, vendedor_id: responsavel, valor: parseFloat(dados.valor) || 0,
    }]);
    if (error) { toast.error('Não foi possível salvar o lead.', { description: 'Tente de novo em instantes.' }); return false; }
    toast.success(`${dados.nome} entrou no funil`);
    void carregar();
    return true;
  }, [empresa, etapas, papel, userId, supabase, carregar]);

  const moverLeadSemAviso = useCallback(async (leadId: string, etapaId: string) => {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, etapa_id: etapaId } : l)));
    await supabase.from('leads').update({ etapa_id: etapaId }).eq('id', leadId);
  }, [supabase]);

  const moverLead = useCallback(async (leadId: string, etapaId: string) => {
    const anterior = leads.find((l) => l.id === leadId);
    if (!anterior || anterior.etapa_id === etapaId) return;
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, etapa_id: etapaId } : l)));
    const { error } = await supabase.from('leads').update({ etapa_id: etapaId }).eq('id', leadId);
    if (error) {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? anterior : l)));
      toast.error('Não foi possível mover o lead.');
      return;
    }
    const nomeEtapa = etapas.find((e) => e.id === etapaId)?.nome;
    toast(`${anterior.nome} → ${nomeEtapa}`, {
      action: { label: 'Desfazer', onClick: () => void moverLeadSemAviso(leadId, anterior.etapa_id ?? '') },
    });
  }, [leads, etapas, supabase, moverLeadSemAviso]);

  const importarCSV = useCallback(async (arquivo: File) => {
    if (!empresa || etapas.length === 0) return false;
    try {
      const novos = lerLeadsCSV(await arquivo.text()).map((l) => ({
        ...l, empresa_id: empresa.id, etapa_id: etapas[0].id, vendedor_id: papel === 'vendedor' ? userId : null,
      }));
      const { error } = await supabase.from('leads').insert(novos);
      if (error) throw new Error('O banco recusou a importação.');
      toast.success(`${novos.length} ${novos.length === 1 ? 'lead importado' : 'leads importados'}`);
      void carregar();
      return true;
    } catch (e) {
      toast.error('Não foi possível importar', { description: e instanceof Error ? e.message : undefined });
      return false;
    }
  }, [empresa, etapas, papel, userId, supabase, carregar]);

  /* ---------- Ficha do lead ---------- */

  const carregarFicha = useCallback(async (leadId: string) => {
    const [{ data: notas }, { data: tasks }] = await Promise.all([
      supabase.from('lead_anotacoes').select('*, perfis(nome)').eq('lead_id', leadId).order('created_at', { ascending: false }),
      supabase.from('tarefas').select('*').eq('lead_id', leadId).order('data_vencimento', { ascending: true }),
    ]);
    return { anotacoes: (notas as Anotacao[]) || [], tarefas: (tasks as Tarefa[]) || [] };
  }, [supabase]);

  const adicionarAnotacao = useCallback(async (leadId: string, texto: string) => {
    if (!empresa || !userId) return;
    const { error } = await supabase.from('lead_anotacoes').insert([{ lead_id: leadId, empresa_id: empresa.id, usuario_id: userId, texto }]);
    if (error) toast.error('Não foi possível salvar a anotação.');
  }, [empresa, userId, supabase]);

  const apagarAnotacao = useCallback(async (id: string) => {
    const { error } = await supabase.from('lead_anotacoes').delete().eq('id', id);
    if (error) toast.error('Não foi possível apagar a anotação.');
  }, [supabase]);

  const criarTarefa = useCallback(async (leadId: string, descricao: string, data: string) => {
    if (!empresa || !userId) return;
    const { error } = await supabase.from('tarefas').insert([{ lead_id: leadId, empresa_id: empresa.id, vendedor_id: userId, descricao, data_vencimento: new Date(data).toISOString() }]);
    if (error) toast.error('Não foi possível agendar o follow-up.');
    else void carregar();
  }, [empresa, userId, supabase, carregar]);

  const alternarTarefa = useCallback(async (id: string, concluida: boolean) => {
    setTarefas((prev) => prev.map((t) => (t.id === id ? { ...t, concluida: !concluida } : t)));
    const { error } = await supabase.from('tarefas').update({ concluida: !concluida }).eq('id', id);
    if (error) {
      setTarefas((prev) => prev.map((t) => (t.id === id ? { ...t, concluida } : t)));
      toast.error('Não foi possível atualizar o follow-up.');
    }
  }, [supabase]);

  const apagarTarefa = useCallback(async (id: string) => {
    const { error } = await supabase.from('tarefas').delete().eq('id', id);
    if (error) toast.error('Não foi possível apagar o follow-up.');
    else setTarefas((prev) => prev.filter((t) => t.id !== id));
  }, [supabase]);

  /* ---------- Configurações ---------- */

  const salvarMarca = useCallback(async (dados: { nome: string; cor_primaria: string }) => {
    if (!empresa) return;
    const { error } = await supabase.from('empresas').update(dados).eq('id', empresa.id);
    if (error) { toast.error('Não foi possível salvar a identidade visual.'); return; }
    setEmpresa({ ...empresa, ...dados });
    toast.success('Identidade visual atualizada');
  }, [empresa, supabase]);

  /** Envia logo ou fundo para o bucket `marca`, grava o caminho e apaga o arquivo anterior. */
  const enviarMarca = useCallback(async (tipo: TipoImagem, arquivo: File) => {
    if (!empresa) return false;
    const coluna = tipo === 'logo' ? 'logo_url' : 'fundo_url';
    const anterior = empresa[coluna];
    try {
      const caminho = await enviarImagem(supabase, empresa.id, tipo, arquivo);
      const { error } = await supabase.from('empresas').update({ [coluna]: caminho }).eq('id', empresa.id);
      if (error) { await apagarImagem(supabase, caminho); throw new Error('Não foi possível salvar na empresa.'); }
      await apagarImagem(supabase, anterior);
      const nova = { ...empresa, [coluna]: caminho };
      setEmpresa(nova);
      await atualizarImagens(nova.logo_url, nova.fundo_url);
      toast.success(tipo === 'logo' ? 'Logo atualizado' : 'Imagem de fundo aplicada');
      return true;
    } catch (e) {
      toast.error(tipo === 'logo' ? 'Logo não enviado' : 'Fundo não enviado', { description: e instanceof Error ? e.message : undefined });
      return false;
    }
  }, [empresa, supabase, atualizarImagens]);

  const removerMarca = useCallback(async (tipo: TipoImagem) => {
    if (!empresa) return;
    const coluna = tipo === 'logo' ? 'logo_url' : 'fundo_url';
    const anterior = empresa[coluna];
    const { error } = await supabase.from('empresas').update({ [coluna]: null }).eq('id', empresa.id);
    if (error) { toast.error('Não foi possível remover a imagem.'); return; }
    await apagarImagem(supabase, anterior);
    const nova = { ...empresa, [coluna]: null };
    setEmpresa(nova);
    await atualizarImagens(nova.logo_url, nova.fundo_url);
    toast.success(tipo === 'logo' ? 'Logo removido' : 'Voltamos ao fundo padrão');
  }, [empresa, supabase, atualizarImagens]);

  const adicionarEtapa = useCallback(async (nome: string, cor: string) => {
    if (!empresa) return;
    const ordem = etapas.length ? Math.max(...etapas.map((e) => e.ordem)) + 1 : 1;
    const { error } = await supabase.from('etapas_funil').insert([{ empresa_id: empresa.id, nome, cor, ordem }]);
    if (error) toast.error('Não foi possível criar a etapa.');
    else { toast.success(`Etapa “${nome}” criada`); void carregar(); }
  }, [empresa, etapas, supabase, carregar]);

  const removerEtapa = useCallback(async (etapa: Etapa) => {
    const vinculados = leads.filter((l) => l.etapa_id === etapa.id).length;
    if (vinculados > 0) {
      toast.error(`“${etapa.nome}” ainda tem ${vinculados} ${vinculados === 1 ? 'lead' : 'leads'}`, { description: 'Mova os leads para outra etapa antes de excluir.' });
      return;
    }
    const { error } = await supabase.from('etapas_funil').delete().eq('id', etapa.id);
    if (error) toast.error('Não foi possível excluir a etapa.');
    else { toast.success(`Etapa “${etapa.nome}” excluída`); void carregar(); }
  }, [leads, supabase, carregar]);

  const convidar = useCallback(async (email: string) => {
    if (!empresa) return false;
    try {
      const r = await fetch('/api/equipe/convite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, empresa_id: empresa.id, role: 'vendedor' }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        toast.error('Convite não enviado', { description: d.error });
        return false;
      }
      toast.success(`Convite enviado para ${email}`);
      void carregar();
      return true;
    } catch {
      toast.error('Sem conexão com o servidor. Tente de novo.');
      return false;
    }
  }, [empresa, carregar]);

  const mudarPapel = useCallback(async (membroId: string, novo: Papel) => {
    const { error } = await supabase.from('perfis').update({ role: novo }).eq('id', membroId);
    if (error) toast.error('Não foi possível mudar o cargo.');
    else { toast.success('Cargo atualizado'); void carregar(); }
  }, [supabase, carregar]);

  const removerMembro = useCallback(async (membro: Membro) => {
    if (membro.id === userId) { toast.error('Você não pode remover o seu próprio acesso.'); return; }
    const { error } = await supabase.from('perfis').delete().eq('id', membro.id);
    if (error) toast.error('Não foi possível remover o acesso.');
    else { toast.success(`Acesso de ${membro.email} revogado`); void carregar(); }
  }, [userId, supabase, carregar]);

  /* ---------- Derivados ---------- */

  const nomeUsuario = useMemo(() => {
    const eu = equipe.find((m) => m.id === userId);
    return eu?.nome || userEmail?.split('@')[0] || 'você';
  }, [equipe, userId, userEmail]);

  return {
    carregando, userId, userEmail, papel, empresa, imagens, etapas, leads, equipe, tarefas, nomeUsuario,
    recarregar: carregar, sair,
    criarLead, moverLead, importarCSV,
    carregarFicha, adicionarAnotacao, apagarAnotacao, criarTarefa, alternarTarefa, apagarTarefa,
    salvarMarca, enviarMarca, removerMarca, adicionarEtapa, removerEtapa, convidar, mudarPapel, removerMembro,
  };
}

export type Painel = ReturnType<typeof usePainel>;
