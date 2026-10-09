'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LayoutDashboard, Users, Inbox, Settings, LogOut, CheckCircle2, Clock, Phone, Mail, Filter } from "lucide-react";

export default function TenantDashboard() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [minhasLeads, setMinhasLeads] = useState<any[]>([]);
  
  // Estados para o Modal de Atualização de Status
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [leadSelecionada, setLeadSelecionada] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  const carregarDados = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    setUserEmail(session.user.email ?? null);

    const { data: leadsData, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erro ao carregar leads:", error.message);
    } else if (leadsData) {
      setMinhasLeads(leadsData);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    carregarDados();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Função para atualizar o status na Base de Dados com tratamento de erro e .select()
  const atualizarStatusLead = async (novoStatus: string) => {
    if (!leadSelecionada) return;
    
    setIsUpdating(true);
    
    const { data, error } = await supabase
      .from('leads')
      .update({ status: novoStatus })
      .eq('id', leadSelecionada.id)
      .select();

    setIsUpdating(false);

    if (error) {
      console.error("Erro ao atualizar:", error);
      alert("Erro ao atualizar a oportunidade: " + error.message);
    } else {
      setIsStatusModalOpen(false);
      setLeadSelecionada(null);
      carregarDados(); // Recarrega os dados atualizados do Supabase
    }
  };

  const abrirModalStatus = (lead: any) => {
    setLeadSelecionada(lead);
    setIsStatusModalOpen(true);
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-[#F8FFFE] text-[#112031] font-medium">A preparar o seu ambiente de trabalho...</div>;
  }

  // Estatísticas baseadas nos dados atualizados
  const leadsNovas = minhasLeads.filter(l => l.status === 'novo' || l.status === 'nova').length || 0;
  const leadsEmAtendimento = minhasLeads.filter(l => l.status === 'em_atendimento').length || 0;

  return (
    <div className="flex h-screen bg-[#F8FFFE] overflow-hidden font-sans">
      
      {/* SIDEBAR DO CLIENTE (Esquerda) */}
      <aside className="w-64 bg-[#112031] flex flex-col rounded-r-3xl shadow-xl z-10 text-white">
        <div className="p-8 flex flex-col items-center">
          <div className="h-20 w-20 rounded-full bg-[#F8FFFE] border-2 border-[#345B63] flex items-center justify-center text-3xl font-bold text-[#112031] mb-4 shadow-inner">
            {userEmail ? userEmail.charAt(0).toUpperCase() : 'V'}
          </div>
          <p className="text-white font-medium text-sm truncate w-full text-center">
            {userEmail}
          </p>
          <span className="text-[#D4ECDD] text-xs mt-1 uppercase tracking-wider font-semibold">Equipa de Vendas</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button className="w-full flex items-center gap-3 bg-[#F8FFFE] text-[#112031] px-5 py-3 rounded-xl font-bold transition-all shadow-sm">
            <LayoutDashboard size={20} />
            Visão Geral
          </button>
          <button className="w-full flex items-center gap-3 text-[#D4ECDD] hover:bg-[#152D35] hover:text-white px-5 py-3 rounded-xl font-medium transition-all">
            <Inbox size={20} />
            Oportunidades
          </button>
          <button className="w-full flex items-center gap-3 text-[#D4ECDD] hover:bg-[#152D35] hover:text-white px-5 py-3 rounded-xl font-medium transition-all">
            <Users size={20} />
            Vendas Concluídas
          </button>
          <button className="w-full flex items-center gap-3 text-[#D4ECDD] hover:bg-[#152D35] hover:text-white px-5 py-3 rounded-xl font-medium transition-all">
            <Settings size={20} />
            Configurações
          </button>
        </nav>

        <div className="p-4 mb-4">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 text-[#D4ECDD] hover:text-white hover:bg-red-500/20 px-5 py-3 rounded-xl font-medium transition-all"
          >
            <LogOut size={20} />
            Sair da Conta
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL DO CLIENTE (Direita) */}
      <main className="flex-1 overflow-y-auto p-10 relative">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Cabeçalho */}
          <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div>
              <h1 className="text-2xl font-bold text-[#112031]">Resumo de Vendas</h1>
              <p className="text-sm text-gray-500 mt-1">Acompanhe os seus contactos e avance nas negociações.</p>
            </div>
            <Button className="bg-[#345B63] hover:bg-[#112031] text-white rounded-xl px-6 flex items-center gap-2">
              <Filter size={18} />
              Filtrar Lista
            </Button>
          </div>

          {/* Cartões de Funil Rápido */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-none shadow-sm rounded-2xl bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total de Oportunidades</CardTitle>
                <Inbox className="text-[#345B63] opacity-50" size={24} />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-[#112031]">{minhasLeads.length}</div>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-sm rounded-2xl bg-[#F8FFFE] border border-[#D4ECDD]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-[#345B63] uppercase tracking-wider">Aguardando Contacto</CardTitle>
                <Clock className="text-[#345B63]" size={24} />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-[#345B63]">{leadsNovas}</div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl bg-[#112031] text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-[#D4ECDD] uppercase tracking-wider">Em Atendimento</CardTitle>
                <CheckCircle2 className="text-[#D4ECDD]" size={24} />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-white">{leadsEmAtendimento}</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Ação */}
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
              <CardTitle className="text-lg text-[#112031]">Contactos Recentes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="py-4 px-6 font-semibold">Nome e Origem</TableHead>
                    <TableHead className="py-4 font-semibold">Contactar</TableHead>
                    <TableHead className="py-4 font-semibold">Fase Atual</TableHead>
                    <TableHead className="py-4 font-semibold text-right px-6">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {minhasLeads.map((lead) => (
                    <TableRow key={lead.id} className="border-gray-50 hover:bg-[#F8FFFE]/50 transition-colors">
                      <TableCell className="font-medium px-6 py-4">
                        <div className="text-[#112031] font-bold">{lead.nome}</div>
                        <div className="text-xs text-gray-500 mt-1">Veio de: {lead.origem}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <a href={`https://wa.me/${lead.telefone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="p-2 bg-[#D4ECDD]/50 text-[#345B63] rounded-lg hover:bg-[#345B63] hover:text-white transition-colors" title="Chamar no WhatsApp">
                            <Phone size={16} />
                          </a>
                          <a href={`mailto:${lead.email}`} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors" title="Enviar E-mail">
                            <Mail size={16} />
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize
                          ${lead.status === 'novo' || lead.status === 'nova' ? 'bg-yellow-100 text-yellow-800' : 
                            lead.status === 'em_atendimento' ? 'bg-blue-100 text-blue-800' : 
                            'bg-[#D4ECDD] text-[#345B63]'}`}>
                          {lead.status.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <Button 
                          onClick={() => abrirModalStatus(lead)}
                          variant="outline" 
                          size="sm" 
                          className="border-[#345B63] text-[#345B63] hover:bg-[#345B63] hover:text-white"
                        >
                          Atualizar Fase
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {minhasLeads.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500 py-12">
                        Ainda não tem oportunidades na sua lista.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Modal de Atualização de Status */}
        <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
          <DialogContent className="sm:max-w-[425px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-[#112031] text-xl">Atualizar Oportunidade</DialogTitle>
              <DialogDescription>
                Em que fase de negociação está o contacto <strong>{leadSelecionada?.nome}</strong>?
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-4">
              <Button 
                onClick={() => atualizarStatusLead('novo')}
                disabled={isUpdating}
                className="w-full bg-yellow-100 text-yellow-800 hover:bg-yellow-200 justify-start"
              >
                <Clock size={16} className="mr-2" /> Aguardando Contacto (Novo)
              </Button>
              <Button 
                onClick={() => atualizarStatusLead('em_atendimento')}
                disabled={isUpdating}
                className="w-full bg-blue-100 text-blue-800 hover:bg-blue-200 justify-start"
              >
                <Phone size={16} className="mr-2" /> Em Atendimento
              </Button>
              <Button 
                onClick={() => atualizarStatusLead('concluido')}
                disabled={isUpdating}
                className="w-full bg-[#D4ECDD] text-[#345B63] hover:bg-[#D4ECDD]/80 justify-start"
              >
                <CheckCircle2 size={16} className="mr-2" /> Venda Concluída
              </Button>
            </div>
            <DialogFooter className="pt-4 mt-4 border-t border-gray-100">
              <Button variant="ghost" onClick={() => setIsStatusModalOpen(false)} disabled={isUpdating}>
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}