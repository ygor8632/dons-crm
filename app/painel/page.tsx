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
import { LayoutDashboard, Users, Inbox, Settings, LogOut, CheckCircle2, Clock, Phone, AlertCircle, Plus, Trash2, ArrowUpRight, CheckCircle, TrendingUp, ShieldCheck } from "lucide-react";

export default function TenantDashboard() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [minhasLeads, setMinhasLeads] = useState<any[]>([]);
  
  // Navegação SPA
  const [activeTab, setActiveTab] = useState<'visao_geral' | 'oportunidades' | 'configuracoes'>('visao_geral');
  
  // Estados para a tela de Configurações
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [planoEmpresa, setPlanoEmpresa] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Modais de Criação, Status, Apagar e Editar
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [leadSelecionada, setLeadSelecionada] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [isNovaLeadModalOpen, setIsNovaLeadModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [novaLead, setNovaLead] = useState({ nome: '', email: '', telefone: '', origem: 'Adicionado Manualmente' });
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [leadParaApagar, setLeadParaApagar] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [leadEmEdicao, setLeadEmEdicao] = useState({ id: '', nome: '', email: '', telefone: '' });
  const [isEditing, setIsEditing] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const carregarDados = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    setUserEmail(session.user.email ?? null);

    const { data: perfilData, error: perfilError } = await supabase
      .from('perfis')
      .select('empresa_id')
      .eq('id', session.user.id)
      .single();

    if (perfilError || !perfilData?.empresa_id) {
      setLoading(false);
      return;
    }

    const currentEmpresaId = perfilData.empresa_id;
    setEmpresaId(currentEmpresaId);

    // Carregar dados da Empresa para a aba Configurações
    const { data: empresaData } = await supabase
      .from('empresas')
      .select('nome, plano')
      .eq('id', currentEmpresaId)
      .single();
      
    if (empresaData) {
      setNomeEmpresa(empresaData.nome);
      setPlanoEmpresa(empresaData.plano);
    }

    // Carregar Leads
    const { data: leadsData } = await supabase
      .from('leads')
      .select('*')
      .eq('empresa_id', currentEmpresaId)
      .order('created_at', { ascending: false });

    if (leadsData) setMinhasLeads(leadsData);
    setLoading(false);
  };

  useEffect(() => {
    carregarDados();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Funções CRUD de Leads
  const handleCriarLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;
    setIsCreating(true);
    await supabase.from('leads').insert([{ ...novaLead, status: 'novo', empresa_id: empresaId }]);
    setIsCreating(false);
    setIsNovaLeadModalOpen(false);
    setNovaLead({ nome: '', email: '', telefone: '', origem: 'Adicionado Manualmente' });
    carregarDados();
  };

  const atualizarStatusLead = async (novoStatus: string) => {
    if (!leadSelecionada) return;
    setIsUpdating(true);
    await supabase.from('leads').update({ status: novoStatus }).eq('id', leadSelecionada.id);
    setIsUpdating(false);
    setIsStatusModalOpen(false);
    carregarDados();
  };

  const apagarLead = async () => {
    if (!leadParaApagar) return;
    setIsDeleting(true);
    await supabase.from('leads').delete().eq('id', leadParaApagar.id);
    setIsDeleting(false);
    setIsDeleteModalOpen(false);
    carregarDados();
  };

  const abrirModalStatus = (lead: any) => {
    setLeadSelecionada(lead);
    setIsStatusModalOpen(true);
  };

  const abrirModalApagar = (lead: any) => {
    setLeadParaApagar(lead);
    setIsDeleteModalOpen(true);
  };

  const abrirModalEditar = (lead: any) => {
    setLeadEmEdicao({ id: lead.id, nome: lead.nome, email: lead.email, telefone: lead.telefone });
    setIsEditModalOpen(true);
  };

  const salvarEdicaoLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(true);
    await supabase.from('leads').update({
      nome: leadEmEdicao.nome,
      email: leadEmEdicao.email,
      telefone: leadEmEdicao.telefone
    }).eq('id', leadEmEdicao.id);
    setIsEditing(false);
    setIsEditModalOpen(false);
    carregarDados();
  };

  // FUNÇÃO: Salvar Configurações da Empresa
  const salvarConfiguracoes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;
    
    setIsSavingConfig(true);
    const { error } = await supabase
      .from('empresas')
      .update({ nome: nomeEmpresa })
      .eq('id', empresaId);
      
    setIsSavingConfig(false);
    
    if (error) {
      alert("Erro ao salvar as configurações.");
    } else {
      alert("Configurações salvas com sucesso!");
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#F8FFFE] text-[#112031]">Carregando ambiente...</div>;

  const leadsNovas = minhasLeads.filter(l => l.status === 'novo').length || 0;
  const leadsEmAtendimento = minhasLeads.filter(l => l.status === 'em_atendimento').length || 0;

  return (
    <div className="flex h-screen bg-[#F8FFFE] overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#112031] flex flex-col rounded-r-3xl shadow-xl z-10 text-white">
        <div className="p-8 flex flex-col items-center">
          <div className="h-20 w-20 rounded-full bg-[#F8FFFE] border-2 border-[#345B63] flex items-center justify-center text-3xl font-bold text-[#112031] mb-4 shadow-inner">
            {userEmail ? userEmail.charAt(0).toUpperCase() : 'V'}
          </div>
          <p className="text-white font-medium text-sm truncate w-full text-center">{userEmail}</p>
          <span className="text-[#D4ECDD] text-xs mt-1 uppercase tracking-wider font-semibold">Equipe de Vendas</span>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button 
            onClick={() => setActiveTab('visao_geral')}
            className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl font-bold transition-all ${activeTab === 'visao_geral' ? 'bg-[#F8FFFE] text-[#112031] shadow-sm' : 'text-[#D4ECDD] hover:bg-[#152D35] hover:text-white'}`}
          >
            <LayoutDashboard size={20} /> Visão Geral
          </button>
          <button 
            onClick={() => setActiveTab('oportunidades')}
            className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl font-bold transition-all ${activeTab === 'oportunidades' ? 'bg-[#F8FFFE] text-[#112031] shadow-sm' : 'text-[#D4ECDD] hover:bg-[#152D35] hover:text-white'}`}
          >
            <Inbox size={20} /> Oportunidades
          </button>
          <button 
            onClick={() => setActiveTab('configuracoes')}
            className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl font-bold transition-all ${activeTab === 'configuracoes' ? 'bg-[#F8FFFE] text-[#112031] shadow-sm' : 'text-[#D4ECDD] hover:bg-[#152D35] hover:text-white'}`}
          >
            <Settings size={20} /> Configurações
          </button>
        </nav>
        <div className="p-4 mb-4">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 text-[#D4ECDD] hover:text-white hover:bg-red-500/20 px-5 py-3 rounded-xl font-medium transition-all">
            <LogOut size={20} /> Sair da Conta
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL SPA */}
      <main className="flex-1 overflow-y-auto p-10 relative">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* TELA 1: VISÃO GERAL */}
          {activeTab === 'visao_geral' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                  <h1 className="text-2xl font-bold text-[#112031]">Painel de Operações</h1>
                  <p className="text-sm text-gray-500 mt-1">Acompanhe as suas métricas rapidamente.</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-4">
                <Card className="border-none shadow-sm rounded-2xl bg-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-bold text-gray-500 uppercase">Receita no mês</CardTitle>
                    <div className="bg-green-100 text-green-700 p-1.5 rounded-lg"><TrendingUp size={16} /></div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-[#112031]">R$ 12.850</div>
                    <p className="text-xs text-green-600 mt-1 font-medium flex items-center gap-1"><ArrowUpRight size={12}/> 8,2% vs mês anterior</p>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm rounded-2xl bg-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-bold text-gray-500 uppercase">Total Oportunidades</CardTitle>
                    <div className="bg-blue-100 text-blue-700 p-1.5 rounded-lg"><Inbox size={16} /></div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-[#112031]">{minhasLeads.length}</div>
                    <p className="text-xs text-gray-400 mt-1 font-medium">No banco de dados</p>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm rounded-2xl bg-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-bold text-gray-500 uppercase">Aguardando Contato</CardTitle>
                    <div className="bg-yellow-100 text-yellow-700 p-1.5 rounded-lg"><Clock size={16} /></div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-[#112031]">{leadsNovas}</div>
                    <p className="text-xs text-gray-400 mt-1 font-medium">Leads novas</p>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm rounded-2xl bg-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-bold text-gray-500 uppercase">Em Atendimento</CardTitle>
                    <div className="bg-purple-100 text-purple-700 p-1.5 rounded-lg"><Users size={16} /></div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-[#112031]">{leadsEmAtendimento}</div>
                    <p className="text-xs text-gray-400 mt-1 font-medium">Negociações ativas</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-none shadow-sm rounded-2xl bg-white">
                  <CardHeader className="border-b border-gray-50 pb-4">
                    <CardTitle className="text-lg text-[#112031]">Agenda de hoje</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-bold text-gray-400 w-12">08:00</div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-[#112031]">Reunião de Fechamento</p>
                        <p className="text-xs text-gray-500">Exemplo de agenda integrada</p>
                      </div>
                      <span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded font-semibold">Agendado</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm rounded-2xl bg-white">
                  <CardHeader className="border-b border-gray-50 pb-4">
                    <CardTitle className="text-lg text-[#112031]">Requer sua atenção</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center gap-4 p-3 bg-red-50 rounded-xl border border-red-100">
                      <div className="bg-red-100 p-2 rounded-full text-red-600"><AlertCircle size={18} /></div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-red-900">Oportunidades estagnadas</p>
                        <p className="text-xs text-red-700">Leads aguardam contato há muito tempo</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TELA 2: OPORTUNIDADES (Tabela) */}
          {activeTab === 'oportunidades' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                  <h1 className="text-2xl font-bold text-[#112031]">Gerenciamento de Oportunidades</h1>
                  <p className="text-sm text-gray-500 mt-1">Gerencie o seu funil de vendas e contatos.</p>
                </div>
                <Button onClick={() => setIsNovaLeadModalOpen(true)} className="bg-[#4361EE] hover:bg-[#3A56D4] text-white rounded-xl px-6 flex items-center gap-2 shadow-md">
                  <Plus size={18} /> Novo contato
                </Button>
              </div>

              <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="border-b border-gray-50 pb-4">
                  <CardTitle className="text-lg text-[#112031]">Todos os Contatos</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-gray-100">
                        <TableHead className="py-4 px-6 font-bold text-gray-400 text-xs uppercase tracking-wider">Cliente</TableHead>
                        <TableHead className="py-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Telefone</TableHead>
                        <TableHead className="py-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Status</TableHead>
                        <TableHead className="py-4 font-bold text-gray-400 text-xs uppercase tracking-wider text-right px-6">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {minhasLeads.map((lead) => (
                        <TableRow key={lead.id} className="border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-[#112031] font-bold text-sm">
                                {lead.nome.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-[#112031] font-bold text-sm">{lead.nome}</div>
                                <div className="text-xs text-gray-500">{lead.email || 'Sem email'}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium text-gray-600">{lead.telefone || '-'}</div>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize
                              ${lead.status === 'novo' ? 'bg-yellow-100 text-yellow-800' : 
                                lead.status === 'em_atendimento' ? 'bg-blue-100 text-blue-800' : 
                                'bg-green-100 text-green-800'}`}>
                              {lead.status.replace('_', ' ')}
                            </span>
                          </TableCell>
                          <TableCell className="text-right px-6">
                            <div className="flex items-center justify-end gap-3 text-sm font-medium">
                              <button onClick={() => abrirModalStatus(lead)} className="text-[#4361EE] hover:underline">Avançar Fase</button>
                              <button onClick={() => abrirModalEditar(lead)} className="text-[#4361EE] hover:underline">Editar</button>
                              <button onClick={() => abrirModalApagar(lead)} className="text-red-500 hover:underline">Excluir</button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {minhasLeads.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-gray-500 py-12">Nenhuma oportunidade na lista.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TELA 3: CONFIGURAÇÕES FUNCIONAL */}
          {activeTab === 'configuracoes' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                  <h1 className="text-2xl font-bold text-[#112031]">Configurações da Conta</h1>
                  <p className="text-sm text-gray-500 mt-1">Gerencie os dados da sua empresa e preferências de acesso.</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm rounded-2xl bg-white">
                  <CardHeader className="border-b border-gray-50 pb-4">
                    <CardTitle className="text-lg text-[#112031]">Dados da Empresa</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <form onSubmit={salvarConfiguracoes} className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-500 uppercase">Nome da Empresa</Label>
                        <Input 
                          value={nomeEmpresa} 
                          onChange={(e) => setNomeEmpresa(e.target.value)} 
                          className="border-gray-200 focus-visible:ring-[#4361EE]"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-500 uppercase">E-mail de Acesso</Label>
                        <Input disabled value={userEmail || ''} className="bg-gray-50 text-gray-400 border-gray-100" />
                        <p className="text-xs text-gray-400">O e-mail de acesso não pode ser alterado diretamente. Entre em contato com o suporte.</p>
                      </div>
                      <Button 
                        type="submit" 
                        disabled={isSavingConfig}
                        className="bg-[#4361EE] hover:bg-[#3A56D4] text-white w-full mt-4"
                      >
                        {isSavingConfig ? 'Salvando...' : 'Salvar Alterações'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm rounded-2xl bg-[#0A1118] text-white">
                  <CardHeader className="border-b border-white/10 pb-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <ShieldCheck size={20} className="text-[#4361EE]" />
                      Detalhes do Plano
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase mb-1">Plano Atual</p>
                      <div className="text-2xl font-bold text-white">{planoEmpresa || 'Carregando...'}</div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase mb-1">Status do Sistema</p>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-sm font-bold border border-green-500/20">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        Conta Ativa e Operacional
                      </div>
                    </div>
                    <Button variant="outline" className="w-full bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white mt-4">
                      Fazer Upgrade de Plano
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* MODAIS */}
        <Dialog open={isNovaLeadModalOpen} onOpenChange={setIsNovaLeadModalOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-[#112031] text-xl font-bold">Novo contato</DialogTitle>
              <DialogDescription className="text-sm">Centralize as informações deste cliente.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCriarLead} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 uppercase">Nome completo / Razão social *</Label>
                <Input required value={novaLead.nome} onChange={(e) => setNovaLead({...novaLead, nome: e.target.value})} className="border-gray-200" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 uppercase">Telefone</Label>
                  <Input value={novaLead.telefone} onChange={(e) => setNovaLead({...novaLead, telefone: e.target.value})} className="border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 uppercase">E-mail</Label>
                  <Input type="email" value={novaLead.email} onChange={(e) => setNovaLead({...novaLead, email: e.target.value})} className="border-gray-200" />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsNovaLeadModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-[#4361EE] text-white hover:bg-[#3A56D4]" disabled={isCreating}>Salvar contato</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-[#112031] text-xl font-bold">Editar contato</DialogTitle>
              <DialogDescription className="text-sm">Atualize as informações deste cliente.</DialogDescription>
            </DialogHeader>
            <form onSubmit={salvarEdicaoLead} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 uppercase">Nome completo / Razão social *</Label>
                <Input required value={leadEmEdicao.nome} onChange={(e) => setLeadEmEdicao({...leadEmEdicao, nome: e.target.value})} className="border-[#4361EE] focus-visible:ring-[#4361EE]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 uppercase">Telefone</Label>
                  <Input value={leadEmEdicao.telefone} onChange={(e) => setLeadEmEdicao({...leadEmEdicao, telefone: e.target.value})} className="border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 uppercase">E-mail</Label>
                  <Input type="email" value={leadEmEdicao.email} onChange={(e) => setLeadEmEdicao({...leadEmEdicao, email: e.target.value})} className="border-gray-200" />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-[#4361EE] text-white hover:bg-[#3A56D4]" disabled={isEditing}>{isEditing ? 'Atualizando...' : 'Salvar contato'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
          <DialogContent className="sm:max-w-[425px] rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-[#112031] text-xl font-bold">Avançar Fase</DialogTitle>
              <DialogDescription>Mova <strong>{leadSelecionada?.nome}</strong> pelo seu funil de vendas.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-4">
              <Button onClick={() => atualizarStatusLead('novo')} className="w-full bg-yellow-100 text-yellow-800 hover:bg-yellow-200 justify-start"><Clock size={16} className="mr-2" /> Aguardando Contato (Novo)</Button>
              <Button onClick={() => atualizarStatusLead('em_atendimento')} className="w-full bg-blue-100 text-blue-800 hover:bg-blue-200 justify-start"><Phone size={16} className="mr-2" /> Em Atendimento</Button>
              <Button onClick={() => atualizarStatusLead('concluido')} className="w-full bg-green-100 text-green-800 hover:bg-green-200 justify-start"><CheckCircle2 size={16} className="mr-2" /> Venda Concluída</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent className="sm:max-w-[425px] rounded-2xl border-red-100">
            <DialogHeader>
              <DialogTitle className="text-red-600 text-xl font-bold flex items-center gap-2"><Trash2 size={24} /> Excluir Cliente</DialogTitle>
              <DialogDescription className="pt-3">Tem certeza que deseja excluir <strong>{leadParaApagar?.nome}</strong>? Esta ação é irreversível.</DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-4 mt-4 border-t border-gray-100">
              <Button type="button" variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
              <Button onClick={apagarLead} className="bg-red-500 text-white hover:bg-red-600" disabled={isDeleting}>Sim, Excluir</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}