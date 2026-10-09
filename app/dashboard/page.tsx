'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { criarCliente } from "./actions";

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalClientes, setTotalClientes] = useState(0);
  const [clientes, setClientes] = useState<any[]>([]); // Novo estado para guardar a lista
  
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

    // Agora pedimos todos os dados (*) ordenados pelos mais recentes
    const { data: tenants } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (tenants) {
      setTotalClientes(tenants.length);
      setClientes(tenants); // Guardamos a lista completa para a tabela
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

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-gray-500">A carregar o seu CRM...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Painel Superadmin</h1>
            <p className="text-sm text-gray-500 mt-1">Sessão ativa: {userEmail}</p>
          </div>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button>Adicionar Cliente</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Novo Cliente (Tenant)</DialogTitle>
                <DialogDescription>Crie um novo ambiente para o seu cliente.</DialogDescription>
              </DialogHeader>
              <form action={handleCriarCliente} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="nomeEmpresa">Nome da Empresa</Label>
                  <Input id="nomeEmpresa" name="nomeEmpresa" placeholder="Ex: Acme Corp" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail de Acesso</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Palavra-passe provisória</Label>
                  <Input id="password" name="password" type="password" required minLength={6} />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'A guardar...' : 'Criar Conta'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Grelha de Estatísticas */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClientes}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leads Ativas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
            </CardContent>
          </Card>
        </div>

        {/* NOVA TABELA DE CLIENTES */}
        <Card>
          <CardHeader>
            <CardTitle>Empresas Registadas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Empresa</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Data de Registo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">{cliente.name}</TableCell>
                    <TableCell className="capitalize">{cliente.plan}</TableCell>
                    <TableCell>
                      {new Date(cliente.created_at).toLocaleDateString('pt-PT')}
                    </TableCell>
                  </TableRow>
                ))}
                {clientes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500 py-4">
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}