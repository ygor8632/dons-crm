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
import { Building2, LayoutDashboard, Settings, LogOut, Plus, Activity, CreditCard, ShieldAlert } from "lucide-react";

export default function SuperadminDashboard() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [empresas, setEmpresas] = useState<any[]>([]);
  
  // Navegação SPA do Superadmin
  const [activeTab, setActiveTab] = useState<'visao_global' | 'gestao_clientes' | 'configuracoes'>('visao_global');

  // Estados do Modal de Novo Cliente
  const [isNovoClienteModalOpen, setIsNovoClienteModalOpen] = useState(false);
  const [isCreatingCliente, setIsCreatingCliente] = useState(false);
  const [novoCliente, setNovoCliente] = useState({ 
    nome: '', 
    email: '', 
    plano: 'Starter', 
    status: 'Ativo' 
  });

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
      setLoading(false);
    };
    verificarAcessoGlobal();
  }, [router, supabase]);

  const carregarEmpresas = async () => {
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setEmpresas(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // FUNÇÃO: Cadastrar Nova Empresa (Tenant)
  const handleCriarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingCliente(true);

    const { error } = await supabase
      .from('empresas')
      .insert([{
        nome: novoCliente.nome,
        email: novoCliente.email,
        plano: novoCliente.plano,
        status: novoCliente.status
      }]);

    setIsCreatingCliente(false);

    if (error) {
      console.error("Erro ao criar cliente:", error.message);
      alert("Houve um erro ao cadastrar o cliente. Tente novamente.");
    } else {
      setIsNovoClienteModalOpen(false);
      setNovoCliente({ nome: '', email: '', plano: 'Starter', status: 'Ativo' });
      await carregarEmpresas(); // Atualiza a tabela instantaneamente
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#F8FFFE] text-[#112031]"><ShieldAlert className="animate-pulse mr-2"/> Verificando credenciais...</div>;

  const contasAtivas = empresas.filter(e => e.status === 'Ativo').length;

  return (
    <div className="flex h-screen bg-[#F8FFFE] overflow-hidden font-sans">
      
      {/* SIDEBAR SUPERADMIN */}
      <aside className="w-64 bg-[#0A1118] flex flex-col rounded-r-3xl shadow-xl z-10 text-white border-r border-[#152D35]">
        <div className="p-8 flex flex-col items-center border-b border-[#152D35]/50">
          <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-[#345B63] to-[#112031] flex items-center justify-center text-2xl font-bold text-white mb-4 shadow-lg border border-[#D4ECDD]/20">D</div>
          <p className="text-white font-medium text-sm truncate w-full text-center">{userEmail}</p>
          <span className="text-red-400 text-xs mt-1 uppercase tracking-wider font-bold">Superadmin</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-6">
          <button onClick={() => setActiveTab('visao_global')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl font-bold transition-all ${activeTab === 'visao_global' ? 'bg-[#112031] text-white border border-[#345B63]/30 shadow-sm' : 'text-gray-400 hover:bg-[#112031] hover:text-white'}`}>
            <LayoutDashboard size={20} className={activeTab === 'visao_global' ? "text-[#D4ECDD]" : ""} /> Visão Global
          </button>
          <button onClick={() => setActiveTab('gestao_clientes')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl font-bold transition-all ${activeTab === 'gestao_clientes' ? 'bg-[#112031] text-white border border-[#345B63]/30 shadow-sm' : 'text-gray-400 hover:bg-[#112031] hover:text-white'}`}>
            <Building2 size={20} className={activeTab === 'gestao_clientes' ? "text-[#D4ECDD]" : ""} /> Gerenciar Clientes
          </button>
          <button onClick={() => setActiveTab('configuracoes')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl font-bold transition-all ${activeTab === 'configuracoes' ? 'bg-[#112031] text-white border border-[#345B63]/30 shadow-sm' : 'text-gray-400 hover:bg-[#112031] hover:text-white'}`}>
            <Settings size={20} className={activeTab === 'configuracoes' ? "text-[#D4ECDD]" : ""} /> Configurações
          </button>
        </nav>

        <div className="p-4 mb-4">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 text-gray-400 hover:text-white hover:bg-red-500/20 px-5 py-3 rounded-xl font-medium transition-all">
            <LogOut size={20} /> Sair da Conta
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL SUPERADMIN SPA */}
      <main className="flex-1 overflow-y-auto p-10 relative">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* TELA 1: Visão Global */}
          {activeTab === 'visao_global' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                  <h1 className="text-2xl font-bold text-[#112031]">Painel de Administração Dons CRM</h1>
                  <p className="text-sm text-gray-500 mt-1">Visão geral do crescimento e saúde do seu SaaS.</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-none shadow-sm rounded-2xl bg-white border-l-4 border-l-[#345B63]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total de Contas Ativas</CardTitle>
                    <Building2 className="text-[#345B63] opacity-70" size={24} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-[#112031]">{contasAtivas}</div>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm rounded-2xl bg-white border-l-4 border-l-green-500">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Receita Mensal (MRR)</CardTitle>
                    <CreditCard className="text-green-500 opacity-70" size={24} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-[#112031]">R$ 297</div>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm rounded-2xl bg-[#112031] text-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-semibold text-[#D4ECDD] uppercase tracking-wider">Leads Processadas</CardTitle>
                    <Activity className="text-[#D4ECDD]" size={24} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-white">-</div>
                    <p className="text-xs text-[#D4ECDD] opacity-80 mt-2 font-medium">Global da Plataforma</p>
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
                  <h1 className="text-2xl font-bold text-[#112031]">Gerenciamento de Clientes (Tenants)</h1>
                  <p className="text-sm text-gray-500 mt-1">Lista de empresas utilizando o software.</p>
                </div>
                {/* BOTÃO ATUALIZADO */}
                <Button 
                  onClick={() => setIsNovoClienteModalOpen(true)}
                  className="bg-[#4361EE] hover:bg-[#3A56D4] text-white rounded-xl px-6 flex items-center gap-2 shadow-md transition-all"
                >
                  <Plus size={18} /> Novo Cliente
                </Button>
              </div>

              <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                  <CardTitle className="text-lg text-[#112031]">Empresas Registradas</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="py-4 px-6 font-semibold">Empresa / Usuário</TableHead>
                        <TableHead className="py-4 font-semibold">Plano</TableHead>
                        <TableHead className="py-4 font-semibold">Status</TableHead>
                        <TableHead className="py-4 font-semibold text-right px-6">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {empresas.map((empresa) => (
                        <TableRow key={empresa.id} className="border-gray-50 hover:bg-[#F8FFFE]/50 transition-colors">
                          <TableCell className="font-medium px-6 py-4">
                            <div className="text-[#112031] font-bold">{empresa.nome}</div>
                            <div className="text-xs text-gray-500 mt-1">{empresa.email}</div>
                          </TableCell>
                          <TableCell><span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">{empresa.plano}</span></TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${empresa.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {empresa.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right px-6">
                            <Button variant="outline" size="sm" className="border-gray-200 text-[#4361EE] hover:bg-gray-50">Gerenciar Conta</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TELA 3: Configurações */}
          {activeTab === 'configuracoes' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                  <h1 className="text-2xl font-bold text-[#112031]">Configurações da Plataforma</h1>
                  <p className="text-sm text-gray-500 mt-1">Configurações globais do sistema SaaS.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL: Novo Cliente (Tenant) */}
        <Dialog open={isNovoClienteModalOpen} onOpenChange={setIsNovoClienteModalOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-[#112031] text-xl font-bold">Cadastrar Empresa</DialogTitle>
              <DialogDescription className="text-sm">Registre um novo cliente no seu sistema SaaS.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCriarCliente} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 uppercase">Nome da Empresa / Razão Social *</Label>
                <Input 
                  required 
                  value={novoCliente.nome} 
                  onChange={(e) => setNovoCliente({...novoCliente, nome: e.target.value})} 
                  className="border-gray-200 focus-visible:ring-[#4361EE]" 
                  placeholder="Ex: Agência Rocket" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 uppercase">E-mail do Cliente *</Label>
                <Input 
                  required 
                  type="email" 
                  value={novoCliente.email} 
                  onChange={(e) => setNovoCliente({...novoCliente, email: e.target.value})} 
                  className="border-gray-200 focus-visible:ring-[#4361EE]" 
                  placeholder="contato@empresa.com" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 uppercase">Plano Assinado</Label>
                  <select 
                    value={novoCliente.plano} 
                    onChange={(e) => setNovoCliente({...novoCliente, plano: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4361EE]"
                  >
                    <option value="Starter">Starter</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 uppercase">Status da Conta</Label>
                  <select 
                    value={novoCliente.status} 
                    onChange={(e) => setNovoCliente({...novoCliente, status: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4361EE]"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsNovoClienteModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-[#4361EE] text-white hover:bg-[#3A56D4]" disabled={isCreatingCliente}>
                  {isCreatingCliente ? 'Salvando...' : 'Salvar Empresa'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}