'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Users, Database, LogOut, Lock, Unlock, Search, Sun, Moon, Menu, X, Copy, Check, Sparkles, Plus, Rocket } from "lucide-react";

export default function SuperAdminDashboard() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false); 
  
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [todosPerfis, setTodosPerfis] = useState<any[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [termoBusca, setTermoBusca] = useState('');
  
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<any>(null);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Estados para a Nova Implementação (Onboarding)
  const [isNovaEmpresaModalOpen, setIsNovaEmpresaModalOpen] = useState(false);
  const [isCriando, setIsCriando] = useState(false);
  const [novaEmp, setNovaEmp] = useState({ 
    nome: '', 
    emailAdmin: '', 
    plano: 'trial', 
    validoAte: '' 
  });

  const router = useRouter();
  const supabase = createClient();

  const carregarDadosGlobais = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }
    
    const { data: meuPerfil } = await supabase.from('perfis').select('role').eq('id', session.user.id).single();
    if (meuPerfil?.role !== 'superadmin') {
      alert("Acesso Negado!"); router.push('/painel'); return;
    }

    setUserEmail(session.user.email ?? null);

    const { data: empresasData } = await supabase.from('empresas').select('*').order('created_at', { ascending: false });
    const { data: perfisData } = await supabase.from('perfis').select('id, empresa_id');
    const { count: leadsCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });

    if (empresasData) setEmpresas(empresasData);
    if (perfisData) setTodosPerfis(perfisData);
    if (leadsCount !== null) setTotalLeads(leadsCount);

    setLoading(false);
  };

  useEffect(() => { carregarDadosGlobais(); }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const toggleStatusEmpresa = async () => {
    if (!empresaSelecionada) return;
    const novoStatus = !empresaSelecionada.ativo;
    await supabase.from('empresas').update({ ativo: novoStatus }).eq('id', empresaSelecionada.id);
    setEmpresas(prev => prev.map(emp => emp.id === empresaSelecionada.id ? { ...emp, ativo: novoStatus } : emp));
    setIsBlockModalOpen(false);
  };

  const copiarIdEmpresa = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const getEstatisticasEmpresa = (empresaId: string) => {
    return { usuarios: todosPerfis.filter(p => p.empresa_id === empresaId).length };
  };

  // FLUXO COMPLETO DE ONBOARDING
  const handleNovaImplementacao = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCriando(true);

    try {
      // 1. Criar a Empresa (Tenant)
      const tokenRandom = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const dataValidade = novaEmp.validoAte ? new Date(novaEmp.validoAte).toISOString() : null;

      const { data: emp, error: erroEmp } = await supabase.from('empresas').insert([{
        nome: novaEmp.nome,
        plano: novaEmp.plano,
        valido_ate: dataValidade,
        webhook_token: tokenRandom,
        ativo: true
      }]).select().single();

      if (erroEmp) throw erroEmp;

      // 2. Semear Etapas do Funil Base
      const defaultEtapas = [
        { empresa_id: emp.id, nome: 'Aguardando Contato', cor: '#f59e0b', ordem: 1 },
        { empresa_id: emp.id, nome: 'Em Atendimento', cor: '#5483B3', ordem: 2 },
        { empresa_id: emp.id, nome: 'Venda Concluída', cor: '#10b981', ordem: 3 }
      ];
      const { error: erroFunil } = await supabase.from('etapas_funil').insert(defaultEtapas);
      if (erroFunil) console.error("Erro ao semear funil:", erroFunil);

      // 3. Disparar Convite Mágico para o Admin
      const resp = await fetch('/api/equipe/convite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: novaEmp.emailAdmin, empresa_id: emp.id, role: 'admin' })
      });
      
      const respData = await resp.json();
      if (!resp.ok) throw new Error(respData.error || "Falha na API de convite.");

      alert(`Implementação de "${novaEmp.nome}" concluída! Convite enviado para ${novaEmp.emailAdmin}.`);
      setIsNovaEmpresaModalOpen(false);
      setNovaEmp({ nome: '', emailAdmin: '', plano: 'trial', validoAte: '' });
      carregarDadosGlobais();
      
    } catch (error: any) {
      alert("Erro ao realizar implementação: " + error.message);
    } finally {
      setIsCriando(false);
    }
  };

  const empresasFiltradas = empresas.filter(emp => emp.nome?.toLowerCase().includes(termoBusca.toLowerCase()));

  if (loading) return (
    <div className={`flex h-screen items-center justify-center font-sans ${darkMode ? 'bg-[#09090b] text-white' : 'bg-[#fafafa] text-zinc-900'}`}>
      <div className="flex items-center gap-3 animate-pulse">
        <div className="w-3 h-3 rounded-full bg-indigo-500 animate-ping"></div>
        <span className="font-medium text-xs tracking-wide uppercase">Carregando painel master...</span>
      </div>
    </div>
  );

  return (
    <div className={`flex h-screen overflow-hidden font-sans text-xs md:text-sm transition-colors duration-300 ${darkMode ? 'bg-[#09090b] text-zinc-100' : 'bg-[#f4f7f9] text-zinc-900'}`}>
      
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* SIDEBAR COM A PALETA PREMIUM ESCURA */}
      <aside 
        className={`fixed md:relative z-50 h-full w-64 flex flex-col transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{ backgroundColor: '#021024', borderRight: '1px solid #052659', color: '#C1E8FF' }}
      >
        <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden absolute top-4 right-4 text-[#7DA0CA] hover:text-white p-2"><X size={20} /></button>

        <div className="p-6 flex flex-col items-center border-b border-[#052659]">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-3 shadow-md shadow-black/40" style={{ backgroundColor: '#052659', color: '#ffffff' }}>
            <Sparkles size={22} className="text-[#C1E8FF]" />
          </div>
          <span className="font-bold text-xs tracking-tight text-white">Dons Control Tower</span>
          <span className="text-[10px] mt-1 px-2.5 py-0.5 rounded-full font-mono tracking-wider" style={{ backgroundColor: '#052659', color: '#C1E8FF' }}>Superadmin</span>
        </div>

        <nav className="flex-1 px-3 space-y-2 py-6">
          <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all" style={{ backgroundColor: '#052659', color: '#ffffff', fontWeight: '700' }}>
            <Building2 size={16} style={{ color: '#ffffff' }} /> Gestão de Organizações
          </button>
        </nav>

        <div className="p-4 border-t border-[#052659] space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs transition-all font-medium hover:bg-[#052659]" style={{ backgroundColor: '#052659', color: '#C1E8FF', border: '1px solid #5483B3' }}>
              {darkMode ? <Sun size={14} className="text-[#C1E8FF]" /> : <Moon size={14} className="text-[#C1E8FF]" />}
              <span>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
            </button>
            <button onClick={handleLogout} title="Sair" className="p-2.5 rounded-xl transition-all hover:bg-red-500/20 text-red-400" style={{ backgroundColor: '#052659', border: '1px solid #5483B3' }}>
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative md:rounded-l-3xl md:border-l" style={{ borderColor: darkMode ? '#27272a' : '#e4e4e7', backgroundColor: darkMode ? '#09090b' : '#f4f7f9' }}>
        
        <header className={`md:hidden border-b p-4 flex items-center justify-between shadow-xs z-30 ${darkMode ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-zinc-200'}`}>
          <div className="flex items-center gap-3 font-semibold">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-1 rounded-lg"><Menu size={20} /></button>
            <span className="text-xs font-bold text-[#5483B3]">Torre de Controlo</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="max-w-6xl mx-auto space-y-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-inherit">
              <div>
                <h1 className="text-lg md:text-xl font-bold tracking-tight">Visão Geral do SaaS</h1>
                <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Monitorização em tempo real de clientes e acessos.</p>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Button onClick={() => setIsNovaEmpresaModalOpen(true)} className="w-full md:w-auto font-bold text-xs rounded-xl shadow-lg hover:-translate-y-0.5 transition-transform text-white" style={{ backgroundColor: '#5483B3' }}>
                  <Rocket size={14} className="mr-2" /> Nova Implementação
                </Button>
              </div>
            </div>

            {/* GRID DE MÉTRICAS */}
            <div className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-3">
              <div className={`p-5 rounded-2xl border transition-all ${darkMode ? 'bg-[#121216] border-zinc-800/80 shadow-lg' : 'bg-white border-zinc-200 shadow-sm'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Empresas Ativas</span>
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500"><Building2 size={16} /></div>
                </div>
                <div className="mt-4 text-3xl font-extrabold tracking-tight">{empresas.length}</div>
              </div>
              <div className={`p-5 rounded-2xl border transition-all ${darkMode ? 'bg-[#121216] border-zinc-800/80 shadow-lg' : 'bg-white border-zinc-200 shadow-sm'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Total de Usuários</span>
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500"><Users size={16} /></div>
                </div>
                <div className="mt-4 text-3xl font-extrabold tracking-tight">{todosPerfis.length}</div>
              </div>
              <div className={`p-5 rounded-2xl border transition-all ${darkMode ? 'bg-[#121216] border-zinc-800/80 shadow-lg' : 'bg-white border-zinc-200 shadow-sm'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Volume de Leads</span>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500"><Database size={16} /></div>
                </div>
                <div className="mt-4 text-3xl font-extrabold tracking-tight">{totalLeads}</div>
              </div>
            </div>

            {/* TABELA DE GESTÃO DE EMPRESAS */}
            <div className={`rounded-2xl border overflow-hidden transition-all ${darkMode ? 'bg-[#121216] border-zinc-800/80' : 'bg-white border-zinc-200 shadow-sm'}`}>
              <div className={`p-4 md:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${darkMode ? 'border-zinc-800/80' : 'border-zinc-100'}`}>
                <div>
                  <h3 className="font-bold text-sm md:text-base">Organizações Cadastradas</h3>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                  <Input placeholder="Filtrar por nome..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} className={`pl-9 text-xs h-9 rounded-xl border ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-200'}`} />
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow className={`border-b ${darkMode ? 'border-zinc-800/80 hover:bg-transparent' : 'border-zinc-100 hover:bg-transparent'}`}>
                      <TableHead className="py-3.5 px-6 font-semibold text-[11px] uppercase tracking-wider">Organização</TableHead>
                      <TableHead className="py-3.5 font-semibold text-[11px] uppercase tracking-wider text-center">Plano</TableHead>
                      <TableHead className="py-3.5 font-semibold text-[11px] uppercase tracking-wider text-center">Validade</TableHead>
                      <TableHead className="py-3.5 font-semibold text-[11px] uppercase tracking-wider text-center">Status</TableHead>
                      <TableHead className="py-3.5 px-6 font-semibold text-[11px] uppercase tracking-wider text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {empresasFiltradas.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-zinc-400 text-xs">Nenhuma organização encontrada.</TableCell></TableRow>
                    ) : (
                      empresasFiltradas.map((empresa) => {
                        const stats = getEstatisticasEmpresa(empresa.id);
                        const dataVenc = empresa.valido_ate ? new Date(empresa.valido_ate) : null;
                        const isVencido = dataVenc ? dataVenc < new Date() : false;
                        
                        return (
                          <TableRow key={empresa.id} className={`border-b transition-colors ${darkMode ? 'border-zinc-800/50 hover:bg-zinc-800/30' : 'border-zinc-50 hover:bg-zinc-50/80'}`}>
                            <TableCell className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center font-bold text-xs text-white" style={{ backgroundColor: empresa.cor_primaria || '#5483B3' }}>
                                  {empresa.nome ? empresa.nome.substring(0, 2).toUpperCase() : '??'}
                                </div>
                                <div>
                                  <div className="font-bold text-xs">{empresa.nome}</div>
                                  <div className="text-[10px] text-zinc-500 mt-0.5">{stats.usuarios} {stats.usuarios === 1 ? 'membro' : 'membros'}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${darkMode ? 'bg-zinc-800/80 text-zinc-300 border-zinc-700/50' : 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}>
                                {empresa.plano || 'N/A'}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                               {dataVenc ? (
                                 <span className={`text-xs font-semibold ${isVencido ? 'text-red-500' : (darkMode ? 'text-zinc-300' : 'text-zinc-700')}`}>
                                   {dataVenc.toLocaleDateString('pt-BR')}
                                 </span>
                               ) : (
                                 <span className="text-[10px] text-zinc-500">Vitalício</span>
                               )}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${empresa.ativo ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
                                {empresa.ativo ? 'Ativa' : 'Suspensa'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right px-6">
                              <Button 
                                onClick={() => { setEmpresaSelecionada(empresa); setIsBlockModalOpen(true); }}
                                variant="outline" size="sm"
                                className={`h-8 text-xs font-medium rounded-xl ${empresa.ativo ? 'border-red-500/30 text-red-600 hover:bg-red-500/10' : 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10'}`}
                              >
                                {empresa.ativo ? <><Lock size={12} className="mr-1.5"/> Suspender</> : <><Unlock size={12} className="mr-1.5"/> Reativar</>}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* MODAL NOVA IMPLEMENTAÇÃO (ONBOARDING) */}
      <Dialog open={isNovaEmpresaModalOpen} onOpenChange={setIsNovaEmpresaModalOpen}>
        <DialogContent className={`rounded-2xl p-6 border ${darkMode ? 'bg-[#121216] border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'}`}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Rocket size={18} style={{ color: '#5483B3' }}/> Nova Implementação
            </DialogTitle>
            <DialogDescription className="text-xs">Crie o ambiente do cliente, insira o funil inicial e convide o Admin.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleNovaImplementacao} className="space-y-4 mt-2">
            <div>
              <Label className="text-[10px] font-bold text-zinc-400 uppercase">Nome da Organização *</Label>
              <Input required value={novaEmp.nome} onChange={(e) => setNovaEmp({...novaEmp, nome: e.target.value})} placeholder="Empresa XPTO" className={`mt-1 text-xs h-9 rounded-xl ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : ''}`} />
            </div>
            <div>
              <Label className="text-[10px] font-bold text-zinc-400 uppercase">E-mail do Administrador (Cliente) *</Label>
              <Input required type="email" value={novaEmp.emailAdmin} onChange={(e) => setNovaEmp({...novaEmp, emailAdmin: e.target.value})} placeholder="admin@empresa.com" className={`mt-1 text-xs h-9 rounded-xl ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : ''}`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] font-bold text-zinc-400 uppercase">Plano</Label>
                <select value={novaEmp.plano} onChange={(e) => setNovaEmp({...novaEmp, plano: e.target.value})} className={`mt-1 w-full text-xs h-9 rounded-xl px-3 border outline-none ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-200'}`}>
                  <option value="trial">Trial (Teste)</option>
                  <option value="basico">Básico</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <Label className="text-[10px] font-bold text-zinc-400 uppercase">Válido Até (Opcional)</Label>
                <Input type="date" value={novaEmp.validoAte} onChange={(e) => setNovaEmp({...novaEmp, validoAte: e.target.value})} className={`mt-1 text-xs h-9 rounded-xl ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : ''}`} />
              </div>
            </div>
            <DialogFooter className="pt-3 border-t border-inherit">
              <Button type="button" variant="ghost" onClick={() => setIsNovaEmpresaModalOpen(false)} className="text-xs h-9">Cancelar</Button>
              <Button type="submit" disabled={isCriando} style={{ backgroundColor: '#5483B3' }} className="text-white text-xs rounded-xl h-9 hover:opacity-90">
                {isCriando ? 'Implementando...' : 'Iniciar Onboarding'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL SUSPENDER/REATIVAR */}
      <Dialog open={isBlockModalOpen} onOpenChange={setIsBlockModalOpen}>
        <DialogContent className={`rounded-2xl p-6 border sm:max-w-md ${darkMode ? 'bg-[#121216] border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'}`}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              {empresaSelecionada?.ativo ? <Lock size={16} className="text-red-500"/> : <Unlock size={16} className="text-emerald-500"/>}
              {empresaSelecionada?.ativo ? 'Suspender Acesso' : 'Reativar Acesso'}
            </DialogTitle>
            <DialogDescription className="text-xs mt-2">
              {empresaSelecionada?.ativo ? 'Esta ação bloqueará o login de toda a equipa imediatamente.' : 'O acesso à plataforma será restabelecido.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => setIsBlockModalOpen(false)} className="text-xs h-9">Cancelar</Button>
            <Button onClick={toggleStatusEmpresa} className={`text-xs h-9 rounded-xl text-white ${empresaSelecionada?.ativo ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}