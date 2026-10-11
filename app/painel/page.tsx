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
import { LayoutDashboard, Users, Inbox, Settings, LogOut, CheckCircle2, Clock, Phone, AlertCircle, Plus, Trash2, ArrowUpRight, Search, List, Columns, ShieldCheck, TrendingUp, MessageSquare, Edit2, UserPlus, UserCircle2, Plug } from "lucide-react";

export default function TenantDashboard() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'vendedor'>('vendedor');
  
  const [loading, setLoading] = useState(true);
  const [minhasLeads, setMinhasLeads] = useState<any[]>([]);
  const [equipe, setEquipe] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'visao_geral' | 'oportunidades' | 'configuracoes' | 'integracoes'>('visao_geral');
  const [modoVisualizacao, setModoVisualizacao] = useState<'tabela' | 'kanban'>('tabela');
  const [logsAuditoria, setLogsAuditoria] = useState<any[]>([]);
  
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [termoBuscaLogs, setTermoBuscaLogs] = useState('');

  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [leadSelecionada, setLeadSelecionada] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isNovaLeadModalOpen, setIsNovaLeadModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [novaLead, setNovaLead] = useState({ nome: '', email: '', telefone: '', origem: 'Adicionado Manualmente', vendedor_id: '' });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [leadParaApagar, setLeadParaApagar] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [leadEmEdicao, setLeadEmEdicao] = useState({ id: '', nome: '', email: '', telefone: '', vendedor_id: '' });
  const [isEditing, setIsEditing] = useState(false);

  const [isDetalhesModalOpen, setIsDetalhesModalOpen] = useState(false);
  const [anotacoesLead, setAnotacoesLead] = useState<any[]>([]);
  const [novaAnotacaoTexto, setNovaAnotacaoTexto] = useState('');
  const [isLoadingAnotacoes, setIsLoadingAnotacoes] = useState(false);
  const [anotacaoEditandoId, setAnotacaoEditandoId] = useState<string | null>(null);
  const [textoAnotacaoEditada, setTextoAnotacaoEditada] = useState('');

  const [isConvidarModalOpen, setIsConvidarModalOpen] = useState(false);
  const [novoMembro, setNovoMembro] = useState({ nome: '', email: '', role: 'vendedor' });

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

    const { data: empresaData } = await supabase.from('empresas').select('nome, plano').eq('id', currentEmpresaId).single();
    if (empresaData) { setNomeEmpresa(empresaData.nome); }

    const { data: leadsData } = await supabase.from('leads').select('*, vendedor:perfis(nome)').eq('empresa_id', currentEmpresaId).order('created_at', { ascending: false });
    if (leadsData) setMinhasLeads(leadsData);

    const { data: equipeData } = await supabase.from('perfis').select('*').eq('empresa_id', currentEmpresaId);
    if (equipeData) setEquipe(equipeData);

    const { data: logsData } = await supabase.from('logs_auditoria').select('*').eq('empresa_id', currentEmpresaId).order('created_at', { ascending: false }).limit(100);
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
    if (!empresaId) return;
    setIsCreating(true);
    
    const responsavelId = userRole === 'vendedor' ? userId : (novaLead.vendedor_id || null);

    await supabase.from('leads').insert([{ 
      nome: novaLead.nome, email: novaLead.email, telefone: novaLead.telefone, origem: novaLead.origem, 
      status: 'novo', empresa_id: empresaId, vendedor_id: responsavelId 
    }]);
    
    await registrarLog('CRIAR_LEAD', 'LEAD', `Criou o contacto: ${novaLead.nome}`);
    setIsCreating(false);
    setIsNovaLeadModalOpen(false);
    setNovaLead({ nome: '', email: '', telefone: '', origem: 'Adicionado Manualmente', vendedor_id: '' });
    carregarDados();
  };

  const salvarEdicaoLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(true);
    
    const responsavelId = userRole === 'vendedor' ? leadEmEdicao.vendedor_id : (leadEmEdicao.vendedor_id || null);

    await supabase.from('leads').update({ 
      nome: leadEmEdicao.nome, email: leadEmEdicao.email, telefone: leadEmEdicao.telefone, vendedor_id: responsavelId 
    }).eq('id', leadEmEdicao.id);
    
    await registrarLog('EDITAR_LEAD', 'LEAD', `Editou os dados de: ${leadEmEdicao.nome}`);
    setIsEditing(false);
    setIsEditModalOpen(false);
    carregarDados();
  };

  const atualizarStatusLead = async (novoStatus: string) => {
    if (!leadSelecionada) return;
    setIsUpdating(true);
    setMinhasLeads(prev => prev.map(l => l.id === leadSelecionada.id ? { ...l, status: novoStatus } : l));
    await supabase.from('leads').update({ status: novoStatus }).eq('id', leadSelecionada.id);
    await registrarLog('ALTERAR_FASE', 'LEAD', `Moveu ${leadSelecionada.nome} para ${novoStatus.replace('_', ' ')}`);
    setIsUpdating(false);
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
    await registrarLog('ALTERAR_FASE', 'LEAD', `Arrastou o cartão de ${leadArrastada.nome} para ${novoStatus.replace('_', ' ')}`);
  };

  const apagarLead = async () => {
    if (!leadParaApagar) return;
    setIsDeleting(true);
    await supabase.from('leads').delete().eq('id', leadParaApagar.id);
    await registrarLog('EXCLUIR_LEAD', 'LEAD', `Excluiu o contacto: ${leadParaApagar.nome}`);
    setIsDeleting(false);
    setIsDeleteModalOpen(false);
    carregarDados();
  };

  const salvarConfiguracoes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;
    setIsSavingConfig(true);
    await supabase.from('empresas').update({ nome: nomeEmpresa }).eq('id', empresaId);
    await registrarLog('EDITAR_CONFIGURACAO', 'EMPRESA', `Alterou o nome da empresa para: ${nomeEmpresa}`);
    setIsSavingConfig(false);
    alert("Configurações salvas com sucesso!");
  };

  const simularConviteEquipe = (e: React.FormEvent) => {
    e.preventDefault();
    alert("No ambiente real, isso enviará um e-mail com link mágico para o vendedor se cadastrar. Para testes, crie uma conta na tela de Login e defina a empresa dele no banco de dados.");
    setIsConvidarModalOpen(false);
  };

  const abrirModalStatus = (lead: any) => { setLeadSelecionada(lead); setIsStatusModalOpen(true); };
  const abrirModalApagar = (lead: any) => { setLeadParaApagar(lead); setIsDeleteModalOpen(true); };
  const abrirModalEditar = (lead: any) => { setLeadEmEdicao({ id: lead.id, nome: lead.nome, email: lead.email, telefone: lead.telefone, vendedor_id: lead.vendedor_id || '' }); setIsEditModalOpen(true); };

  const abrirModalDetalhes = async (lead: any) => {
    setLeadSelecionada(lead);
    setIsDetalhesModalOpen(true);
    setIsLoadingAnotacoes(true);
    setNovaAnotacaoTexto('');
    setAnotacaoEditandoId(null);
    
    const { data } = await supabase.from('lead_anotacoes').select('*, perfis(nome)').eq('lead_id', lead.id).order('created_at', { ascending: false });
    if (data) setAnotacoesLead(data);
    
    setIsLoadingAnotacoes(false);
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

  const salvarEdicaoAnotacao = async (id: string) => {
    if (!textoAnotacaoEditada.trim()) return;
    await supabase.from('lead_anotacoes').update({ texto: textoAnotacaoEditada }).eq('id', id);
    setAnotacaoEditandoId(null);
    abrirModalDetalhes(leadSelecionada);
  };

  const leadsFiltradas = minhasLeads.filter(lead => {
    const matchBusca = lead.nome.toLowerCase().includes(termoBusca.toLowerCase()) || (lead.email && lead.email.toLowerCase().includes(termoBusca.toLowerCase()));
    const matchStatus = filtroStatus === 'todos' || lead.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const logsFiltrados = logsAuditoria.filter(log =>
    log.acao?.toLowerCase().includes(termoBuscaLogs.toLowerCase()) || log.detalhes?.toLowerCase().includes(termoBuscaLogs.toLowerCase())
  );

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#F8FFFE] text-[#112031]">Carregando ambiente...</div>;

  return (
    <div className="flex h-screen bg-[#F8FFFE] overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#112031] flex flex-col rounded-r-3xl shadow-xl z-10 text-white">
        <div className="p-8 flex flex-col items-center">
          <div className="h-16 w-16 rounded-full bg-[#F8FFFE] border-2 border-[#345B63] flex items-center justify-center text-2xl font-bold text-[#112031] mb-4 shadow-inner">
            {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
          </div>
          <p className="text-white font-medium text-xs truncate w-full text-center">{userEmail}</p>
          <span className={`text-[10px] mt-1 uppercase tracking-wider font-bold ${userRole === 'admin' ? 'text-[#4361EE]' : 'text-[#D4ECDD]'}`}>
            {userRole === 'admin' ? 'Administrador' : 'Equipe de Vendas'}
          </span>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setActiveTab('visao_geral')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'visao_geral' ? 'bg-[#F8FFFE] text-[#112031] shadow-sm' : 'text-[#D4ECDD] hover:bg-[#152D35] hover:text-white'}`}>
            <LayoutDashboard size={18} /> Visão Geral
          </button>
          <button onClick={() => setActiveTab('oportunidades')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'oportunidades' ? 'bg-[#F8FFFE] text-[#112031] shadow-sm' : 'text-[#D4ECDD] hover:bg-[#152D35] hover:text-white'}`}>
            <Inbox size={18} /> Oportunidades
          </button>
          <button onClick={() => setActiveTab('configuracoes')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'configuracoes' ? 'bg-[#F8FFFE] text-[#112031] shadow-sm' : 'text-[#D4ECDD] hover:bg-[#152D35] hover:text-white'}`}>
            <Settings size={18} /> {userRole === 'admin' ? 'Configurações' : 'Meu Perfil'}
          </button>
          {userRole === 'admin' && (
            <button onClick={() => setActiveTab('integracoes')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'integracoes' ? 'bg-[#F8FFFE] text-[#112031] shadow-sm' : 'text-[#D4ECDD] hover:bg-[#152D35] hover:text-white'}`}>
              <Plug size={18} /> Integrações e API
            </button>
          )}
        </nav>
        <div className="p-4 mb-4">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 text-[#D4ECDD] hover:text-white hover:bg-red-500/20 px-5 py-3 rounded-xl text-sm font-medium transition-all">
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
                  <h1 className="text-xl font-bold text-[#112031]">Painel de Operações {userRole === 'admin' && "(Visão Global)"}</h1>
                  <p className="text-sm text-gray-500 mt-1">Acompanhe as suas métricas rapidamente.</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-4">
                <Card className="border-none shadow-sm rounded-2xl bg-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-bold text-gray-500 uppercase">Total Oportunidades</CardTitle>
                    <div className="bg-blue-100 text-blue-700 p-1.5 rounded-lg"><Inbox size={16} /></div>
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold text-[#112031]">{minhasLeads.length}</div></CardContent>
                </Card>
                <Card className="border-none shadow-sm rounded-2xl bg-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-bold text-gray-500 uppercase">Aguardando Contato</CardTitle>
                    <div className="bg-yellow-100 text-yellow-700 p-1.5 rounded-lg"><Clock size={16} /></div>
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold text-[#112031]">{minhasLeads.filter(l => l.status === 'novo').length}</div></CardContent>
                </Card>
                <Card className="border-none shadow-sm rounded-2xl bg-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-bold text-gray-500 uppercase">Em Atendimento</CardTitle>
                    <div className="bg-purple-100 text-purple-700 p-1.5 rounded-lg"><Users size={16} /></div>
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold text-[#112031]">{minhasLeads.filter(l => l.status === 'em_atendimento').length}</div></CardContent>
                </Card>
                <Card className="border-none shadow-sm rounded-2xl bg-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-bold text-gray-500 uppercase">Vendas Concluídas</CardTitle>
                    <div className="bg-green-100 text-green-700 p-1.5 rounded-lg"><CheckCircle2 size={16} /></div>
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold text-[#112031]">{minhasLeads.filter(l => l.status === 'concluido').length}</div></CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TELA 2: OPORTUNIDADES */}
          {activeTab === 'oportunidades' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
                <div>
                  <h1 className="text-xl font-bold text-[#112031]">Gerenciamento de Oportunidades</h1>
                  <p className="text-sm text-gray-500 mt-1">Gerencie o seu funil de vendas e contatos.</p>
                </div>
                <Button onClick={() => setIsNovaLeadModalOpen(true)} className="bg-[#4361EE] hover:bg-[#3A56D4] text-white rounded-xl px-5 py-2 flex items-center gap-2 shadow-md text-sm">
                  <Plus size={16} /> Novo contato
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <Input placeholder="Buscar cliente..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} className="pl-9 bg-gray-50 border-gray-200 focus-visible:ring-[#4361EE] w-full text-sm" />
                  </div>
                </div>
                
                <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                  <button onClick={() => setModoVisualizacao('tabela')} className={`p-2 rounded-md flex items-center gap-2 text-sm font-bold transition-all ${modoVisualizacao === 'tabela' ? 'bg-white text-[#112031] shadow-sm' : 'text-gray-500 hover:text-[#112031]'}`}><List size={16} /> <span className="hidden sm:inline">Lista</span></button>
                  <button onClick={() => setModoVisualizacao('kanban')} className={`p-2 rounded-md flex items-center gap-2 text-sm font-bold transition-all ${modoVisualizacao === 'kanban' ? 'bg-white text-[#112031] shadow-sm' : 'text-gray-500 hover:text-[#112031]'}`}><Columns size={16} /> <span className="hidden sm:inline">Kanban</span></button>
                </div>
              </div>

              {modoVisualizacao === 'tabela' && (
                <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-gray-100">
                          <TableHead className="py-3 px-6 font-semibold text-xs uppercase text-gray-500 tracking-wider">Cliente</TableHead>
                          <TableHead className="py-3 font-semibold text-xs uppercase text-gray-500 tracking-wider">Status</TableHead>
                          {userRole === 'admin' && <TableHead className="py-3 font-semibold text-xs uppercase text-gray-500 tracking-wider">Responsável</TableHead>}
                          <TableHead className="py-3 font-semibold text-xs uppercase text-gray-500 tracking-wider text-right px-6">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leadsFiltradas.map((lead) => (
                          <TableRow key={lead.id} className="border-gray-50 hover:bg-gray-50/50 transition-colors">
                            <TableCell className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-50 text-[#4361EE] flex items-center justify-center font-bold text-sm">
                                  {lead.nome.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-[#112031] font-bold text-sm cursor-pointer hover:text-[#4361EE]" onClick={() => abrirModalDetalhes(lead)}>{lead.nome}</div>
                                  <div className="text-xs text-gray-500">{lead.telefone || lead.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${lead.status === 'novo' ? 'bg-yellow-100 text-yellow-800' : lead.status === 'em_atendimento' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                {lead.status.replace('_', ' ')}
                              </span>
                            </TableCell>
                            
                            {userRole === 'admin' && (
                              <TableCell className="text-xs text-gray-600 font-medium flex items-center gap-2 mt-4">
                                <UserCircle2 size={14} className="text-gray-400"/> {lead.vendedor?.nome || 'Sem dono'}
                              </TableCell>
                            )}

                            <TableCell className="text-right px-6">
                              <div className="flex items-center justify-end gap-3 text-sm font-medium">
                                <button onClick={() => abrirModalDetalhes(lead)} className="text-[#112031] font-bold hover:underline">Ficha</button>
                                <button onClick={() => abrirModalEditar(lead)} className="text-[#4361EE] hover:underline">Editar</button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {modoVisualizacao === 'kanban' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  {['novo', 'em_atendimento', 'concluido'].map((colunaStatus) => (
                    <div key={colunaStatus} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 min-h-[500px]" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropCard(e, colunaStatus)}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-[#112031] text-sm flex items-center gap-2">
                          {colunaStatus === 'novo' ? 'Aguardando Contato' : colunaStatus === 'em_atendimento' ? 'Em Atendimento' : 'Concluído'}
                        </h3>
                        <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{leadsFiltradas.filter(l => l.status === colunaStatus).length}</span>
                      </div>
                      <div className="space-y-3">
                        {leadsFiltradas.filter(l => l.status === colunaStatus).map(lead => (
                          <div key={lead.id} draggable onDragStart={(e) => e.dataTransfer.setData('leadId', lead.id)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing hover:border-[#4361EE] transition-colors" onClick={() => abrirModalDetalhes(lead)}>
                            <div className="font-bold text-[#112031] text-sm mb-1">{lead.nome}</div>
                            <div className="text-xs text-gray-500 mb-3">{lead.telefone || lead.email}</div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">{lead.origem}</span>
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

          {/* TELA 3: CONFIGURAÇÕES E EQUIPE */}
          {activeTab === 'configuracoes' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                  <h1 className="text-xl font-bold text-[#112031]">{userRole === 'admin' ? 'Configurações da Empresa' : 'Meu Perfil'}</h1>
                  <p className="text-sm text-gray-500 mt-1">Gerencie os dados e permissões.</p>
                </div>
              </div>

              {userRole === 'admin' ? (
                <>
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="border-none shadow-sm rounded-2xl bg-white">
                      <CardHeader className="border-b border-gray-50 pb-4">
                        <CardTitle className="text-base text-[#112031]">Dados da Empresa</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <form onSubmit={salvarConfiguracoes} className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-gray-500 uppercase">Nome da Empresa</Label>
                            <Input value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} className="border-gray-200 text-sm focus-visible:ring-[#4361EE]" required />
                          </div>
                          <Button type="submit" disabled={isSavingConfig} className="bg-[#4361EE] text-sm text-white w-full mt-4">{isSavingConfig ? 'Salvando...' : 'Salvar Alterações'}</Button>
                        </form>
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm rounded-2xl bg-white">
                      <CardHeader className="border-b border-gray-50 pb-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-base text-[#112031]">Equipe de Vendas</CardTitle>
                        <Button onClick={() => setIsConvidarModalOpen(true)} size="sm" className="bg-[#112031] text-white text-xs h-8"><UserPlus size={14} className="mr-1"/> Convidar</Button>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableBody>
                            {equipe.map((membro) => (
                              <TableRow key={membro.id}>
                                <TableCell>
                                  <div className="text-sm font-bold text-[#112031]">{membro.nome || membro.email}</div>
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

                  <Card className="border-none shadow-sm rounded-2xl bg-white mt-8">
                    <CardHeader className="border-b border-gray-50 pb-4">
                      <CardTitle className="text-base text-[#112031]">Histórico de Atividades da Equipe</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader className="bg-gray-50 sticky top-0">
                          <TableRow>
                            <TableHead className="font-semibold py-3 text-xs uppercase text-gray-500 tracking-wider">Data / Hora</TableHead>
                            <TableHead className="font-semibold py-3 text-xs uppercase text-gray-500 tracking-wider">Ação</TableHead>
                            <TableHead className="font-semibold py-3 text-xs uppercase text-gray-500 tracking-wider">Detalhes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {logsFiltrados.map((log) => (
                            <TableRow key={log.id} className="hover:bg-gray-50/50">
                              <TableCell className="text-xs text-gray-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString('pt-BR')}</TableCell>
                              <TableCell><span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 uppercase">{log.acao.replace(/_/g, ' ')}</span></TableCell>
                              <TableCell className="text-xs text-gray-600">{log.detalhes}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="border-none shadow-sm rounded-2xl bg-white">
                  <CardHeader><CardTitle className="text-base text-[#112031]">O seu Perfil</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2"><Label className="text-xs text-gray-500 uppercase font-bold">E-mail Registrado</Label><Input disabled value={userEmail || ''} className="bg-gray-50 border-gray-100" /></div>
                      <div className="space-y-2"><Label className="text-xs text-gray-500 uppercase font-bold">Nível de Acesso</Label><Input disabled value="Vendedor" className="bg-gray-50 border-gray-100" /></div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* TELA 4: INTEGRAÇÕES */}
          {activeTab === 'integracoes' && userRole === 'admin' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                  <h1 className="text-xl font-bold text-[#112031]">Integrações e Webhooks</h1>
                  <p className="text-sm text-gray-500 mt-1">Conecte o seu CRM a ferramentas externas via API.</p>
                </div>
                <span className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Em Breve</span>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border border-dashed border-gray-300 shadow-none rounded-2xl bg-gray-50/50 opacity-80">
                  <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><Plug size={24}/></div>
                    <h3 className="font-bold text-[#112031]">Webhooks Personalizados</h3>
                    <p className="text-xs text-gray-500 max-w-xs">Crie URLs de recebimento para criar Leads automaticamente a partir do Facebook Ads, Typeform ou do seu site.</p>
                    <Button disabled variant="outline" className="text-xs bg-white border-gray-200 mt-2">Configurar Webhook</Button>
                  </CardContent>
                </Card>

                <Card className="border border-dashed border-gray-300 shadow-none rounded-2xl bg-gray-50/50 opacity-80">
                  <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="h-12 w-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center"><ShieldCheck size={24}/></div>
                    <h3 className="font-bold text-[#112031]">Chaves de API (API Keys)</h3>
                    <p className="text-xs text-gray-500 max-w-xs">Gere tokens seguros para realizar operações automatizadas de leitura e escrita diretamente no banco de dados do seu CRM.</p>
                    <Button disabled variant="outline" className="text-xs bg-white border-gray-200 mt-2">Gerar Chave de API</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

        </div>

        {/* ===================== MODAIS ===================== */}
        
        <Dialog open={isDetalhesModalOpen} onOpenChange={setIsDetalhesModalOpen}>
          <DialogContent className="sm:max-w-[600px] rounded-2xl p-0 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#112031] p-6 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <DialogTitle className="text-2xl font-bold text-white mb-1">{leadSelecionada?.nome}</DialogTitle>
                  <DialogDescription className="text-gray-400 text-sm flex gap-3">
                    <span className="flex items-center gap-1"><Phone size={14}/> {leadSelecionada?.telefone || 'Sem telefone'}</span>
                  </DialogDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setIsDetalhesModalOpen(false); setIsStatusModalOpen(true); }} className="bg-transparent border-white/20 text-white hover:bg-white/10 text-xs font-bold">Alterar Fase</Button>
              </div>
            </div>
            <div className="p-6 flex-1 overflow-y-auto bg-gray-50/50">
              <h3 className="font-bold text-[#112031] text-sm mb-4 flex items-center gap-2"><MessageSquare size={16} className="text-[#4361EE]"/> Histórico e Anotações</h3>
              <form onSubmit={handleAdicionarAnotacao} className="flex gap-2 mb-6">
                <Input required value={novaAnotacaoTexto} onChange={e => setNovaAnotacaoTexto(e.target.value)} placeholder="Digite um registro..." className="flex-1 text-sm bg-white" />
                <Button type="submit" className="bg-[#4361EE] text-white hover:bg-[#3A56D4] text-sm">Salvar</Button>
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
          </DialogContent>
        </Dialog>

        <Dialog open={isNovaLeadModalOpen} onOpenChange={setIsNovaLeadModalOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-2xl p-6">
            <DialogHeader><DialogTitle className="text-[#112031] text-lg font-bold">Novo contato</DialogTitle></DialogHeader>
            <form onSubmit={handleCriarLead} className="space-y-4 mt-4">
              <div className="space-y-2"><Label className="text-[10px] font-bold text-gray-500 uppercase">Nome completo *</Label><Input required value={novaLead.nome} onChange={(e) => setNovaLead({...novaLead, nome: e.target.value})} className="text-sm h-10"/></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-[10px] font-bold text-gray-500 uppercase">Telefone</Label><Input value={novaLead.telefone} onChange={(e) => setNovaLead({...novaLead, telefone: e.target.value})} className="text-sm h-10"/></div>
                <div className="space-y-2"><Label className="text-[10px] font-bold text-gray-500 uppercase">E-mail</Label><Input type="email" value={novaLead.email} onChange={(e) => setNovaLead({...novaLead, email: e.target.value})} className="text-sm h-10"/></div>
              </div>
              
              {userRole === 'admin' && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-500 uppercase">Atribuir Responsável</Label>
                  <select value={novaLead.vendedor_id} onChange={(e) => setNovaLead({...novaLead, vendedor_id: e.target.value})} className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus-visible:ring-[#4361EE]">
                    <option value="">Sem dono específico (Todos veem se Admin)</option>
                    {equipe.map(membro => <option key={membro.id} value={membro.id}>{membro.nome || membro.email}</option>)}
                  </select>
                </div>
              )}

              <DialogFooter className="pt-4"><Button type="button" variant="ghost" onClick={() => setIsNovaLeadModalOpen(false)} className="text-sm">Cancelar</Button><Button type="submit" className="bg-[#4361EE] text-white text-sm h-10">Salvar contato</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-2xl p-6">
            <DialogHeader><DialogTitle className="text-[#112031] text-lg font-bold">Editar contato</DialogTitle></DialogHeader>
            <form onSubmit={salvarEdicaoLead} className="space-y-4 mt-4">
              <div className="space-y-2"><Label className="text-[10px] font-bold text-gray-500 uppercase">Nome completo *</Label><Input required value={leadEmEdicao.nome} onChange={(e) => setLeadEmEdicao({...leadEmEdicao, nome: e.target.value})} className="text-sm h-10" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-[10px] font-bold text-gray-500 uppercase">Telefone</Label><Input value={leadEmEdicao.telefone} onChange={(e) => setLeadEmEdicao({...leadEmEdicao, telefone: e.target.value})} className="text-sm h-10" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-bold text-gray-500 uppercase">E-mail</Label><Input type="email" value={leadEmEdicao.email} onChange={(e) => setLeadEmEdicao({...leadEmEdicao, email: e.target.value})} className="text-sm h-10" /></div>
              </div>

              {userRole === 'admin' && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-500 uppercase">Atribuir Responsável</Label>
                  <select value={leadEmEdicao.vendedor_id} onChange={(e) => setLeadEmEdicao({...leadEmEdicao, vendedor_id: e.target.value})} className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus-visible:ring-[#4361EE]">
                    <option value="">Sem dono específico</option>
                    {equipe.map(membro => <option key={membro.id} value={membro.id}>{membro.nome || membro.email}</option>)}
                  </select>
                </div>
              )}

              <DialogFooter className="pt-4"><Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)} className="text-sm">Cancelar</Button><Button type="submit" className="bg-[#4361EE] text-white text-sm h-10">Atualizar contato</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isConvidarModalOpen} onOpenChange={setIsConvidarModalOpen}>
          <DialogContent className="sm:max-w-[400px] rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-[#112031] text-lg font-bold">Convidar Membro</DialogTitle>
              <DialogDescription className="text-xs mt-1">Envie um convite para adicionar um vendedor à sua empresa.</DialogDescription>
            </DialogHeader>
            <form onSubmit={simularConviteEquipe} className="space-y-4 mt-2">
              <div className="space-y-2"><Label className="text-[10px] font-bold text-gray-500 uppercase">E-mail do Vendedor</Label><Input required type="email" placeholder="vendedor@empresa.com" className="text-sm h-10" /></div>
              <DialogFooter className="pt-4"><Button type="button" variant="ghost" onClick={() => setIsConvidarModalOpen(false)}>Cancelar</Button><Button type="submit" className="bg-[#112031] text-white text-sm h-10">Enviar Convite</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
          <DialogContent className="sm:max-w-[425px] rounded-2xl p-6">
            <DialogHeader><DialogTitle className="text-[#112031] text-lg font-bold">Avançar Fase</DialogTitle></DialogHeader>
            <div className="flex flex-col gap-3 mt-4">
              <Button onClick={() => atualizarStatusLead('novo')} className="w-full bg-yellow-100 text-yellow-800 justify-start text-sm h-10"><Clock size={16} className="mr-2" /> Aguardando Contato (Novo)</Button>
              <Button onClick={() => atualizarStatusLead('em_atendimento')} className="w-full bg-blue-100 text-blue-800 justify-start text-sm h-10"><Phone size={16} className="mr-2" /> Em Atendimento</Button>
              <Button onClick={() => atualizarStatusLead('concluido')} className="w-full bg-green-100 text-green-800 justify-start text-sm h-10"><CheckCircle2 size={16} className="mr-2" /> Venda Concluída</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent className="sm:max-w-[425px] rounded-2xl border-red-100 p-6">
            <DialogHeader><DialogTitle className="text-red-600 text-lg font-bold flex items-center gap-2"><Trash2 size={20} /> Excluir Cliente</DialogTitle></DialogHeader>
            <DialogFooter className="pt-4 mt-4 border-t border-gray-100"><Button type="button" variant="ghost" onClick={() => setIsDeleteModalOpen(false)} className="text-sm">Cancelar</Button><Button onClick={apagarLead} className="bg-red-500 text-white text-sm h-10">Sim, Excluir</Button></DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}