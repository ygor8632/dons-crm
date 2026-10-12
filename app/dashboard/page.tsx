'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Building2, Users, Database, LogOut, ShieldCheck, Lock, Unlock, Search, Sun, Moon, Menu, X, Copy, Check, Sparkles } from "lucide-react";

export default function SuperAdminDashboard() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false); // Inicia claro para o contraste premium
  
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [todosPerfis, setTodosPerfis] = useState<any[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [termoBusca, setTermoBusca] = useState('');
  
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<any>(null);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const carregarDadosGlobais = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }
    
    const { data: meuPerfil } = await supabase.from('perfis').select('role').eq('id', session.user.id).single();
    if (meuPerfil?.role !== 'superadmin') {
      alert("Acesso Negado! Esta área é restrita a administradores master.");
      router.push('/painel');
      return;
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
    const usuarios = todosPerfis.filter(p => p.empresa_id === empresaId).length;
    return { usuarios };
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
      
      {/* OVERLAY MOBILE */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* SIDEBAR COM A PALETA PREMIUM ESCURA */}
      <aside 
        className={`fixed md:relative z-50 h-full w-64 flex flex-col transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{
          backgroundColor: '#021024',
          borderRight: '1px solid #052659',
          color: '#C1E8FF'
        }}
      >
        <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden absolute top-4 right-4 text-[#7DA0CA] hover:text-white p-2">
          <X size={20} />
        </button>

        {/* LOGO / HEADER SIDEBAR */}
        <div className="p-6 flex flex-col items-center border-b border-[#052659]">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-3 shadow-md shadow-black/40" style={{ backgroundColor: '#052659', color: '#ffffff' }}>
            <Sparkles size={22} className="text-[#C1E8FF]" />
          </div>
          <span className="font-bold text-xs tracking-tight text-white">Dons Control Tower</span>
          <span className="text-[10px] mt-1 px-2.5 py-0.5 rounded-full font-mono tracking-wider" style={{ backgroundColor: '#052659', color: '#C1E8FF' }}>
            Superadmin
          </span>
        </div>

        {/* NAVEGAÇÃO LATERAL */}
        <nav className="flex-1 px-3 space-y-2 py-6">
          <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all" style={{ backgroundColor: '#052659', color: '#ffffff', fontWeight: '700' }}>
            <Building2 size={16} style={{ color: '#ffffff' }} /> Gestão de Organizações
          </button>
        </nav>

        {/* USER / CONTROLO DE TEMA */}
        <div className="p-4 border-t border-[#052659] space-y-3">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs transition-all font-medium hover:bg-[#052659]"
              style={{ backgroundColor: '#052659', color: '#C1E8FF', border: '1px solid #5483B3' }}
            >
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
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative rounded-l-none md:rounded-l-3xl border-l-0 md:border-l" style={{ borderColor: darkMode ? '#27272a' : '#e4e4e7', backgroundColor: darkMode ? '#09090b' : '#f4f7f9' }}>
        
        {/* HEADER MOBILE */}
        <header className={`md:hidden border-b p-4 flex items-center justify-between shadow-xs z-30 ${darkMode ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-zinc-200'}`}>
          <div className="flex items-center gap-3 font-semibold">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-1 rounded-lg">
              <Menu size={20} />
            </button>
            <span className="text-xs font-bold text-[#5483B3]">Torre de Controlo</span>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-xl border border-inherit">
            {darkMode ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
          </button>
        </header>

        {/* ÁREA DE SCROLL */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* CABEÇALHO DA SEÇÃO */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2 border-b border-inherit">
              <div>
                <h1 className="text-lg md:text-xl font-bold tracking-tight">Visão Geral do SaaS</h1>
                <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Monitorização em tempo real de todas as organizações cadastradas no ecossistema.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Sistema Operacional
                </span>
              </div>
            </div>

            {/* GRID DE MÉTRICAS */}
            <div className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-3">
              <div className={`p-5 rounded-2xl border transition-all relative overflow-hidden ${darkMode ? 'bg-[#121216] border-zinc-800/80 shadow-lg' : 'bg-white border-zinc-200 shadow-sm'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-semibold uppercase tracking-wider ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Empresas Ativas</span>
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"><Building2 size={16} /></div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight">{empresas.length}</span>
                </div>
              </div>

              <div className={`p-5 rounded-2xl border transition-all relative overflow-hidden ${darkMode ? 'bg-[#121216] border-zinc-800/80 shadow-lg' : 'bg-white border-zinc-200 shadow-sm'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-semibold uppercase tracking-wider ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Total de Usuários</span>
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20"><Users size={16} /></div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight">{todosPerfis.length}</span>
                </div>
              </div>

              <div className={`p-5 rounded-2xl border transition-all relative overflow-hidden ${darkMode ? 'bg-[#121216] border-zinc-800/80 shadow-lg' : 'bg-white border-zinc-200 shadow-sm'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-semibold uppercase tracking-wider ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Volume de Leads</span>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><Database size={16} /></div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight">{totalLeads}</span>
                </div>
              </div>
            </div>

            {/* TABELA DE GESTÃO DE EMPRESAS */}
            <div className={`rounded-2xl border overflow-hidden transition-all ${darkMode ? 'bg-[#121216] border-zinc-800/80' : 'bg-white border-zinc-200 shadow-sm'}`}>
              <div className={`p-4 md:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${darkMode ? 'border-zinc-800/80' : 'border-zinc-100'}`}>
                <div>
                  <h3 className="font-bold text-sm md:text-base">Organizações Cadastradas</h3>
                  <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Gerencie o acesso e identidades de cada tenant.</p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                  <Input 
                    placeholder="Filtrar por nome..." 
                    value={termoBusca} 
                    onChange={(e) => setTermoBusca(e.target.value)} 
                    className={`pl-9 text-xs h-9 rounded-xl border transition-colors ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`} 
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow className={`border-b ${darkMode ? 'border-zinc-800/80 hover:bg-transparent' : 'border-zinc-100 hover:bg-transparent'}`}>
                      <TableHead className={`py-3.5 px-6 font-semibold text-[11px] uppercase tracking-wider ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Organização</TableHead>
                      <TableHead className={`py-3.5 font-semibold text-[11px] uppercase tracking-wider text-center ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Data de Cadastro</TableHead>
                      <TableHead className={`py-3.5 font-semibold text-[11px] uppercase tracking-wider text-center ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Membros</TableHead>
                      <TableHead className={`py-3.5 font-semibold text-[11px] uppercase tracking-wider text-center ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Status do Acesso</TableHead>
                      <TableHead className={`py-3.5 px-6 font-semibold text-[11px] uppercase tracking-wider text-right ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {empresasFiltradas.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-zinc-400 text-xs">Nenhuma organização encontrada.</TableCell></TableRow>
                    ) : (
                      empresasFiltradas.map((empresa) => {
                        const stats = getEstatisticasEmpresa(empresa.id);
                        return (
                          <TableRow key={empresa.id} className={`border-b transition-colors ${darkMode ? 'border-zinc-800/50 hover:bg-zinc-800/30' : 'border-zinc-50 hover:bg-zinc-50/80'}`}>
                            <TableCell className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-sm" style={{ backgroundColor: empresa.cor_primaria || '#5483B3' }}>
                                  {empresa.nome ? empresa.nome.substring(0, 2).toUpperCase() : '??'}
                                </div>
                                <div>
                                  <div className="font-bold text-xs">{empresa.nome || 'Organização Sem Nome'}</div>
                                  <button 
                                    onClick={() => copiarIdEmpresa(empresa.id)} 
                                    className={`text-[10px] font-mono mt-0.5 flex items-center gap-1 transition-colors ${darkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'}`}
                                    title="Copiar ID da Empresa"
                                  >
                                    ID: {empresa.id.substring(0, 10)}... 
                                    {copiadoId === empresa.id ? <Check size={11} className="text-emerald-500"/> : <Copy size={11}/>}
                                  </button>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-xs font-medium text-zinc-500">
                              {new Date(empresa.created_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${darkMode ? 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/50' : 'bg-zinc-100 text-zinc-700'}`}>
                                {stats.usuarios} {stats.usuarios === 1 ? 'membro' : 'membros'}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${empresa.ativo ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${empresa.ativo ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                {empresa.ativo ? 'Ativa' : 'Suspensa'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right px-6">
                              <Button 
                                onClick={() => { setEmpresaSelecionada(empresa); setIsBlockModalOpen(true); }}
                                variant="outline" 
                                size="sm"
                                className={`h-8 text-xs font-medium rounded-xl transition-all ${empresa.ativo ? 'border-red-500/30 text-red-600 hover:bg-red-500/10' : 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10'}`}
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

      {/* MODAL DE CONFIRMAÇÃO DE ESTADO */}
      <Dialog open={isBlockModalOpen} onOpenChange={setIsBlockModalOpen}>
        <DialogContent className={`rounded-2xl p-6 border shadow-2xl ${darkMode ? 'bg-[#121216] border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'}`}>
          <DialogHeader>
            <DialogTitle className="text-sm md:text-base font-bold flex items-center gap-2.5">
              {empresaSelecionada?.ativo ? <div className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20"><Lock size={16}/></div> : <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><Unlock size={16}/></div>}
              {empresaSelecionada?.ativo ? 'Suspender Organização' : 'Reativar Organização'}
            </DialogTitle>
            <DialogDescription className={`text-xs mt-2 leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {empresaSelecionada?.ativo 
                ? `Ao suspender a organização "${empresaSelecionada?.nome}", todos os usuários vinculados perderão o acesso ao CRM imediatamente.`
                : `Ao reativar a organização "${empresaSelecionada?.nome}", o acesso à plataforma será restabelecido instantaneamente.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 border-t border-inherit mt-2 flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setIsBlockModalOpen(false)} className="text-xs rounded-xl">Cancelar</Button>
            <Button 
              onClick={toggleStatusEmpresa} 
              className={`text-xs font-semibold rounded-xl px-4 ${empresaSelecionada?.ativo ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
            >
              {empresaSelecionada?.ativo ? 'Confirmar Suspensão' : 'Confirmar Reativação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}