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
  
  // Utiliza o client do Supabase que já tem no seu projeto
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('Credenciais incorretas. Verifique o seu e-mail e palavra-passe.');
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen bg-pale-teal">
      {/* Coluna da Esquerda: Formulário */}
      <div className="flex w-full flex-col justify-center px-8 md:w-1/2 md:px-16 lg:px-24">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-deep-azure text-white font-bold text-xl">
              D
            </div>
            <span className="text-2xl font-bold text-deep-azure">Dons CRM</span>
          </div>

          <h1 className="mb-2 text-3xl font-bold text-deep-azure">Bem-vindo!</h1>
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
                className="w-full border-gray-300 focus:border-rich-teal focus:ring-rich-teal"
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
                className="w-full border-gray-300 focus:border-rich-teal focus:ring-rich-teal"
              />
            </div>

            {/* Mensagem de erro visual caso a palavra-passe esteja errada */}
            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-deep-azure hover:bg-deep-azure-light text-white font-medium py-2 rounded-md transition-colors"
            >
              {loading ? 'A autenticar...' : 'Entrar'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <a href="#" className="text-sm text-rich-teal hover:underline">
              Esqueceu a palavra-passe?
            </a>
          </div>
        </div>
      </div>

      {/* Coluna da Direita: Mensagem */}
      <div className="hidden w-1/2 items-center justify-center bg-deep-azure md:flex relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 rounded-full bg-deep-azure-light opacity-50 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 rounded-full bg-rich-teal opacity-20 blur-3xl"></div>

        <div className="z-10 max-w-lg p-8 text-white">
          <h2 className="mb-4 text-4xl font-bold leading-tight">
            Venda mais e gira os seus clientes de forma inteligente.
          </h2>
          <p className="text-lg text-pale-jade opacity-90">
            Acompanhe o funil de vendas, centralize os contactos e profissionalize o seu atendimento com o Dons CRM.
          </p>
        </div>
      </div>
    </div>
  );
}