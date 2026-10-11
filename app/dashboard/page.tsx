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
import { Building2, LayoutDashboard, Settings, LogOut, Plus, Activity, CreditCard, ShieldAlert, Search } from "lucide-react";

export default function SuperadminDashboard() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [empresas, setEmpresas] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'visao_global' | 'gestao_clientes' | 'configuracoes'>('visao_global');

  const [logsAuditoria, setLogsAuditoria] = useState<any[]>([]);
  const [termoBuscaLogs, setTermoBuscaLogs] = useState('');

  const [isNovoClienteModalOpen, setIsNovoClienteModalOpen] = useState(false);
  const [isCreatingCliente, setIsCreatingCliente] = useState(false);
  const [novoCliente, setNovoCliente] = useState({ nome: '', email: '', plano: 'Starter', status: 'Ativo' });

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const verificarAcessoGlobal = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const email = session.user.email;
      const role = session.user.user_metadata?.role;
      const isSuperAdmin = email === 'ygor8632@gmail.com' || role === 'superadmin';

      if (!isSuperAdmin) { router.push('/painel'); return; }

      setUserEmail(email ?? null);
      await carregarEmpresas();
      await carregarLogs();
      setLoading(false);
    };
    verificarAcessoGlobal();
  }, [router, supabase]);

  const carregarEmpresas = async () => {
    const { data } = await supabase.from('empresas').select('*').order('created_at', { ascending: false });
    if (data) setEmpresas(data);
  };

  const carregarLogs = async () => {
    const { data } = await supabase.from('logs_auditoria').select('*, empresas(nome)').order('created_at', { ascending: false }).limit(200);
    if (data) setLogsAuditoria(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleCriarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingCliente(true);

    const { error } = await supabase.from('empresas').insert([{
      nome: novoCliente.nome, email: novoCliente.email, plano: novoCliente.plano, status: novoCliente.status
    }]);

    setIsCreatingCliente(false);
    if (error) {
      alert("Houve um erro ao cadastrar o cliente. Tente novamente.");
    } else {
      setIsNovoClienteModalOpen(false);
      setNovoCliente({ nome: '', email: '', plano: 'Starter', status: 'Ativo' });
      await carregarEmpresas();
    }
  };

  const logsFiltrados = logsAuditoria.filter(log =>
    log.acao?.toLowerCase().includes(termoBuscaLogs.toLowerCase()) ||
    log.detalhes?.toLowerCase().includes(termoBuscaLogs.toLowerCase()) ||
    log.empresas?.nome?.toLowerCase().includes(termoBuscaLogs.toLowerCase())
  );

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#F8FFFE] text-[#112031]"><ShieldAlert className="animate-pulse mr-2"/> Verificando credenciais...</div>;

  const contasAtivas = empresas.filter(e => e.status === 'Ativo').length;

  return (
    <div className="flex h-screen bg-[#F8FFFE] overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0A1118] flex flex-col rounded-r-3xl shadow-xl z-10 text-white border-r border-[#152D35]">
        <div className="p-8 flex flex-col items-center border-b border-[#152D35]/50">
          <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-[#345B63] to-[#112031] flex items-center justify-center text-2xl font-bold text-white mb-4 shadow-lg border border-[#D4ECDD]/20">D</div>
          <p className="text-white font-medium text-sm truncate w-full text-center">{userEmail}</p>
          <span className="text-red-400 text-[10px] mt-1 uppercase tracking-wider font-bold">Superadmin</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-6">
          <button onClick={() => setActiveTab('visao_global')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'visao_global' ? 'bg-[#112031] text-white border border-[#345B63]/30 shadow-sm' : 'text-gray-400 hover:bg-[#112031] hover:text-white'}`}>
            <LayoutDashboard size={18} className={activeTab === 'visao_global' ? "text-[#D4ECDD]" : ""} /> Visão Global
          </button>
          <button onClick={() => setActiveTab('gestao_clientes')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'gestao_clientes' ? 'bg-[#112031] text-white border border-[#345B63]/30 shadow-sm' : 'text-gray-400 hover:bg-[#112031] hover:text-white'}`}>
            <Building2 size={18} className={activeTab === 'gestao_clientes' ? "text-[#D4ECDD]" : ""} /> Gerenciar Clientes
          </button>
          <button onClick={() => setActiveTab('configuracoes')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'configuracoes' ? 'bg-[#112031] text-white border border-[#345B63]/30 shadow-sm' : 'text-gray-400 hover:bg-[#112031] hover:text-white'}`}>
            <Settings size={18} className={activeTab === 'configuracoes' ? "text-[#D4ECDD]" : ""} /> Configurações
          </button>
        </nav>

        <div className="p-4 mb-4">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 text-gray-400 hover:text-white hover:bg-red-500/20 px-5 py-3 rounded-xl text-sm font-medium transition-all">
            <LogOut size={18} /> Sair da Conta
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-10 relative">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* TELA 1: Visão Global */}
          {activeTab === 'visao_global' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                  <h1 className="text-xl font-bold text-[#112031]">Painel de Administração Dons CRM</h1>
                  <p className="text-sm text-gray-500 mt-1">Visão geral do crescimento e saúde do seu SaaS.</p>
                </div>
              </div>

              {/* FONTES AJUSTADAS (text-3xl -> text-2xl, pesos mais elegantes) */}
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-none shadow-sm rounded-2xl bg-white border-l-4 border-l-[#345B63]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total de Contas Ativas</CardTitle>
                    <Building2 className="text-[#345B63] opacity-70" size={20} />
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold text-[#112031]">{contasAtivas}</div></CardContent>
                </Card>
                <Card className="border-none shadow-sm rounded-2xl bg-white border-l-4 border-l-green-500">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Receita Mensal (MRR)</CardTitle>
                    <CreditCard className="text-green-500 opacity-70" size={20} />
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold text-[#112031]">R$ 297</div></CardContent>
                </Card>
                <Card className="border-none shadow-sm rounded-2xl bg-[#112031] text-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold text-[#D4ECDD] uppercase tracking-wider">Acessos à API</CardTitle>
                    <Activity className="text-[#D4ECDD]" size={20} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">Online</div>
                    <p className="text-[11px] text-[#D4ECDD] opacity-80 mt-1 font-medium uppercase tracking-wide">Global da Plataforma</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TELA 2: Gerenciamento de Clientes */}
          {activeTab === 'gestao_clientes' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                  <h1 className="text-xl font-bold text-[#112031]">Gerenciamento de Clientes (Tenants)</h1>
                  <p className="text-sm text-gray-500 mt-1">Lista de empresas utilizando o software.</p>
                </div>
                <Button onClick={() => setIsNovoClienteModalOpen(true)} className="bg-[#4361EE] hover:bg-[#3A56D4] text-white rounded-xl px-5 py-2 flex items-center gap-2 shadow-md transition-all text-sm">
                  <Plus size={16} /> Novo Cliente
                </Button>
              </div>

              <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                  <CardTitle className="text-base text-[#112031]">Empresas Registradas</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="py-3 px-6 font-semibold text-xs uppercase text-gray-500 tracking-wider">Empresa / Usuário</TableHead>
                        <TableHead className="py-3 font-semibold text-xs uppercase text-gray-500 tracking-wider">Plano</TableHead>
                        <TableHead className="py-3 font-semibold text-xs uppercase text-gray-500 tracking-wider">Status</TableHead>
                        <TableHead className="py-3 font-semibold text-xs uppercase text-gray-500 tracking-wider text-right px-6">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {empresas.map((empresa) => (
                        <TableRow key={empresa.id} className="border-gray-50 hover:bg-[#F8FFFE]/50 transition-colors">
                          <TableCell className="font-medium px-6 py-4">
                            <div className="text-[#112031] font-bold text-sm">{empresa.nome}</div>
                            <div className="text-xs text-gray-500 mt-1">{empresa.email}</div>
                          </TableCell>
                          <TableCell><span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">{empresa.plano}</span></TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${empresa.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {empresa.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right px-6">
                            <Button variant="outline" size="sm" className="border-gray-200 text-[#4361EE] hover:bg-gray-50 text-xs">Gerenciar</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TELA 3: Configurações e Auditoria */}
          {activeTab === 'configuracoes' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
                <div>
                  <h1 className="text-xl font-bold text-[#112031]">Auditoria Global</h1>
                  <p className="text-sm text-gray-500 mt-1">Monitore todas as ações realizadas pelos clientes no sistema.</p>
                </div>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <Input placeholder="Buscar por empresa, ação ou detalhe..." value={termoBuscaLogs} onChange={(e) => setTermoBuscaLogs(e.target.value)} className="pl-9 bg-gray-50 border-gray-200 focus-visible:ring-[#4361EE] w-full text-sm" />
                </div>
              </div>

              <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-gray-50 sticky top-0">
                      <TableRow>
                        <TableHead className="font-semibold py-3 text-xs uppercase text-gray-500 tracking-wider">Data / Hora</TableHead>
                        <TableHead className="font-semibold py-3 text-xs uppercase text-gray-500 tracking-wider">Empresa</TableHead>
                        <TableHead className="font-semibold py-3 text-xs uppercase text-gray-500 tracking-wider">Ação</TableHead>
                        <TableHead className="font-semibold py-3 text-xs uppercase text-gray-500 tracking-wider">Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsFiltrados.map((log) => (
                        <TableRow key={log.id} className="hover:bg-gray-50/50">
                          <TableCell className="text-xs text-gray-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="font-bold text-[#112031] text-sm">{log.empresas?.nome || 'Sistema'}</TableCell>
                          <TableCell><span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 uppercase">{log.acao.replace(/_/g, ' ')}</span></TableCell>
                          <TableCell className="text-xs text-gray-600 max-w-xs truncate" title={log.detalhes}>{log.detalhes}</TableCell>
                        </TableRow>
                      ))}
                      {logsFiltrados.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center text-gray-500 py-12 text-sm">Nenhum registro de auditoria encontrado.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Modal Novo Cliente */}
        <Dialog open={isNovoClienteModalOpen} onOpenChange={setIsNovoClienteModalOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-[#112031] text-lg font-bold">Cadastrar Empresa</DialogTitle>
              <DialogDescription className="text-xs">Registre um novo cliente no seu sistema SaaS.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCriarCliente} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-500 uppercase">Nome da Empresa / Razão Social *</Label>
                <Input required value={novoCliente.nome} onChange={(e) => setNovoCliente({...novoCliente, nome: e.target.value})} className="border-gray-200 text-sm h-10" placeholder="Ex: Agência Rocket" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-500 uppercase">E-mail do Cliente *</Label>
                <Input required type="email" value={novoCliente.email} onChange={(e) => setNovoCliente({...novoCliente, email: e.target.value})} className="border-gray-200 text-sm h-10" placeholder="contato@empresa.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-500 uppercase">Plano Assinado</Label>
                  <select value={novoCliente.plano} onChange={(e) => setNovoCliente({...novoCliente, plano: e.target.value})} className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus-visible:ring-[#4361EE]">
                    <option value="Starter">Starter</option><option value="Pro">Pro</option><option value="Enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-500 uppercase">Status da Conta</Label>
                  <select value={novoCliente.status} onChange={(e) => setNovoCliente({...novoCliente, status: e.target.value})} className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus-visible:ring-[#4361EE]">
                    <option value="Ativo">Ativo</option><option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsNovoClienteModalOpen(false)} className="text-sm">Cancelar</Button>
                <Button type="submit" className="bg-[#4361EE] text-white text-sm h-10" disabled={isCreatingCliente}>{isCreatingCliente ? 'Salvando...' : 'Salvar Empresa'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}