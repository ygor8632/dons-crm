'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalClientes, setTotalClientes] = useState(0);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const carregarDados = async () => {
      // 1. Verifica a sessão
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }
      
      setUserEmail(session.user.email ?? null);

      // 2. Procura os clientes (Tenants) na base de dados
      const { data: tenants, error } = await supabase
        .from('tenants')
        .select('id');

      if (!error && tenants) {
        setTotalClientes(tenants.length);
      }

      setLoading(false);
    };

    carregarDados();
  }, [router, supabase]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-gray-500">A carregar o seu CRM...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Cabeçalho do Dashboard */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Painel Superadmin
            </h1>
            <p className="text-sm text-gray-500 mt-1">Sessão ativa: {userEmail}</p>
          </div>
          <Button>Adicionar Cliente</Button>
        </div>

        {/* Grelha de Estatísticas */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Clientes (Tenants)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Agora este número vem diretamente do Supabase! */}
              <div className="text-2xl font-bold">{totalClientes}</div>
              <p className="text-xs text-gray-500">
                Contas registadas no sistema
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Leads Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-gray-500">
                A aguardar configuração do Webhook
              </p>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}