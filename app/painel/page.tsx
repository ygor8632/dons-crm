'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LayoutDashboard, Users, Inbox, Settings, LogOut, CheckCircle2, Clock, Phone, AlertCircle, Plus, Trash2, Search, List, Columns, MessageSquare, UserPlus, UserCircle2, Plug, Copy, Check, Calendar, CheckSquare, Square, Palette, GripVertical } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Label as RechartsLabel } from 'recharts';

const formatarMoeda = (valor: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

export default function TenantDashboard() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [webhookToken, setWebhookToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'vendedor'>('vendedor');
  
  // White-label
  const [corPrimaria, setCorPrimaria] = useState('#4361EE');
  const [logoUrl, setLogoUrl] = useState('');
  
  // Funil Dinâmico
  const [etapasFunil, setEtapasFunil] = useState<any[]>([]);
  const [novaEtapaNome, setNovaEtapaNome] = useState('');
  const [novaEtapaCor, setNovaEtapaCor] = useState('#3B82F6');

  const [loading, setLoading] = useState(true);
  const [minhasLeads, setMinhasLeads] = useState<any[]>([]);
  const [equipe, setEquipe] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'visao_geral' | 'oportunidades' | 'configuracoes' | 'integracoes'>('visao_geral');
  const [modoVisualizacao, setModoVisualizacao] = useState<'tabela' | 'kanban'>('kanban');
  const [logsAuditoria, setLogsAuditoria] = useState<any[]>([]);
  
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [leadSelecionada, setLeadSelecionada] = useState<any>(null);
  const [isNovaLeadModalOpen, setIsNovaLeadModalOpen] = useState(false);
  
  const [novaLead, setNovaLead] = useState({ nome: '', email: '', telefone: '', origem: 'Adicionado Manualmente', vendedor_id: '', valor: '', status: '' });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [leadParaApagar, setLeadParaApagar] = useState<any>(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [leadEmEdicao, setLeadEmEdicao] = useState({ id: '', nome: '', email: '', telefone: '', vendedor_id: '', valor: '' });

  const [isDetalhesModalOpen, setIsDetalhesModalOpen] = useState(false);
  const [abaFicha, setAbaFicha] = useState<'anotacoes' | 'tarefas'>('anotacoes');
  
  const [anotacoesLead, setAnotacoesLead] = useState<any[]>([]);
  const [novaAnotacaoTexto, setNovaAnotacaoTexto] = useState('');
  
  const [tarefasLead, setTarefasLead] = useState<any[]>([]);
  const [novaTarefaDesc, setNovaTarefaDesc] = useState('');
  const [novaTarefaData, setNovaTarefaData] = useState('');

  const [isConvidarModalOpen, setIsConvidarModalOpen] = useState(false);
  const [conviteEmail, setConviteEmail] = useState('');
  const [isEnviandoConvite, setIsEnviandoConvite] = useState(false);
  const [webhookCopiado, setWebhookCopiado] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const carregarDados = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }
    
    setUserEmail(session.user.email ?? null);
    setUserId(session.user.id);

    const { data: perfilData } = await supabase.from('perfis').select('empresa_id, role').eq('id', session.user.id).single();
    if (!perfilData?.empresa_id) { setLoading(false); return; }

    const currentEmpresaId = perfilData.empresa_id;
    setEmpresaId(currentEmpresaId);
    setUserRole(perfilData.role || 'vendedor');

    // Carregar Empresa e Configurações White-label
    const { data: empresaData } = await supabase.from('empresas').select('*').eq('id', currentEmpresaId).single();
    if (empresaData) { 
      setNomeEmpresa(empresaData.nome); 
      setWebhookToken(empresaData.webhook_token);
      if (empresaData.cor_primaria) setCorPrimaria(empresaData.cor_primaria);
      if (empresaData.logo_url) setLogoUrl(empresaData.logo_url);
    }

    // Carregar Etapas do Funil
    let { data: etapasData } = await supabase.from('etapas_funil').select('*').eq('empresa_id', currentEmpresaId).order('ordem', { ascending: true });
    
    // CORREÇÃO: Limpar as etapas duplicadas criadas pelo erro do React Strict Mode
    if (etapasData && etapasData.length > 0) {
      const etapasUnicas: any[] = [];
      const nomesVistos = new Set();
      
      for (const etapa of etapasData) {
        if (!nomesVistos.has(etapa.nome)) {
          etapasUnicas.push(etapa);
          nomesVistos.add(etapa.nome);
        } else {
          // Deleta silenciosamente a duplicata que foi gerada na base de dados
          await supabase.from('etapas_funil').delete().eq('id', etapa.id);
        }
      }
      etapasData = etapasUnicas;
    }

    // Se estiver realmente vazio, cria as originais
    if (!etapasData || etapasData.length === 0) {
      const defaultEtapas = [
        { empresa_id: currentEmpresaId, nome: 'Aguardando Contato', cor: '#EAB308', ordem: 1 },
        { empresa_id: currentEmpresaId, nome: 'Em Atendimento', cor: '#3B82F6', ordem: 2 },
        { empresa_id: currentEmpresaId, nome: 'Venda Concluída', cor: '#22C55E', ordem: 3 }
      ];
      await supabase.from('etapas_funil').insert(defaultEtapas);
      
      await supabase.from('leads').update({ status: 'Aguardando Contato' }).eq('status', 'novo').eq('empresa_id', currentEmpresaId);
      await supabase.from('leads').update({ status: 'Em Atendimento' }).eq('status', 'em_atendimento').eq('empresa_id', currentEmpresaId);
      await supabase.from('leads').update({ status: 'Venda Concluída' }).eq('status', 'concluido').eq('empresa_id', currentEmpresaId);
      
      const res = await supabase.from('etapas_funil').select('*').eq('empresa_id', currentEmpresaId).order('ordem', { ascending: true });
      etapasData = res.data;
    }
    
    setEtapasFunil(etapasData || []);

    const { data: leadsData } = await supabase.from('leads').select('*, vendedor:perfis(nome)').eq('empresa_id', currentEmpresaId).order('created_at', { ascending: false });
    if (leadsData) setMinhasLeads(leadsData);

    const { data: equipeData } = await supabase.from('perfis').select('*').eq('empresa_id', currentEmpresaId);
    if (equipeData) setEquipe(equipeData);

    const { data: logsData } = await supabase.from('logs_auditoria').select('*').eq('empresa_id', currentEmpresaId).order('created_at', { ascending: false }).limit(50);
    if (logsData) setLogsAuditoria(logsData);

    setLoading(false);
  };

  useEffect(() => { carregarDados(); }, [router, supabase]);

  const registrarLog = async (acao: string, entidade: string, detalhes: string) => {
    if (!empresaId || !userId) return;
    await supabase.from('logs_auditoria').insert([{ empresa_id: empresaId, usuario_id: userId, acao, entidade, detalhes, url: window.location.pathname }]);
  };

  const handleLogout = async () => {
    await registrarLog('LOGOUT', 'AUTENTICACAO', `O utilizador saiu do sistema.`);
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleCriarLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId || etapasFunil.length === 0) return;
    const responsavelId = userRole === 'vendedor' ? userId : (novaLead.vendedor_id || null);
    const valorNumerico = parseFloat(novaLead.valor) || 0;
    const primeiraEtapa = etapasFunil[0].nome; 

    await supabase.from('leads').insert([{ 
      nome: novaLead.nome, email: novaLead.email, telefone: novaLead.telefone, origem: novaLead.origem, 
      status: primeiraEtapa, empresa_id: empresaId, vendedor_id: responsavelId, valor: valorNumerico
    }]);
    
    await registrarLog('CRIAR_LEAD', 'LEAD', `Criou o contacto: ${novaLead.nome}`);
    setIsNovaLeadModalOpen(false);
    setNovaLead({ nome: '', email: '', telefone: '', origem: 'Adicionado Manualmente', vendedor_id: '', valor: '', status: '' });
    carregarDados();
  };

  const salvarEdicaoLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const responsavelId = userRole === 'vendedor' ? leadEmEdicao.vendedor_id : (leadEmEdicao.vendedor_id || null);
    const valorNumerico = parseFloat(leadEmEdicao.valor) || 0;

    await supabase.from('leads').update({ 
      nome: leadEmEdicao.nome, email: leadEmEdicao.email, telefone: leadEmEdicao.telefone, vendedor_id: responsavelId, valor: valorNumerico 
    }).eq('id', leadEmEdicao.id);
    
    await registrarLog('EDITAR_LEAD', 'LEAD', `Editou os dados de: ${leadEmEdicao.nome}`);
    setIsEditModalOpen(false);
    carregarDados();
  };

  const atualizarStatusLead = async (novoStatus: string) => {
    if (!leadSelecionada) return;
    setMinhasLeads(prev => prev.map(l => l.id === leadSelecionada.id ? { ...l, status: novoStatus } : l));
    await supabase.from('leads').update({ status: novoStatus }).eq('id', leadSelecionada.id);
    await registrarLog('ALTERAR_FASE', 'LEAD', `Moveu ${leadSelecionada.nome} para ${novoStatus}`);
    setIsStatusModalOpen(false);
  };

  const handleDropCard = async (e: React.DragEvent, novoStatus: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;

    const leadArrastada = minhasLeads.find(l => l.id === leadId);
    if (!leadArrastada || leadArrastada.status === novoStatus) return;

    setMinhasLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: novoStatus } : l));
    await supabase.from('leads').update({ status: novoStatus }).eq('id', leadId);
    await registrarLog('ALTERAR_FASE', 'LEAD', `Arrastou o cartão de ${leadArrastada.nome} para ${novoStatus}`);
  };

  const apagarLead = async () => {
    if (!leadParaApagar) return;
    await supabase.from('leads').delete().eq('id', leadParaApagar.id);
    await registrarLog('EXCLUIR_LEAD', 'LEAD', `Excluiu o contacto: ${leadParaApagar.nome}`);
    setIsDeleteModalOpen(false);
    carregarDados();
  };

  const salvarConfiguracoes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;
    setIsSavingConfig(true);
    await supabase.from('empresas').update({ nome: nomeEmpresa, cor_primaria: corPrimaria, logo_url: logoUrl }).eq('id', empresaId);
    await registrarLog('EDITAR_CONFIGURACAO', 'EMPRESA', `Alterou as configurações e cores da empresa`);
    setIsSavingConfig(false);
  };

  const adicionarEtapaFunil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId || !novaEtapaNome) return;
    const novaOrdem = etapasFunil.length > 0 ? Math.max(...etapasFunil.map(e => e.ordem)) + 1 : 1;
    
    await supabase.from('etapas_funil').insert([{ empresa_id: empresaId, nome: novaEtapaNome, cor: novaEtapaCor, ordem: novaOrdem }]);
    setNovaEtapaNome('');
    carregarDados();
  };

  const removerEtapaFunil = async (etapaId: string, etapaNome: string) => {
    const leadsNestaEtapa = minhasLeads.filter(l => l.status === etapaNome);
    if (leadsNestaEtapa.length > 0) {
      alert(`Não é possível excluir esta etapa. Existem ${leadsNestaEtapa.length} contactos nela. Mova-os para outra etapa primeiro.`);
      return;
    }
    if (confirm(`Tem certeza que deseja excluir a etapa "${etapaNome}"?`)) {
      await supabase.from('etapas_funil').delete().eq('id', etapaId);
      carregarDados();
    }
  };

  const enviarConviteEquipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId || !conviteEmail) return;
    setIsEnviandoConvite(true);
    try {
      const response = await fetch('/api/equipe/convite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: conviteEmail, empresa_id: empresaId, role: 'vendedor' })
      });
      if (response.ok) {
        alert("Convite enviado com sucesso! O vendedor receberá um e-mail.");
        setIsConvidarModalOpen(false);
        setConviteEmail('');
      } else {
        const data = await response.json();
        alert(`Erro: ${data.error}`);
      }
    } catch (err) {
      alert("Ocorreu um erro ao enviar o convite.");
    }
    setIsEnviandoConvite(false);
  };

  const abrirModalDetalhes = async (lead: any) => {
    setLeadSelecionada(lead);
    setIsDetalhesModalOpen(true);
    setNovaAnotacaoTexto('');
    setAbaFicha('anotacoes');
    
    const { data: notas } = await supabase.from('lead_anotacoes').select('*, perfis(nome)').eq('lead_id', lead.id).order('created_at', { ascending: false });
    if (notas) setAnotacoesLead(notas);

    const { data: tasks } = await supabase.from('tarefas').select('*').eq('lead_id', lead.id).order('data_vencimento', { ascending: true });
    if (tasks) setTarefasLead(tasks);
  };

  const handleAdicionarAnotacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaAnotacaoTexto.trim() || !leadSelecionada || !empresaId || !userId) return;

    const novaNota = { lead_id: leadSelecionada.id, empresa_id: empresaId, usuario_id: userId, texto: novaAnotacaoTexto };
    await supabase.from('lead_anotacoes').insert([novaNota]);
    await registrarLog('ADICIONAR_ANOTACAO', 'LEAD', `Anotou no contacto ${leadSelecionada.nome}`);
    setNovaAnotacaoTexto('');
    abrirModalDetalhes(leadSelecionada);
  };

  const apagarAnotacao = async (id: string) => {
    if (!confirm("Tem certeza que deseja apagar esta anotação?")) return;
    await supabase.from('lead_anotacoes').delete().eq('id', id);
    abrirModalDetalhes(leadSelecionada);
  };

  const handleCriarTarefa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaTarefaDesc.trim() || !novaTarefaData || !leadSelecionada || !empresaId || !userId) return;

    await supabase.from('tarefas').insert([{
      lead_id: leadSelecionada.id, empresa_id: empresaId, vendedor_id: userId,
      descricao: novaTarefaDesc, data_vencimento: new Date(novaTarefaData).toISOString()
    }]);
    setNovaTarefaDesc('');
    setNovaTarefaData('');
    abrirModalDetalhes(leadSelecionada);
  };

  const toggleTarefa = async (tarefaId: string, concluidaStatus: boolean) => {
    await supabase.from('tarefas').update({ concluida: !concluidaStatus }).eq('id', tarefaId);
    abrirModalDetalhes(leadSelecionada);
  };

  const apagarTarefa = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este follow-up?")) return;
    await supabase.from('tarefas').delete().eq('id', id);
    abrirModalDetalhes(leadSelecionada);
  };

  const copiarUrlWebhook = () => {
    if (!webhookToken) return;
    const url = `${window.location.origin}/api/webhooks/leads?token=${webhookToken}`;
    navigator.clipboard.writeText(url);
    setWebhookCopiado(true);
    setTimeout(() => setWebhookCopiado(false), 2000);
  };

  const abrirWhatsApp = (telefone: string) => {
    if (!telefone) return;
    const numeroLimpo = telefone.replace(/\D/g, '');
    const numeroFinal = numeroLimpo.length <= 11 ? `55${numeroLimpo}` : numeroLimpo;
    window.open(`https://wa.me/${numeroFinal}`, '_blank');
  };

  const leadsFiltradas = minhasLeads.filter(lead => {
    const matchBusca = lead.nome.toLowerCase().includes(termoBusca.toLowerCase()) || (lead.email && lead.email.toLowerCase().includes(termoBusca.toLowerCase()));
    const matchStatus = filtroStatus === 'todos' || lead.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const origensMap = minhasLeads.reduce((acc: any, lead) => {
    const orig = lead.origem || 'Sem origem';
    acc[orig] = (acc[orig] || 0) + 1;
    return acc;
  }, {});
  
  const dadosOrigem = Object.keys(origensMap).map(key => ({ origem: key, quantidade: origensMap[key] })).sort((a, b) => b.quantidade - a.quantidade);

  const dadosFunil = etapasFunil.map(etapa => ({
    name: etapa.nome,
    quantidade: minhasLeads.filter(l => l.status === etapa.nome).length,
    cor: etapa.cor
  })).filter(d => d.quantidade > 0);

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#F8FFFE] text-[#112031]">A carregar o seu CRM...</div>;

  return (
    <div className="flex h-screen bg-[#F8FFFE] overflow-hidden font-sans text-sm">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#112031] flex flex-col rounded-r-3xl shadow-xl z-10 text-white">
        <div className="p-8 flex flex-col items-center">
          
          {/* CORREÇÃO DO LOGÓTIPO AQUI: Fundo branco, formato quadrado arredondado e object-contain */}
          <div className="h-20 w-20 bg-white rounded-2xl flex items-center justify-center overflow-hidden mb-4 shadow-md border border-white/10 p-1">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo Empresa" className="w-full h-full object-contain" />
            ) : (
              <span className="text-3xl font-bold text-[#112031]">{nomeEmpresa ? nomeEmpresa.charAt(0).toUpperCase() : 'C'}</span>
            )}
          </div>

          <p className="text-white font-medium text-xs truncate w-full text-center">{nomeEmpresa || userEmail}</p>
          <span className="text-[10px] mt-1 uppercase tracking-wider font-bold text-gray-400">
            {userRole === 'admin' ? 'Administrador' : 'Equipe de Vendas'}
          </span>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setActiveTab('visao_geral')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl font-bold transition-all ${activeTab === 'visao_geral' ? 'bg-[#F8FFFE] text-[#112031] shadow-sm' : 'text-[#D4ECDD] hover:bg-[#152D35] hover:text-white'}`}>
            <LayoutDashboard size={18} /> Visão Geral
          </button>
          <button onClick={() => setActiveTab('oportunidades')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl font-bold transition-all ${activeTab === 'oportunidades' ? 'bg-[#F8FFFE] text-[#112031] shadow-sm' : 'text-[#D4ECDD] hover:bg-[#152D35] hover:text-white'}`}>
            <Inbox size={18} /> Oportunidades
          </button>
          <button onClick={() => setActiveTab('configuracoes')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl font-bold transition-all ${activeTab === 'configuracoes' ? 'bg-[#F8FFFE] text-[#112031] shadow-sm' : 'text-[#D4ECDD] hover:bg-[#152D35] hover:text-white'}`}>
            <Settings size={18} /> {userRole === 'admin' ? 'Configurações' : 'Meu Perfil'}
          </button>
          {userRole === 'admin' && (
            <button onClick={() => setActiveTab('integracoes')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl font-bold transition-all ${activeTab === 'integracoes' ? 'bg-[#F8FFFE] text-[#112031] shadow-sm' : 'text-[#D4ECDD] hover:bg-[#152D35] hover:text-white'}`}>
              <Plug size={18} /> Integrações e API
            </button>
          )}
        </nav>
        <div className="p-4 mb-4">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 text-[#D4ECDD] hover:text-white hover:bg-red-500/20 px-5 py-3 rounded-xl font-medium transition-all">
            <LogOut size={18} /> Sair da Conta
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-10 relative">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* TELA 1: VISÃO GERAL */}
          {activeTab === 'visao_geral' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                  <h1 className="text-xl font-bold text-[#112031]">Painel de Operações</h1>
                  <p className="text-gray-500 mt-1">Acompanhe suas métricas e o desempenho do funil de vendas.</p>
                </div>
              </div>

              {/* Cards Dinâmicos com base nas etapas */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-none shadow-sm rounded-2xl bg-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-[10px] font-bold text-gray-500 uppercase">Total Oportunidades</CardTitle>
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${corPrimaria}20`, color: corPrimaria }}><Inbox size={16} /></div>
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold text-[#112031]">{minhasLeads.length}</div></CardContent>
                </Card>
                
                {etapasFunil.slice(0, 3).map(etapa => (
                  <Card key={etapa.id} className="border-none shadow-sm rounded-2xl bg-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-[10px] font-bold text-gray-500 uppercase truncate pr-2">{etapa.nome}</CardTitle>
                      <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${etapa.cor}20`, color: etapa.cor }}><Users size={16} /></div>
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold text-[#112031]">{minhasLeads.filter(l => l.status === etapa.nome).length}</div></CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm rounded-2xl bg-white">
                  <CardHeader className="border-b border-gray-50 pb-4">
                    <CardTitle className="text-base text-[#112031]">Distribuição do Funil</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 flex justify-center items-center h-72">
                    {dadosFunil.length === 0 ? (
                      <p className="text-gray-400">Sem dados para exibir.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={dadosFunil} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={5} dataKey="quantidade">
                            {dadosFunil.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.cor} />))}
                            <RechartsLabel value={minhasLeads.length} position="centerBottom" className="text-2xl font-bold fill-[#112031]" dy={-10} />
                            <RechartsLabel value="Total" position="centerTop" className="text-xs fill-gray-500 font-medium" dy={15} />
                          </Pie>
                          <RechartsTooltip formatter={(value, name) => {
                              const percent = ((Number(value) / minhasLeads.length) * 100).toFixed(0);
                              return [`${value} Leads (${percent}%)`, name];
                            }} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                  <div className="flex flex-wrap justify-center gap-4 pb-6 px-6">
                    {dadosFunil.map(d => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-500 font-medium"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.cor }}></div> {d.name}</div>
                    ))}
                  </div>
                </Card>

                <Card className="border-none shadow-sm rounded-2xl bg-white">
                  <CardHeader className="border-b border-gray-50 pb-4">
                    <CardTitle className="text-base text-[#112031]">Leads por Origem</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 h-72">
                    {dadosOrigem.length === 0 ? (
                      <div className="flex h-full items-center justify-center"><p className="text-gray-400">Sem dados para exibir.</p></div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dadosOrigem} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="origem" interval={0} tickFormatter={(v) => v || "Sem origem"} tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                          <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                          <Bar dataKey="quantidade" fill={corPrimaria} radius={[4, 4, 0, 0]} maxBarSize={50} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TELA 2: OPORTUNIDADES (KANBAN DINÂMICO) */}
          {activeTab === 'oportunidades' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              
             <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
               <div>
                 <h1 className="text-xl font-bold text-[#112031]">Gerenciamento de Oportunidades</h1>
                 <p className="text-gray-500 mt-1">Gerencie o seu funil de vendas personalizado.</p>
               </div>
               <Button onClick={() => setIsNovaLeadModalOpen(true)} style={{ backgroundColor: corPrimaria }} className="text-white hover:opacity-90 rounded-xl px-5 py-2 flex items-center gap-2 shadow-md">
                 <Plus size={16} /> Novo contato
               </Button>
             </div>

             <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
               <div className="flex items-center gap-3 w-full sm:w-auto">
                 <div className="relative w-full sm:w-64">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                   <Input placeholder="Buscar cliente..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} className="pl-9 bg-gray-50 border-gray-200 focus-visible:ring-[#4361EE] w-full" />
                 </div>
               </div>
               <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                 <button onClick={() => setModoVisualizacao('tabela')} className={`p-2 rounded-md flex items-center gap-2 font-bold transition-all ${modoVisualizacao === 'tabela' ? 'bg-white text-[#112031] shadow-sm' : 'text-gray-500 hover:text-[#112031]'}`}><List size={16} /> <span className="hidden sm:inline">Lista</span></button>
                 <button onClick={() => setModoVisualizacao('kanban')} className={`p-2 rounded-md flex items-center gap-2 font-bold transition-all ${modoVisualizacao === 'kanban' ? 'bg-white text-[#112031] shadow-sm' : 'text-gray-500 hover:text-[#112031]'}`}><Columns size={16} /> <span className="hidden sm:inline">Kanban</span></button>
               </div>
             </div>

             {modoVisualizacao === 'tabela' && (
               <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                 <CardContent className="p-0">
                   <Table>
                     <TableHeader>
                       <TableRow className="hover:bg-transparent border-gray-100">
                         <TableHead className="py-3 px-6 font-semibold text-xs uppercase text-gray-500 tracking-wider">Cliente</TableHead>
                         <TableHead className="py-3 font-semibold text-xs uppercase text-gray-500 tracking-wider">Etapa</TableHead>
                         <TableHead className="py-3 font-semibold text-xs uppercase text-gray-500 tracking-wider">Valor</TableHead>
                         {userRole === 'admin' && <TableHead className="py-3 font-semibold text-xs uppercase text-gray-500 tracking-wider">Responsável</TableHead>}
                         <TableHead className="py-3 font-semibold text-xs uppercase text-gray-500 tracking-wider text-right px-6">Ações</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {leadsFiltradas.map((lead) => {
                         const etapaLead = etapasFunil.find(e => e.nome === lead.status);
                         const corTag = etapaLead ? etapaLead.cor : corPrimaria;
                         return (
                         <TableRow key={lead.id} className="border-gray-50 hover:bg-gray-50/50 transition-colors">
                           <TableCell className="px-6 py-4">
                             <div className="flex items-center gap-3">
                               <div className="h-10 w-10 rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: `${corPrimaria}20`, color: corPrimaria }}>
                                 {lead.nome.substring(0, 2).toUpperCase()}
                               </div>
                               <div>
                                 <div className="text-[#112031] font-bold cursor-pointer hover:opacity-70" style={{ color: corPrimaria }} onClick={() => abrirModalDetalhes(lead)}>{lead.nome}</div>
                                 <div className="text-xs text-gray-500">{lead.telefone || lead.email}</div>
                               </div>
                             </div>
                           </TableCell>
                           <TableCell>
                             <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ backgroundColor: `${corTag}20`, color: corTag }}>
                               {lead.status}
                             </span>
                           </TableCell>
                           <TableCell className="font-medium text-gray-600">
                             {formatarMoeda(lead.valor || 0)}
                           </TableCell>
                           {userRole === 'admin' && (
                             <TableCell className="text-xs text-gray-600 font-medium">
                               <div className="flex items-center gap-2"><UserCircle2 size={14} className="text-gray-400"/> {lead.vendedor?.nome || 'Sem dono'}</div>
                             </TableCell>
                           )}
                           <TableCell className="text-right px-6">
                             <div className="flex items-center justify-end gap-3 font-medium">
                               {lead.telefone && (
                                 <button onClick={() => abrirWhatsApp(lead.telefone)} className="text-green-500 hover:text-green-600" title="Chamar no WhatsApp"><Phone size={18}/></button>
                               )}
                               <button onClick={() => abrirModalDetalhes(lead)} className="text-[#112031] font-bold hover:underline ml-2">Ficha</button>
                               <button onClick={() => { setLeadEmEdicao({...lead, valor: lead.valor || ''}); setIsEditModalOpen(true); }} style={{ color: corPrimaria }} className="hover:underline">Editar</button>
                             </div>
                           </TableCell>
                         </TableRow>
                       )})}
                     </TableBody>
                   </Table>
                 </CardContent>
               </Card>
             )}

             {/* KANBAN DINÂMICO */}
             {modoVisualizacao === 'kanban' && (
               <div className="flex gap-6 overflow-x-auto pb-4 snap-x">
                 {etapasFunil.map((etapa) => (
                   <div key={etapa.id} className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 min-h-[500px] w-[320px] flex-shrink-0 snap-start" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropCard(e, etapa.nome)}>
                     <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
                       <h3 className="font-bold flex items-center gap-2" style={{ color: etapa.cor }}>
                         <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: etapa.cor }}></div>
                         {etapa.nome}
                       </h3>
                       <span className="bg-white text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full border shadow-sm">{leadsFiltradas.filter(l => l.status === etapa.nome).length}</span>
                     </div>
                     <div className="space-y-3">
                       {leadsFiltradas.filter(l => l.status === etapa.nome).map(lead => (
                         <div key={lead.id} draggable onDragStart={(e) => e.dataTransfer.setData('leadId', lead.id)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing hover:border-gray-300 transition-all hover:shadow-md" onClick={() => abrirModalDetalhes(lead)}>
                           <div className="flex justify-between items-start mb-1">
                             <div className="font-bold text-[#112031]">{lead.nome}</div>
                             {lead.telefone && (
                               <button onClick={(e) => { e.stopPropagation(); abrirWhatsApp(lead.telefone); }} className="text-green-500 hover:text-green-600 bg-green-50 p-1.5 rounded-full"><Phone size={12}/></button>
                             )}
                           </div>
                           <div className="text-xs text-gray-500 mb-2">{lead.telefone || lead.email}</div>
                           
                           {lead.valor > 0 && (
                             <div className="text-xs font-bold w-max px-2 py-0.5 rounded mb-3" style={{ backgroundColor: `${corPrimaria}15`, color: corPrimaria }}>
                               {formatarMoeda(lead.valor)}
                             </div>
                           )}

                           <div className="flex justify-between items-center mt-2 border-t border-gray-50 pt-2">
                             <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded truncate max-w-[100px]">{lead.origem || 'Sem origem'}</span>
                             {userRole === 'admin' && lead.vendedor?.nome && (
                               <span className="text-[10px] text-gray-500 flex items-center gap-1"><UserCircle2 size={12}/> {lead.vendedor.nome.split(' ')[0]}</span>
                             )}
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </div>
          )}

          {/* TELA 3: CONFIGURAÇÕES E WHITE-LABEL */}
          {activeTab === 'configuracoes' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                  <h1 className="text-xl font-bold text-[#112031]">{userRole === 'admin' ? 'Configurações da Empresa' : 'Meu Perfil'}</h1>
                  <p className="text-gray-500 mt-1">Gerencie a identidade visual e o funil de vendas do seu CRM.</p>
                </div>
              </div>

              {userRole === 'admin' ? (
                <>
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="border-none shadow-sm rounded-2xl bg-white">
                      <CardHeader className="border-b border-gray-50 pb-4">
                        <CardTitle className="text-base text-[#112031] flex items-center gap-2"><Palette size={18} style={{ color: corPrimaria }}/> Identidade Visual</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <form onSubmit={salvarConfiguracoes} className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-gray-500 uppercase">Nome da Empresa</Label>
                            <Input value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} required />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-bold text-gray-500 uppercase">Cor Principal (HEX)</Label>
                              <div className="flex gap-2">
                                <Input type="color" value={corPrimaria} onChange={(e) => setCorPrimaria(e.target.value)} className="w-12 h-10 p-1 cursor-pointer" />
                                <Input type="text" value={corPrimaria} onChange={(e) => setCorPrimaria(e.target.value)} className="flex-1 uppercase font-mono" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-bold text-gray-500 uppercase">Link do Logótipo (URL)</Label>
                              <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
                            </div>
                          </div>
                          <Button type="submit" disabled={isSavingConfig} style={{ backgroundColor: corPrimaria }} className="text-white w-full mt-4 hover:opacity-90">{isSavingConfig ? 'Salvando...' : 'Salvar Identidade'}</Button>
                        </form>
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm rounded-2xl bg-white">
                      <CardHeader className="border-b border-gray-50 pb-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-base text-[#112031]">Equipe de Vendas</CardTitle>
                        <Button onClick={() => setIsConvidarModalOpen(true)} size="sm" className="bg-[#112031] text-white h-8 hover:bg-gray-800"><UserPlus size={14} className="mr-1"/> Convidar</Button>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableBody>
                            {equipe.map((membro) => (
                              <TableRow key={membro.id}>
                                <TableCell>
                                  <div className="font-bold text-[#112031]">{membro.nome || membro.email}</div>
                                  <div className="text-xs text-gray-500">{membro.email}</div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${membro.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {membro.role}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>

                  {/* GESTÃO DE ETAPAS DO FUNIL */}
                  <Card className="border-none shadow-sm rounded-2xl bg-white mt-8">
                    <CardHeader className="border-b border-gray-50 pb-4">
                      <CardTitle className="text-base text-[#112031] flex items-center gap-2"><GripVertical size={18} style={{ color: corPrimaria }}/> Gestão do Funil de Vendas</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid md:grid-cols-2 gap-8">
                        <div>
                          <h4 className="text-sm font-bold text-gray-700 mb-4">Etapas Atuais (Ordem do Kanban)</h4>
                          <div className="space-y-3">
                            {etapasFunil.map((etapa) => (
                              <div key={etapa.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                  <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: etapa.cor }}></div>
                                  <span className="font-bold text-[#112031]">{etapa.nome}</span>
                                </div>
                                <button onClick={() => removerEtapaFunil(etapa.id, etapa.nome)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="bg-gray-50/50 p-6 rounded-xl border border-dashed border-gray-200">
                          <h4 className="text-sm font-bold text-gray-700 mb-4">Adicionar Nova Etapa</h4>
                          <form onSubmit={adicionarEtapaFunil} className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-bold text-gray-500 uppercase">Nome da Etapa</Label>
                              <Input required value={novaEtapaNome} onChange={e => setNovaEtapaNome(e.target.value)} placeholder="Ex: Proposta Enviada" className="bg-white" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-bold text-gray-500 uppercase">Cor da Etapa</Label>
                              <div className="flex gap-2">
                                <Input type="color" value={novaEtapaCor} onChange={e => setNovaEtapaCor(e.target.value)} className="w-12 h-10 p-1 bg-white cursor-pointer" />
                                <Button type="submit" style={{ backgroundColor: corPrimaria }} className="flex-1 text-white hover:opacity-90">Adicionar ao Funil</Button>
                              </div>
                            </div>
                          </form>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="border-none shadow-sm rounded-2xl bg-white">
                  <CardHeader><CardTitle className="text-base text-[#112031]">Seu Perfil</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase font-bold">E-mail Cadastrado</Label><Input disabled value={userEmail || ''} className="bg-gray-50 border-gray-100" /></div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'integracoes' && userRole === 'admin' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
             <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               <div>
                 <h1 className="text-xl font-bold text-[#112031]">Integrações e Webhooks</h1>
                 <p className="text-gray-500 mt-1">Conecte formulários e sistemas externos para criar leads automaticamente.</p>
               </div>
             </div>

             <div className="grid lg:grid-cols-2 gap-6">
               <Card className="border-none shadow-sm rounded-2xl bg-white">
                 <CardHeader className="border-b border-gray-50 pb-4 flex flex-row items-center gap-3">
                   <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${corPrimaria}20`, color: corPrimaria }}><Plug size={20}/></div>
                   <div>
                     <CardTitle className="text-base text-[#112031]">Endpoint de Recebimento</CardTitle>
                     <p className="text-xs text-gray-500 mt-1">Sua URL exclusiva para envio de requisições POST.</p>
                   </div>
                 </CardHeader>
                 <CardContent className="pt-6 space-y-4">
                   <div className="flex gap-2">
                     <Input readOnly value={webhookToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/leads?token=${webhookToken}` : 'Gerando token seguro...'} className="bg-gray-50 border-gray-200 text-gray-600 focus-visible:ring-0" />
                     <Button onClick={copiarUrlWebhook} disabled={!webhookToken} className="bg-[#112031] text-white hover:bg-[#152D35] px-4 w-32 transition-all">
                       {webhookCopiado ? <><Check size={16} className="mr-2 text-green-400"/> Copiado</> : <><Copy size={16} className="mr-2"/> Copiar</>}
                     </Button>
                   </div>
                   <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 flex gap-3 text-yellow-800">
                     <AlertCircle size={20} className="shrink-0 text-yellow-600"/>
                     <p>Mantenha este link seguro. Qualquer sistema que enviar dados criará leads automaticamente na sua <b>primeira etapa do funil</b>.</p>
                   </div>
                 </CardContent>
               </Card>
             </div>
           </div>
          )}
        </div>

        {/* ===================== MODAIS ===================== */}
        
        {/* MODAL DETALHES LEAD */}
        <Dialog open={isDetalhesModalOpen} onOpenChange={setIsDetalhesModalOpen}>
          <DialogContent className="sm:max-w-[650px] rounded-2xl p-0 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#112031] p-6 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <DialogTitle className="text-2xl font-bold text-white mb-1">{leadSelecionada?.nome}</DialogTitle>
                  <DialogDescription className="text-gray-400 text-sm flex items-center gap-4">
                    <span className="flex items-center gap-1"><Phone size={14}/> {leadSelecionada?.telefone || 'Sem telefone'}</span>
                    {leadSelecionada?.valor > 0 && <span className="font-bold text-green-400">{formatarMoeda(leadSelecionada.valor)}</span>}
                  </DialogDescription>
                </div>
                <div className="flex gap-2">
                  {leadSelecionada?.telefone && (
                    <Button variant="outline" size="sm" onClick={() => abrirWhatsApp(leadSelecionada.telefone)} className="bg-green-500 border-none text-white hover:bg-green-600 text-xs font-bold px-3">
                      WhatsApp
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => { setIsDetalhesModalOpen(false); setIsStatusModalOpen(true); }} className="bg-transparent border-white/20 text-white hover:bg-white/10 text-xs font-bold px-3">
                    Mover Etapa
                  </Button>
                </div>
              </div>
              <div className="flex gap-6 mt-6 border-b border-white/10 pb-[-2px]">
                <button onClick={() => setAbaFicha('anotacoes')} className={`pb-2 text-sm font-bold border-b-2 transition-all ${abaFicha === 'anotacoes' ? 'text-white' : 'border-transparent text-gray-400 hover:text-white'}`} style={abaFicha === 'anotacoes' ? { borderColor: corPrimaria } : {}}>Anotações</button>
                <button onClick={() => setAbaFicha('tarefas')} className={`pb-2 text-sm font-bold border-b-2 transition-all ${abaFicha === 'tarefas' ? 'text-white' : 'border-transparent text-gray-400 hover:text-white'}`} style={abaFicha === 'tarefas' ? { borderColor: corPrimaria } : {}}>Follow-ups</button>
              </div>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto bg-gray-50/50">
              {abaFicha === 'anotacoes' && (
                <div className="animate-in fade-in duration-300">
                  <form onSubmit={handleAdicionarAnotacao} className="flex gap-2 mb-6">
                    <Input required value={novaAnotacaoTexto} onChange={e => setNovaAnotacaoTexto(e.target.value)} placeholder="Registe uma interação..." className="flex-1 text-sm bg-white" />
                    <Button type="submit" style={{ backgroundColor: corPrimaria }} className="text-white hover:opacity-90 text-sm px-6">Salvar</Button>
                  </form>
                  <div className="space-y-3">
                    {anotacoesLead.map(nota => (
                      <div key={nota.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 group relative">
                        <p className="text-sm text-gray-700 leading-relaxed pr-16 whitespace-pre-wrap">{nota.texto}</p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                          <p className="text-[10px] text-gray-400 font-medium">{new Date(nota.created_at).toLocaleString('pt-BR')} - {nota.perfis?.nome || 'Usuário'}</p>
                          <button onClick={() => apagarAnotacao(nota.id)} className="hidden group-hover:block text-[10px] font-bold text-red-500">Excluir</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {abaFicha === 'tarefas' && (
                <div className="animate-in fade-in duration-300">
                  <form onSubmit={handleCriarTarefa} className="flex flex-col gap-3 mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-500">Agendar Novo Follow-up</p>
                    <div className="flex gap-2">
                      <Input required value={novaTarefaDesc} onChange={e => setNovaTarefaDesc(e.target.value)} placeholder="Ex: Ligar para apresentar proposta..." className="flex-1 text-sm bg-gray-50" />
                      <Input required type="datetime-local" value={novaTarefaData} onChange={e => setNovaTarefaData(e.target.value)} className="w-48 text-sm bg-gray-50" />
                    </div>
                    <Button type="submit" className="bg-[#112031] text-white hover:bg-gray-800 text-sm self-end px-6 mt-1">Agendar</Button>
                  </form>
                  <div className="space-y-3">
                    {tarefasLead.map(tarefa => {
                      const isAtrasada = !tarefa.concluida && new Date(tarefa.data_vencimento) < new Date();
                      return (
                        <div key={tarefa.id} className={`flex items-start gap-3 bg-white p-4 rounded-xl shadow-sm border group transition-all ${tarefa.concluida ? 'opacity-50' : isAtrasada ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}>
                          <button onClick={() => toggleTarefa(tarefa.id, tarefa.concluida)} className={`mt-0.5 ${tarefa.concluida ? 'text-green-500' : 'text-gray-300'}`}>
                            {tarefa.concluida ? <CheckSquare size={20} /> : <Square size={20} />}
                          </button>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${tarefa.concluida ? 'line-through text-gray-400' : 'text-gray-700'}`}>{tarefa.descricao}</p>
                            <p className={`text-[10px] font-bold mt-1 ${tarefa.concluida ? 'text-gray-400' : isAtrasada ? 'text-red-500' : 'text-blue-500'}`}>
                              {new Date(tarefa.data_vencimento).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                            </p>
                          </div>
                          <button onClick={() => apagarTarefa(tarefa.id)} className="hidden group-hover:block text-[10px] font-bold text-red-500 pt-1">Excluir</button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL MUDAR ETAPA (DINÂMICO) */}
        <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
          <DialogContent className="sm:max-w-[400px] rounded-2xl p-6">
            <DialogHeader><DialogTitle className="text-[#112031] text-lg font-bold">Mover para a Etapa</DialogTitle></DialogHeader>
            <div className="flex flex-col gap-3 mt-4">
              {etapasFunil.map((etapa) => (
                <Button key={etapa.id} onClick={() => atualizarStatusLead(etapa.nome)} variant="outline" className="w-full justify-start h-12 shadow-sm font-bold" style={{ borderColor: `${etapa.cor}50`, color: etapa.cor, backgroundColor: `${etapa.cor}05` }}>
                  <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: etapa.cor }}></div> {etapa.nome}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* OUTROS MODAIS BÁSICOS */}
        <Dialog open={isNovaLeadModalOpen} onOpenChange={setIsNovaLeadModalOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-2xl p-6">
            <DialogHeader><DialogTitle className="text-[#112031] text-lg font-bold">Novo contato</DialogTitle></DialogHeader>
            <form onSubmit={handleCriarLead} className="space-y-4 mt-4">
              <div className="space-y-2"><Label className="text-[10px] font-bold text-gray-500 uppercase">Nome completo *</Label><Input required value={novaLead.nome} onChange={(e) => setNovaLead({...novaLead, nome: e.target.value})} className="h-10"/></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-[10px] font-bold text-gray-500 uppercase">Telefone</Label><Input value={novaLead.telefone} onChange={(e) => setNovaLead({...novaLead, telefone: e.target.value})} className="h-10"/></div>
                <div className="space-y-2"><Label className="text-[10px] font-bold text-gray-500 uppercase">E-mail</Label><Input type="email" value={novaLead.email} onChange={(e) => setNovaLead({...novaLead, email: e.target.value})} className="h-10"/></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-[10px] font-bold text-gray-500 uppercase">Origem</Label><Input value={novaLead.origem} onChange={(e) => setNovaLead({...novaLead, origem: e.target.value})} className="h-10"/></div>
                <div className="space-y-2"><Label className="text-[10px] font-bold text-gray-500 uppercase">Valor da Oportunidade (R$)</Label><Input type="number" step="0.01" min="0" value={novaLead.valor} onChange={(e) => setNovaLead({...novaLead, valor: e.target.value})} className="h-10"/></div>
              </div>
              {userRole === 'admin' && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-500 uppercase">Responsável</Label>
                  <select value={novaLead.vendedor_id} onChange={(e) => setNovaLead({...novaLead, vendedor_id: e.target.value})} className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus-visible:ring-[#4361EE]">
                    <option value="">Sem dono específico</option>
                    {equipe.map(membro => <option key={membro.id} value={membro.id}>{membro.nome || membro.email}</option>)}
                  </select>
                </div>
              )}
              <DialogFooter className="pt-4"><Button type="button" variant="ghost" onClick={() => setIsNovaLeadModalOpen(false)}>Cancelar</Button><Button type="submit" style={{ backgroundColor: corPrimaria }} className="text-white h-10 hover:opacity-90">Salvar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-2xl p-6">
            <DialogHeader><DialogTitle className="text-[#112031] text-lg font-bold">Editar contato</DialogTitle></DialogHeader>
            <form onSubmit={salvarEdicaoLead} className="space-y-4 mt-4">
              <div className="space-y-2"><Label className="text-[10px] font-bold text-gray-500 uppercase">Nome completo *</Label><Input required value={leadEmEdicao.nome} onChange={(e) => setLeadEmEdicao({...leadEmEdicao, nome: e.target.value})} className="h-10" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-[10px] font-bold text-gray-500 uppercase">Telefone</Label><Input value={leadEmEdicao.telefone} onChange={(e) => setLeadEmEdicao({...leadEmEdicao, telefone: e.target.value})} className="h-10" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-bold text-gray-500 uppercase">E-mail</Label><Input type="email" value={leadEmEdicao.email} onChange={(e) => setLeadEmEdicao({...leadEmEdicao, email: e.target.value})} className="h-10" /></div>
              </div>
              <div className="space-y-2"><Label className="text-[10px] font-bold text-gray-500 uppercase">Valor da Oportunidade (R$)</Label><Input type="number" step="0.01" min="0" value={leadEmEdicao.valor} onChange={(e) => setLeadEmEdicao({...leadEmEdicao, valor: e.target.value})} className="h-10" /></div>
              <DialogFooter className="pt-4"><Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button><Button type="submit" style={{ backgroundColor: corPrimaria }} className="text-white h-10 hover:opacity-90">Atualizar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isConvidarModalOpen} onOpenChange={setIsConvidarModalOpen}>
          <DialogContent className="sm:max-w-[400px] rounded-2xl p-6">
            <DialogHeader><DialogTitle className="text-[#112031] text-lg font-bold">Convidar Membro</DialogTitle></DialogHeader>
            <form onSubmit={enviarConviteEquipe} className="space-y-4 mt-2">
              <div className="space-y-2"><Label className="text-[10px] font-bold text-gray-500 uppercase">E-mail do Vendedor</Label><Input required type="email" value={conviteEmail} onChange={e => setConviteEmail(e.target.value)} className="h-10" /></div>
              <DialogFooter className="pt-4"><Button type="button" variant="ghost" onClick={() => setIsConvidarModalOpen(false)}>Cancelar</Button><Button type="submit" disabled={isEnviandoConvite} className="bg-[#112031] text-white h-10">{isEnviandoConvite ? 'Enviando...' : 'Enviar Convite'}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent className="sm:max-w-[400px] rounded-2xl border-red-100 p-6">
            <DialogHeader><DialogTitle className="text-red-600 text-lg font-bold flex items-center gap-2"><Trash2 size={20} /> Excluir Cliente</DialogTitle></DialogHeader>
            <DialogFooter className="pt-4 mt-4 border-t border-gray-100"><Button type="button" variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button><Button onClick={apagarLead} className="bg-red-500 text-white h-10">Sim, Excluir</Button></DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}