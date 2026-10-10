'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Tenta fazer a autenticação
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // 2. Trata o erro de credenciais
    if (authError) {
      setError('Credenciais incorretas. Verifique o seu e-mail e palavra-passe.');
      setLoading(false);
      return;
    } 
    
    // 3. Verifica quem é o utilizador para o enviar para o sítio certo
    if (data?.user) {
      const user = data.user;
      
      // Tenta ler a role que configurou no Supabase (nos user_metadata)
      const role = user?.user_metadata?.role;
      
      // Regra de Ouro: O seu e-mail é sempre Superadmin, ou se a role for explicitamente 'superadmin'
      const isSuperAdmin = user?.email === 'ygor8632@gmail.com' || role === 'superadmin';

      if (isSuperAdmin) {
        router.push('/dashboard'); // Painel global de controlo
      } else {
        router.push('/painel'); // Painel do cliente final (Tenant)
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FFFE] font-sans">
      {/* Coluna da Esquerda: Formulário */}
      <div className="flex w-full flex-col justify-center px-8 md:w-1/2 md:px-16 lg:px-24">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#112031] text-white font-bold text-xl">
              D
            </div>
            <span className="text-2xl font-bold text-[#112031]">Dons CRM</span>
          </div>

          <h1 className="mb-2 text-3xl font-bold text-[#112031]">Bem-vindo!</h1>
          <p className="mb-8 text-gray-500">Informe os seus dados para entrar:</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">E-mail *</Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@empresa.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-gray-300 focus:border-[#345B63] focus:ring-[#345B63]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Palavra-passe *</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-gray-300 focus:border-[#345B63] focus:ring-[#345B63]"
              />
            </div>

            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#112031] hover:bg-[#152D35] text-white font-medium py-2 rounded-md transition-colors"
            >
              {loading ? 'A autenticar...' : 'Entrar'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <a href="#" className="text-sm text-[#345B63] hover:underline">
              Esqueceu a palavra-passe?
            </a>
          </div>
        </div>
      </div>

      {/* Coluna da Direita: Mensagem e Background Escuro */}
      <div className="hidden w-1/2 items-center justify-center bg-[#112031] md:flex relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 rounded-full bg-[#152D35] opacity-50 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 rounded-full bg-[#345B63] opacity-20 blur-3xl"></div>

        <div className="z-10 max-w-lg p-8 text-white">
          <h2 className="mb-4 text-4xl font-bold leading-tight">
            Venda mais e gira os seus clientes de forma inteligente.
          </h2>
          <p className="text-lg text-[#D4ECDD] opacity-90">
            Acompanhe o funil de vendas, centralize os contactos e profissionalize o seu atendimento com o Dons CRM.
          </p>
        </div>
      </div>
    </div>
  );
}