'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { apagarImagem, enviarImagem, resolverImagens, type TipoImagem } from '@/lib/marca-storage';
import { desenharIconeApp, enviarIconeApp, removerIconeApp } from '@/lib/icone-app';
import { analisarLogo, FUNDO_CLARO, FUNDO_ESCURO } from '@/lib/marca-logo';
import type { Anotacao, Atividade, BaseLegal, Empresa, Etapa, Lead, LinhaImportacao, Membro, Meta, ModeloMensagem, Movimento, Papel, RegistroAcesso, Tarefa, TipoAtividade } from './tipos';
import { baixarJSON, emAberto, etapaFinal, nomeArquivo, proximaTarefa, rotuloBaseLegal } from './util';
import { avisarComProximoPasso, emDias } from '../_components/proximo-passo';

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
  const [modelos, setModelos] = useState<ModeloMensagem[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  // URLs exibíveis do logo e do fundo (links assinados do bucket privado)
  const [versaoIcone, setVersaoIcone] = useState(0);
  const fundoLogoAnalisado = useRef(false);
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
    if (!session) {
      // Aberto pelo app instalado (start_url com ?empresa=): o login mostra a marca da empresa
      const empresaApp = new URLSearchParams(window.location.search).get('empresa');
      router.push(empresaApp ? `/login?empresa=${encodeURIComponent(empresaApp)}` : '/login');
      return;
    }
    setUserEmail(session.user.email ?? null);
    setUserId(session.user.id);

    const { data: perfil } = await supabase.from('perfis').select('empresa_id, role').eq('id', session.user.id).single();
    if (!perfil?.empresa_id) { setCarregando(false); return; }
    const empresaId = perfil.empresa_id as string;
    setPapel((perfil.role as Papel) || 'vendedor');

    const [{ data: emp }, { data: etp }, { data: lds }, { data: eqp }, { data: trf }, { data: mdl }, { data: mts }, { data: mvs }] = await Promise.all([
      supabase.from('empresas').select('*').eq('id', empresaId).single(),
      supabase.from('etapas_funil').select('*').eq('empresa_id', empresaId).order('ordem', { ascending: true }),
      supabase.from('leads').select('*, vendedor:perfis(nome)').eq('empresa_id', empresaId).order('created_at', { ascending: false }),
      supabase.from('perfis').select('*').eq('empresa_id', empresaId),
      supabase.from('tarefas').select('*').eq('empresa_id', empresaId).order('data_vencimento', { ascending: true }),
      supabase.from('modelos_mensagem').select('*').eq('empresa_id', empresaId).order('ordem', { ascending: true }),
      supabase.from('metas').select('*').eq('empresa_id', empresaId).order('mes', { ascending: false }),
      // O RLS limita aos leads visíveis para quem está logado
      supabase.from('lead_movimentos').select('lead_id, de_etapa_id, para_etapa_id, created_at').order('created_at', { ascending: true }).limit(20000),
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
    setModelos((mdl as ModeloMensagem[]) || []);
    setMetas(((mts as Meta[]) || []).map((m) => ({ ...m, valor: m.valor == null ? null : Number(m.valor) })));
    setMovimentos((mvs as Movimento[]) || []);
    setCarregando(false);
  }, [supabase, router, atualizarImagens]);

  // Busca inicial: os setState acontecem depois dos awaits, não em cascata no render.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void carregar(); }, [carregar]);

  const sair = useCallback(async () => { await supabase.auth.signOut(); router.push('/login'); }, [supabase, router]);

  /* ---------- Leads ---------- */

  /** Registra no histórico do lead (WhatsApp, etapa, ganho/perdido...). Falha em silêncio: não bloqueia a ação principal. */
  const registrar = useCallback(async (leadId: string, tipo: TipoAtividade, descricao?: string) => {
    if (!empresa || !userId) return;
    await supabase.from('lead_atividades').insert([{ empresa_id: empresa.id, lead_id: leadId, usuario_id: userId, tipo, descricao: descricao ?? null }]);
    const agora = new Date().toISOString();
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ultima_atividade_em: agora } : l)));
  }, [empresa, userId, supabase]);

  /** Agenda um follow-up (usado pelas sugestões de um clique). */
  const agendar = useCallback(async (leadId: string, descricao: string, quando: Date) => {
    if (!empresa || !userId) return;
    const { data, error } = await supabase.from('tarefas')
      .insert([{ lead_id: leadId, empresa_id: empresa.id, vendedor_id: userId, descricao, data_vencimento: quando.toISOString() }])
      .select().single();
    if (error) { toast.error('Não foi possível agendar o follow-up.'); return; }
    setTarefas((prev) => [...prev, data as Tarefa].sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento)));
    toast.success(`Agendado: ${descricao.toLowerCase()} em ${quando.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}`);
  }, [empresa, userId, supabase]);

  const criarLead = useCallback(async (dados: { nome: string; email: string; telefone: string; origem: string; vendedor_id: string; valor: string; documento?: string; base_legal?: string }) => {
    if (!empresa || etapas.length === 0) { toast.error('Crie ao menos uma etapa do funil antes de adicionar leads.'); return false; }
    const responsavel = papel === 'vendedor' ? userId : dados.vendedor_id || null;
    const { error } = await supabase.from('leads').insert([{
      nome: dados.nome, email: dados.email || null, telefone: dados.telefone || null, origem: dados.origem,
      etapa_id: etapas[0].id, empresa_id: empresa.id, vendedor_id: responsavel, valor: parseFloat(dados.valor) || 0,
      documento: dados.documento?.trim() || null,
      base_legal: dados.base_legal || null, consentimento_em: dados.base_legal === 'consentimento' ? new Date().toISOString() : null,
    }]);
    if (error) { toast.error('Não foi possível salvar o lead.', { description: 'Tente de novo em instantes.' }); return false; }
    toast.success(`${dados.nome} entrou no funil`);
    void carregar();
    return true;
  }, [empresa, etapas, papel, userId, supabase, carregar]);

  /** Grava etapa/situação no banco e no estado local; devolve false se o banco recusar. */
  const gravarLead = useCallback(async (leadId: string, patch: Partial<Lead>) => {
    const anterior = leads.find((l) => l.id === leadId);
    if (!anterior) return false;
    const agora = new Date().toISOString();
    const local: Partial<Lead> = { ...patch, ultima_atividade_em: agora };
    const mudouEtapa = !!patch.etapa_id && patch.etapa_id !== anterior.etapa_id;
    if (mudouEtapa) local.etapa_desde = agora;
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...local } : l)));
    // Espelho local do movimento que o banco grava por trigger (relatórios atualizam na hora)
    if (mudouEtapa) setMovimentos((prev) => [...prev, { lead_id: leadId, de_etapa_id: anterior.etapa_id ?? null, para_etapa_id: patch.etapa_id!, created_at: agora }]);
    const { error } = await supabase.from('leads').update(patch).eq('id', leadId);
    if (error) {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? anterior : l)));
      toast.error('Não foi possível salvar a mudança no lead.');
      return false;
    }
    return true;
  }, [leads, supabase]);

  const moverLead = useCallback(async (leadId: string, etapaId: string) => {
    const anterior = leads.find((l) => l.id === leadId);
    if (!anterior || anterior.etapa_id === etapaId) return;
    const final = etapaFinal(etapas);
    const de = etapas.find((e) => e.id === anterior.etapa_id)?.nome ?? 'sem etapa';
    const para = etapas.find((e) => e.id === etapaId)?.nome ?? '';
    // Entrar na última etapa é ganhar; sair dela reabre
    const patch: Partial<Lead> = { etapa_id: etapaId };
    if (etapaId === final?.id) patch.situacao = 'ganho';
    else if (anterior.situacao === 'ganho') patch.situacao = 'aberto';
    if (!(await gravarLead(leadId, patch))) return;
    void registrar(leadId, patch.situacao === 'ganho' ? 'ganho' : 'etapa', `${de} → ${para}`);
    const depois = { ...anterior, ...patch };
    avisarComProximoPasso({
      titulo: patch.situacao === 'ganho' ? `${anterior.nome}: venda concluída` : `${anterior.nome} → ${para}`,
      sugerir: emAberto(depois, etapas) && !proximaTarefa(depois, tarefas),
      agendar: (descricao, quando) => agendar(leadId, descricao, quando),
      desfazer: () => { void gravarLead(leadId, { etapa_id: anterior.etapa_id, situacao: anterior.situacao ?? 'aberto' }); },
    });
  }, [leads, etapas, tarefas, gravarLead, registrar, agendar]);

  /** Ganho leva à última etapa; perdido guarda o motivo e sai do Kanban. */
  const fecharLead = useCallback(async (leadId: string, resultado: 'ganho' | 'perdido', motivo?: string) => {
    const anterior = leads.find((l) => l.id === leadId);
    if (!anterior) return false;
    const patch: Partial<Lead> = resultado === 'ganho'
      ? { situacao: 'ganho', etapa_id: etapaFinal(etapas)?.id ?? anterior.etapa_id }
      : { situacao: 'perdido', motivo_perda: motivo?.trim() || null };
    if (!(await gravarLead(leadId, patch))) return false;
    void registrar(leadId, resultado, resultado === 'perdido' ? motivo : undefined);
    toast(resultado === 'ganho' ? `${anterior.nome}: venda concluída` : `${anterior.nome} marcado como perdido`, {
      action: { label: 'Desfazer', onClick: () => void gravarLead(leadId, { situacao: anterior.situacao ?? 'aberto', etapa_id: anterior.etapa_id, motivo_perda: anterior.motivo_perda ?? null }) },
    });
    return true;
  }, [leads, etapas, gravarLead, registrar]);

  /** Volta o lead para negociação (se estava ganho, sai da última etapa). */
  const reabrirLead = useCallback(async (leadId: string) => {
    const anterior = leads.find((l) => l.id === leadId);
    if (!anterior) return;
    const ordenadas = [...etapas].sort((a, b) => a.ordem - b.ordem);
    const final = ordenadas[ordenadas.length - 1];
    const patch: Partial<Lead> = { situacao: 'aberto' };
    if (anterior.etapa_id === final?.id && ordenadas.length > 1) patch.etapa_id = ordenadas[ordenadas.length - 2].id;
    if (!(await gravarLead(leadId, patch))) return;
    void registrar(leadId, 'reaberto');
    toast.success(`${anterior.nome} voltou para a negociação`);
  }, [leads, etapas, gravarLead, registrar]);

  const salvarProbabilidadeLead = useCallback(async (leadId: string, probabilidade: number | null) => {
    if (await gravarLead(leadId, { probabilidade })) toast.success(probabilidade == null ? 'Chance volta a seguir a etapa' : `Chance de fechar: ${probabilidade}%`);
  }, [gravarLead]);

  const registrarWhatsApp = useCallback((leadId: string, modelo?: string) => {
    void registrar(leadId, 'whatsapp', modelo ? `Mensagem: ${modelo}` : 'Conversa aberta');
  }, [registrar]);

  /** Importa linhas já mapeadas e oferece desfazer (apaga exatamente o que entrou). */
  const importarLeads = useCallback(async (linhas: LinhaImportacao[]) => {
    if (!empresa || etapas.length === 0 || linhas.length === 0) return false;
    const inicial = [...etapas].sort((a, b) => a.ordem - b.ordem)[0];
    const { data, error } = await supabase.from('leads')
      .insert(linhas.map((l) => ({ ...l, empresa_id: empresa.id, etapa_id: inicial.id, vendedor_id: papel === 'vendedor' ? userId : null })))
      .select('id');
    if (error) { toast.error('Não foi possível importar', { description: 'O banco recusou a planilha. Confira as colunas e tente de novo.' }); return false; }
    const ids = (data || []).map((d: { id: string }) => d.id);
    // Histórico de cada lead (e o checklist de implantação da Dons) registra a importação
    if (ids.length && userId) void supabase.from('lead_atividades').insert(ids.map((id) => ({ empresa_id: empresa.id, lead_id: id, usuario_id: userId, tipo: 'importacao', descricao: 'Importado da planilha' })));
    toast.success(`${ids.length} ${ids.length === 1 ? 'lead importado' : 'leads importados'}`, {
      duration: 12000,
      action: {
        label: 'Desfazer',
        onClick: async () => {
          const { error: e2 } = await supabase.from('leads').delete().in('id', ids);
          if (e2) toast.error('Não foi possível desfazer a importação.');
          else { toast.success('Importação desfeita'); void carregar(); }
        },
      },
    });
    void carregar();
    return true;
  }, [empresa, etapas, papel, userId, supabase, carregar]);

  /* ---------- Ficha do lead ---------- */

  const carregarFicha = useCallback(async (leadId: string) => {
    const [{ data: notas }, { data: tasks }, { data: ativ }] = await Promise.all([
      supabase.from('lead_anotacoes').select('*, perfis(nome)').eq('lead_id', leadId).order('created_at', { ascending: false }),
      supabase.from('tarefas').select('*').eq('lead_id', leadId).order('data_vencimento', { ascending: true }),
      supabase.from('lead_atividades').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(50),
    ]);
    return { anotacoes: (notas as Anotacao[]) || [], tarefas: (tasks as Tarefa[]) || [], atividades: (ativ as Atividade[]) || [] };
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
    const tarefa = tarefas.find((t) => t.id === id);
    setTarefas((prev) => prev.map((t) => (t.id === id ? { ...t, concluida: !concluida } : t)));
    const { error } = await supabase.from('tarefas').update({ concluida: !concluida }).eq('id', id);
    if (error) {
      setTarefas((prev) => prev.map((t) => (t.id === id ? { ...t, concluida } : t)));
      toast.error('Não foi possível atualizar o follow-up.');
      return;
    }
    // Concluiu e o lead ficou sem próximo passo: sugere um, sem obrigar
    const lead = tarefa && leads.find((l) => l.id === tarefa.lead_id);
    if (!concluida && lead && emAberto(lead, etapas)) {
      const restantes = tarefas.filter((t) => t.id !== id);
      avisarComProximoPasso({
        titulo: `Follow-up concluído: ${lead.nome}`,
        sugerir: !proximaTarefa(lead, restantes),
        agendar: (descricao, quando) => agendar(lead.id, descricao, quando),
        desfazer: () => { void (async () => { setTarefas((prev) => prev.map((t) => (t.id === id ? { ...t, concluida: false } : t))); await supabase.from('tarefas').update({ concluida: false }).eq('id', id); })(); },
      });
    }
  }, [supabase, tarefas, leads, etapas, agendar]);

  /** Reagenda vários follow-ups de uma vez para daqui a N dias, às 10h. */
  const reagendarTarefas = useCallback(async (ids: string[], dias: number) => {
    if (ids.length === 0) return;
    const quando = emDias(dias).toISOString();
    const antes = tarefas;
    setTarefas((prev) => prev.map((t) => (ids.includes(t.id) ? { ...t, data_vencimento: quando } : t)).sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento)));
    const { error } = await supabase.from('tarefas').update({ data_vencimento: quando }).in('id', ids);
    if (error) { setTarefas(antes); toast.error('Não foi possível reagendar.'); return; }
    toast.success(`${ids.length} ${ids.length === 1 ? 'follow-up reagendado' : 'follow-ups reagendados'} para ${new Date(quando).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}`);
  }, [tarefas, supabase]);

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
      if (tipo === 'logo') {
        const url = URL.createObjectURL(arquivo);
        fundoLogoAnalisado.current = true;
        try {
          // Logo transparente ganha uma placa clara ou escura com contraste (se o admin não escolheu outra)
          let fundo = empresa.cor_fundo_logo;
          if (!fundo || fundo === 'transparent' || fundo === FUNDO_CLARO || fundo === FUNDO_ESCURO) {
            const { sugestao } = await analisarLogo(url).catch(() => ({ sugestao: null }));
            fundo = sugestao ?? 'transparent';
            if (fundo !== empresa.cor_fundo_logo) {
              await supabase.from('empresas').update({ cor_fundo_logo: fundo }).eq('id', empresa.id);
              setEmpresa((e) => (e ? { ...e, cor_fundo_logo: fundo } : e));
            }
          }
          // Ícone do app na tela inicial do celular, gerado do próprio arquivo enviado
          await enviarIconeApp(supabase, empresa.id, await desenharIconeApp(url, fundo)); setVersaoIcone(Date.now());
        } catch { /* o app usa as iniciais */ }
        finally { URL.revokeObjectURL(url); }
      }
      toast.success(tipo === 'logo' ? 'Logo atualizado' : 'Imagem de fundo aplicada', tipo === 'logo' ? { description: 'O ícone do app no celular também foi atualizado.' } : undefined);
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
    if (tipo === 'logo') { await removerIconeApp(supabase, empresa.id); setVersaoIcone(Date.now()); }
    const nova = { ...empresa, [coluna]: null };
    setEmpresa(nova);
    await atualizarImagens(nova.logo_url, nova.fundo_url);
    toast.success(tipo === 'logo' ? 'Logo removido' : 'Voltamos ao fundo padrão');
  }, [empresa, supabase, atualizarImagens]);

  /** Fundo atrás do logo: cor (#rrggbb) ou 'none' (sem fundo). Refaz o ícone do app. */
  const salvarFundoLogo = useCallback(async (valor: string) => {
    if (!empresa) return false;
    const { error } = await supabase.from('empresas').update({ cor_fundo_logo: valor }).eq('id', empresa.id);
    if (error) { toast.error('Não foi possível salvar o fundo do logo.'); return false; }
    setEmpresa({ ...empresa, cor_fundo_logo: valor });
    if (imagens.logo) {
      try { await enviarIconeApp(supabase, empresa.id, await desenharIconeApp(imagens.logo, valor)); setVersaoIcone(Date.now()); } catch { /* segue com o ícone anterior */ }
    }
    toast.success('Fundo do logo atualizado');
    return true;
  }, [empresa, imagens.logo, supabase]);

  // Logos enviados antes da análise: na primeira visita do admin, escolhe a placa com contraste
  useEffect(() => {
    if (fundoLogoAnalisado.current || papel !== 'admin' || !empresa || !imagens.logo) return;
    if (empresa.cor_fundo_logo && empresa.cor_fundo_logo !== 'transparent') return;
    fundoLogoAnalisado.current = true;
    void analisarLogo(imagens.logo).then(async ({ sugestao }) => {
      if (!sugestao) return;
      const { error } = await supabase.from('empresas').update({ cor_fundo_logo: sugestao }).eq('id', empresa.id);
      if (error) return;
      setEmpresa((e) => (e ? { ...e, cor_fundo_logo: sugestao } : e));
      toast('Ajustamos o fundo do seu logo', { description: 'Ele tem partes transparentes; agora aparece com contraste nos dois temas. Dá para mudar em Configurações › Marca.' });
    }).catch(() => {});
  }, [papel, empresa, imagens.logo, supabase]);

  /** Motivos de perda da empresa (null volta à lista padrão). */
  const salvarMotivos = useCallback(async (motivos: string[] | null) => {
    if (!empresa) return false;
    const { error } = await supabase.from('empresas').update({ motivos_perda: motivos }).eq('id', empresa.id);
    if (error) { toast.error('Não foi possível salvar os motivos de perda.'); return false; }
    setEmpresa({ ...empresa, motivos_perda: motivos });
    toast.success('Motivos de perda atualizados');
    return true;
  }, [empresa, supabase]);

  /** Refaz o ícone do app a partir do logo atual (ex.: logo enviado antes deste recurso). */
  const gerarIconeApp = useCallback(async () => {
    if (!empresa) return false;
    try {
      if (imagens.logo) await enviarIconeApp(supabase, empresa.id, await desenharIconeApp(imagens.logo, empresa.cor_fundo_logo));
      else await removerIconeApp(supabase, empresa.id);
      setVersaoIcone(Date.now());
      toast.success(imagens.logo ? 'Ícone do app atualizado com o logo' : 'Sem logo: o app usa as iniciais na cor da marca');
      return true;
    } catch (e) {
      toast.error('Não foi possível gerar o ícone', { description: e instanceof Error ? e.message : undefined });
      return false;
    }
  }, [empresa, imagens.logo, supabase]);

  const salvarEtapa = useCallback(async (etapaId: string, patch: Partial<Pick<Etapa, 'probabilidade' | 'dias_parado' | 'nome'>>) => {
    const antes = etapas;
    setEtapas((prev) => prev.map((e) => (e.id === etapaId ? { ...e, ...patch } : e)));
    const { error } = await supabase.from('etapas_funil').update(patch).eq('id', etapaId);
    if (error) { setEtapas(antes); toast.error('Não foi possível salvar a etapa.'); return false; }
    return true;
  }, [etapas, supabase]);

  const salvarModelo = useCallback(async (m: { id?: string; etapa_id: string | null; titulo: string; texto: string }) => {
    if (!empresa) return false;
    const corpo = { etapa_id: m.etapa_id, titulo: m.titulo.trim(), texto: m.texto.trim() };
    const consulta = m.id
      ? supabase.from('modelos_mensagem').update(corpo).eq('id', m.id).select().single()
      : supabase.from('modelos_mensagem').insert([{ ...corpo, empresa_id: empresa.id, ordem: modelos.length }]).select().single();
    const { data, error } = await consulta;
    if (error) { toast.error('Não foi possível salvar a mensagem.'); return false; }
    setModelos((prev) => (m.id ? prev.map((x) => (x.id === m.id ? (data as ModeloMensagem) : x)) : [...prev, data as ModeloMensagem]));
    toast.success(m.id ? 'Mensagem atualizada' : 'Mensagem criada');
    return true;
  }, [empresa, modelos.length, supabase]);

  const apagarModelo = useCallback(async (id: string) => {
    const { error } = await supabase.from('modelos_mensagem').delete().eq('id', id);
    if (error) { toast.error('Não foi possível apagar a mensagem.'); return; }
    setModelos((prev) => prev.filter((m) => m.id !== id));
    toast.success('Mensagem apagada');
  }, [supabase]);

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

  /** O próprio usuário define como quer ser chamado (o RLS permite editar o próprio perfil). */
  /* ---------- Metas ---------- */

  const salvarMeta = useCallback(async (m: { usuario_id: string | null; mes: string; valor: number | null; quantidade: number | null }) => {
    if (!empresa) return false;
    const existente = metas.find((x) => x.mes === m.mes && x.usuario_id === m.usuario_id);
    if (m.valor == null && m.quantidade == null) {
      if (!existente) return true;
      const { error } = await supabase.from('metas').delete().eq('id', existente.id);
      if (error) { toast.error('Não foi possível remover a meta.'); return false; }
      setMetas((prev) => prev.filter((x) => x.id !== existente.id));
      return true;
    }
    const corpo = { valor: m.valor, quantidade: m.quantidade };
    const consulta = existente
      ? supabase.from('metas').update(corpo).eq('id', existente.id).select().single()
      : supabase.from('metas').insert([{ ...corpo, empresa_id: empresa.id, usuario_id: m.usuario_id, mes: m.mes }]).select().single();
    const { data, error } = await consulta;
    if (error) { toast.error('Não foi possível salvar a meta.'); return false; }
    const salva = { ...(data as Meta), valor: data.valor == null ? null : Number(data.valor) };
    setMetas((prev) => (existente ? prev.map((x) => (x.id === existente.id ? salva : x)) : [salva, ...prev]));
    return true;
  }, [empresa, metas, supabase]);

  const salvarNome = useCallback(async (nome: string) => {
    if (!userId) return false;
    const { error } = await supabase.from('perfis').update({ nome }).eq('id', userId);
    if (error) { toast.error('Não foi possível salvar o nome.'); return false; }
    setEquipe((prev) => prev.map((m) => (m.id === userId ? { ...m, nome } : m)));
    toast.success('Nome atualizado');
    return true;
  }, [userId, supabase]);

  const removerMembro = useCallback(async (membro: Membro) => {
    if (membro.id === userId) { toast.error('Você não pode remover o seu próprio acesso.'); return; }
    const { error } = await supabase.from('perfis').delete().eq('id', membro.id);
    if (error) toast.error('Não foi possível remover o acesso.');
    else { toast.success(`Acesso de ${membro.email} revogado`); void carregar(); }
  }, [userId, supabase, carregar]);

  /* ---------- LGPD ---------- */

  // Uma visualização por contato a cada 10 minutos já basta para o registro
  const vistos = useRef(new Map<string, number>());

  const registrarAcesso = useCallback(async (acao: string, leadId?: string | null, detalhes?: string) => {
    if (!empresa || !userId) return;
    if (acao === 'visualizou' && leadId) {
      const ultimo = vistos.current.get(leadId) ?? 0;
      if (Date.now() - ultimo < 10 * 60e3) return;
      vistos.current.set(leadId, Date.now());
    }
    await supabase.from('logs_auditoria').insert([{ empresa_id: empresa.id, usuario_id: userId, acao, entidade: 'lead', entidade_id: leadId ?? null, detalhes: detalhes ?? null }]);
  }, [empresa, userId, supabase]);

  const salvarPrivacidadeLead = useCallback(async (leadId: string, patch: { base_legal?: BaseLegal | null; nao_contatar?: boolean }) => {
    const corpo: Partial<Lead> = { ...patch };
    if ('base_legal' in patch) corpo.consentimento_em = patch.base_legal === 'consentimento' ? new Date().toISOString() : null;
    if (await gravarLead(leadId, corpo)) {
      toast.success('base_legal' in patch ? `Base legal: ${rotuloBaseLegal(patch.base_legal)}` : patch.nao_contatar ? 'Marcado para não contatar' : 'Pode voltar a ser contatado');
    }
  }, [gravarLead]);

  /** Junta tudo o que o CRM guarda sobre o contato e baixa em JSON (pedido de acesso/portabilidade). */
  const exportarDadosLead = useCallback(async (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    const [{ data: notas }, { data: tasks }, { data: ativ }, { data: movs }] = await Promise.all([
      supabase.from('lead_anotacoes').select('texto, created_at').eq('lead_id', leadId).order('created_at'),
      supabase.from('tarefas').select('descricao, data_vencimento, concluida').eq('lead_id', leadId).order('data_vencimento'),
      supabase.from('lead_atividades').select('tipo, descricao, created_at').eq('lead_id', leadId).order('created_at'),
      supabase.from('lead_movimentos').select('de_etapa_id, para_etapa_id, created_at').eq('lead_id', leadId).order('created_at'),
    ]);
    const etapa = (id?: string | null) => etapas.find((e) => e.id === id)?.nome ?? null;
    baixarJSON(`dados-${nomeArquivo(lead.nome)}.json`, {
      gerado_em: new Date().toISOString(),
      controlador: empresa?.nome,
      contato: {
        nome: lead.nome, email: lead.email ?? null, telefone: lead.telefone ?? null, cpf_cnpj: lead.documento ?? null,
        origem: lead.origem ?? null, cadastrado_em: lead.created_at,
        base_legal: rotuloBaseLegal(lead.base_legal), consentimento_em: lead.consentimento_em ?? null, nao_contatar: !!lead.nao_contatar,
      },
      negociacao: { etapa: etapa(lead.etapa_id), situacao: lead.situacao ?? 'aberto', valor: lead.valor ?? 0, responsavel: lead.vendedor?.nome ?? null },
      anotacoes: notas ?? [], follow_ups: tasks ?? [], atividades: ativ ?? [],
      historico_de_etapas: (movs ?? []).map((m) => ({ de: etapa(m.de_etapa_id), para: etapa(m.para_etapa_id), em: m.created_at })),
    });
    void registrarAcesso('exportou', leadId);
    toast.success('Arquivo com os dados do contato baixado');
  }, [leads, etapas, empresa, supabase, registrarAcesso]);

  const anonimizarLead = useCallback(async (leadId: string, motivo?: string) => {
    const { error } = await supabase.rpc('anonimizar_lead', { alvo: leadId, motivo: motivo ?? null });
    if (error) { toast.error(error.code === '42501' ? 'Só o administrador pode anonimizar contatos.' : 'Não foi possível anonimizar o contato.'); return false; }
    const agora = new Date().toISOString();
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, nome: 'Contato removido', email: null, telefone: null, documento: null, chave_telefone: null, consentimento_em: null, nao_contatar: true, anonimizado_em: agora } : l)));
    setTarefas((prev) => prev.filter((t) => t.lead_id !== leadId || t.concluida).map((t) => (t.lead_id === leadId ? { ...t, descricao: 'Follow-up' } : t)));
    toast.success('Dados pessoais apagados. Os números do funil foram mantidos.');
    return true;
  }, [supabase]);

  /** Registro de acessos (só admin lê, pelo RLS). */
  const carregarAcessos = useCallback(async (filtro: { leadId?: string; limite?: number } = {}) => {
    if (!empresa) return [] as RegistroAcesso[];
    let q = supabase.from('logs_auditoria').select('id, created_at, usuario_id, acao, entidade, entidade_id, detalhes').eq('empresa_id', empresa.id);
    if (filtro.leadId) q = q.eq('entidade_id', filtro.leadId);
    const { data } = await q.order('created_at', { ascending: false }).limit(filtro.limite ?? 200);
    return (data as RegistroAcesso[]) ?? [];
  }, [empresa, supabase]);

  /* ---------- Derivados ---------- */

  const nomeUsuario = useMemo(() => {
    const eu = equipe.find((m) => m.id === userId);
    return eu?.nome || userEmail?.split('@')[0] || 'você';
  }, [equipe, userId, userEmail]);

  // Ícone do app (rota do servidor); a versão força o navegador a buscar o novo
  const iconeApp = empresa ? `/api/app/${empresa.id}/icone/192?v=${(empresa.cor_primaria ?? '').replace('#', '')}-${versaoIcone}` : null;

  return {
    carregando, iconeApp, gerarIconeApp, appInstalavel: true as boolean, salvarMotivos, salvarFundoLogo, userId, userEmail, papel, empresa, imagens, etapas, leads, equipe, tarefas, modelos, metas, movimentos, nomeUsuario,
    recarregar: carregar, sair,
    criarLead, moverLead, fecharLead, reabrirLead, salvarProbabilidadeLead, registrarWhatsApp, importarLeads, agendar,
    carregarFicha, adicionarAnotacao, apagarAnotacao, criarTarefa, alternarTarefa, apagarTarefa, reagendarTarefas,
    salvarEtapa, salvarModelo, apagarModelo, salvarMeta,
    registrarAcesso, salvarPrivacidadeLead, exportarDadosLead, anonimizarLead, carregarAcessos,
    salvarMarca, enviarMarca, removerMarca, adicionarEtapa, removerEtapa, convidar, mudarPapel, removerMembro, salvarNome,
  };
}

export type Painel = ReturnType<typeof usePainel>;
