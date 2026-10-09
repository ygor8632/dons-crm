'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { criarCliente } from "./actions";
import { LayoutDashboard, Users, Inbox, Settings, LogOut, Plus } from "lucide-react";

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalClientes, setTotalClientes] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);
  const [clientes, setClientes] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  const carregarDados = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    setUserEmail(session.user.email ?? null);

    const { data: tenants } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (tenants) {
      setTotalClientes(tenants.length);
      setClientes(tenants);
    }
    
    const { data: leadsData } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (leadsData) {
      setTotalLeads(leadsData.length);
      setLeads(leadsData);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    carregarDados();
  }, [router, supabase]);

  const handleCriarCliente = async (formData: FormData) => {
    setIsSubmitting(true);
    const resposta = await criarCliente(formData);
    setIsSubmitting(false);
    
    if (resposta.error) {
      alert("Erro ao criar cliente: " + resposta.error);
    } else {
      setIsModalOpen(false);
      carregarDados(); 
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-[#F8FFFE] text-[#112031] font-medium">A carregar o seu CRM...</div>;
  }

  return (
    <div className="flex h-screen bg-[#F8FFFE] overflow-hidden font-sans">
      
      {/* SIDEBAR (Esquerda) - Cores aplicadas diretamente com a paleta escolhida */}
      <aside className="w-64 bg-[#112031] flex flex-col rounded-r-3xl shadow-xl z-10 text-white">
        
        {/* Perfil do Utilizador */}
        <div className="p-8 flex flex-col items-center">
          <div className="h-20 w-20 rounded-full bg-[#345B63] border-2 border-[#D4ECDD] flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-inner">
            {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
          </div>
          <p className="text-white font-medium text-sm truncate w-full text-center">
            {userEmail}
          </p>
          <span className="text-[#D4ECDD] text-xs mt-1 uppercase tracking-wider font-semibold">Superadmin</span>
        </div>

        {/* Menu de Navegação */}
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button className="w-full flex items-center gap-3 bg-[#F8FFFE] text-[#112031] px-5 py-3 rounded-xl font-bold transition-all shadow-sm">
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          <button className="w-full flex items-center gap-3 text-[#D4ECDD] hover:bg-[#152D35] hover:text-white px-5 py-3 rounded-xl font-medium transition-all">
            <Users size={20} />
            Empresas
          </button>
          <button className="w-full flex items-center gap-3 text-[#D4ECDD] hover:bg-[#152D35] hover:text-white px-5 py-3 rounded-xl font-medium transition-all">
            <Inbox size={20} />
            Leads Ativas
          </button>
          <button className="w-full flex items-center gap-3 text-[#D4ECDD] hover:bg-[#152D35] hover:text-white px-5 py-3 rounded-xl font-medium transition-all">
            <Settings size={20} />
            Definições
          </button>
        </nav>

        {/* Botão de Sair */}
        <div className="p-4 mb-4">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 text-[#D4ECDD] hover:text-white hover:bg-red-500/20 px-5 py-3 rounded-xl font-medium transition-all"
          >
            <LogOut size={20} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL (Direita) */}
      <main className="flex-1 overflow-y-auto p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Cabeçalho da Área Principal */}
          <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div>
              <h1 className="text-2xl font-bold text-[#112031]">Visão Geral</h1>
              <p className="text-sm text-gray-500 mt-1">Acompanhe o desempenho do seu sistema.</p>
            </div>

            {/* Botão de Novo Cliente */}
            <Button onClick={() => setIsModalOpen(true)} className="bg-[#345B63] hover:bg-[#112031] text-white rounded-xl px-6 flex items-center gap-2">
              <Plus size={18} />
              Novo Cliente
            </Button>

            {/* Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogContent className="sm:max-w-[425px] rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-[#112031] text-xl">Novo Cliente (Tenant)</DialogTitle>
                  <DialogDescription>Crie um novo ambiente para o seu cliente.</DialogDescription>
                </DialogHeader>
                <form action={handleCriarCliente} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="nomeEmpresa">Nome da Empresa</Label>
                    <Input id="nomeEmpresa" name="nomeEmpresa" placeholder="Ex: Acme Corp" required className="rounded-lg focus:ring-[#345B63]" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail de Acesso</Label>
                    <Input id="email" name="email" type="email" required className="rounded-lg focus:ring-[#345B63]" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Palavra-passe provisória</Label>
                    <Input id="password" name="password" type="password" required minLength={6} className="rounded-lg focus:ring-[#345B63]" />
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="submit" disabled={isSubmitting} className="w-full bg-[#112031] hover:bg-[#152D35] rounded-xl text-white">
                      {isSubmitting ? 'A guardar...' : 'Criar Conta'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Cartões de Estatísticas */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total de Clientes</CardTitle>
                <Users className="text-[#345B63] opacity-50" size={24} />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-[#112031]">{totalClientes}</div>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Leads no Sistema</CardTitle>
                <Inbox className="text-[#345B63] opacity-50" size={24} />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-[#112031]">{totalLeads}</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Empresas */}
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
              <CardTitle className="text-lg text-[#112031]">Empresas Registadas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="py-4 px-6 font-semibold">Nome da Empresa</TableHead>
                    <TableHead className="py-4 font-semibold">Plano</TableHead>
                    <TableHead className="py-4 font-semibold">Data de Registo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((cliente) => (
                    <TableRow key={cliente.id} className="border-gray-50 hover:bg-[#F8FFFE]/50 transition-colors">
                      <TableCell className="font-medium px-6 py-4 text-[#112031]">{cliente.name}</TableCell>
                      <TableCell className="capitalize text-gray-600">{cliente.plan}</TableCell>
                      <TableCell className="text-gray-500">
                        {new Date(cliente.created_at).toLocaleDateString('pt-PT')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {clientes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                        Nenhum cliente encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Tabela de Leads */}
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
              <CardTitle className="text-lg text-[#112031]">Últimas Leads Recebidas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="py-4 px-6 font-semibold">Nome</TableHead>
                    <TableHead className="py-4 font-semibold">Contactos</TableHead>
                    <TableHead className="py-4 font-semibold">Origem</TableHead>
                    <TableHead className="py-4 font-semibold">Status</TableHead>
                    <TableHead className="py-4 font-semibold">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id} className="border-gray-50 hover:bg-[#F8FFFE]/50 transition-colors">
                      <TableCell className="font-medium px-6 py-4 text-[#112031]">{lead.nome}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-gray-700">{lead.email}</span>
                          <span className="text-xs text-gray-500">{lead.telefone}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                          {lead.origem}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-[#D4ECDD] px-3 py-1 text-xs font-semibold text-[#345B63] ring-1 ring-inset ring-[#345B63]/20 capitalize">
                          {lead.status.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {new Date(lead.created_at).toLocaleDateString('pt-PT')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {leads.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        Nenhuma lead recebida ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}