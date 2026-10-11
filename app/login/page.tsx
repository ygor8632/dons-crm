'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowRight, ShieldCheck, Zap, BarChart3 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError("E-mail ou senha incorretos.");
        setLoading(false);
        return;
      }

      const userEmail = data.user?.email;
      const role = data.user?.user_metadata?.role;
      
      if (userEmail === 'ygor8632@gmail.com' || role === 'superadmin') {
        router.push('/dashboard');
      } else {
        router.push('/painel');
      }
    } catch (err) {
      setError("Ocorreu um erro inesperado.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full font-sans bg-white">
      
      {/* LADO ESQUERDO */}
      <div className="hidden lg:flex w-1/2 bg-[#0A1118] text-white flex-col justify-between p-16 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#4361EE] rounded-full blur-[120px] opacity-20"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#345B63] rounded-full blur-[120px] opacity-20"></div>

        <div className="relative z-10">
          <div className="mb-16">
            <img 
              src="https://donstech.com.br/wp-content/uploads/2026/04/6cb92590-b19d-4961-a672-70eb454dd2411-1-e1776969200237.png" 
              alt="DonsTech Logo" 
              className="h-10 object-contain brightness-0 invert" 
            />
          </div>

          <h1 className="text-5xl font-extrabold leading-[1.15] mb-6">
            Transforme contatos em <span className="text-[#4361EE]">clientes de alto valor.</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-md mb-12 leading-relaxed">
            Desenvolvido pela DonsTech para equipes de alta performance. Centralize as suas negociações, elimine tarefas repetitivas e feche negócios com previsibilidade.
          </p>

          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-2 text-[#4361EE]">
                <Zap size={20} />
              </div>
              <div className="text-xl font-bold text-white mb-1">Tempo Real</div>
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Webhooks integrados</div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2 text-green-400">
                <BarChart3 size={20} />
              </div>
              <div className="text-xl font-bold text-white mb-1">Controle</div>
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Métricas precisas</div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2 text-yellow-400">
                <ShieldCheck size={20} />
              </div>
              <div className="text-xl font-bold text-white mb-1">Seguro</div>
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Infraestrutura SaaS</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-sm text-gray-500 font-medium">
          <span>&copy; {new Date().getFullYear()} DonsTech. CRM Engine.</span>
          <a href="#" className="hover:text-white transition-colors">Suporte</a>
        </div>
      </div>

      {/* LADO DIREITO */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#F8FFFE]">
        <div className="max-w-md w-full space-y-8">
          
          <div className="lg:hidden flex justify-center mb-8">
            <img 
              src="https://donstech.com.br/wp-content/uploads/2026/04/6cb92590-b19d-4961-a672-70eb454dd2411-1-e1776969200237.png" 
              alt="DonsTech Logo" 
              className="h-8 object-contain" 
            />
          </div>

          <div className="text-center lg:text-left">
            <p className="text-sm font-bold text-[#4361EE] uppercase tracking-wider mb-2">Acesso ao Sistema</p>
            <h2 className="text-3xl font-extrabold text-[#112031]">Entrar na sua conta</h2>
            <p className="text-gray-500 mt-2 text-sm">Acesse o seu ambiente de trabalho e retome as suas vendas.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 mt-8">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold text-gray-600 uppercase">E-mail corporativo</Label>
              <Input 
                id="email" 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.nome@empresa.com" 
                className="h-12 border-gray-200 focus-visible:ring-[#4361EE] text-base"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-xs font-bold text-gray-600 uppercase">Senha</Label>
                <a href="#" className="text-xs font-bold text-[#4361EE] hover:underline">Esqueceu a senha?</a>
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="h-12 border-gray-200 focus-visible:ring-[#4361EE] text-base"
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 font-medium">
                <ShieldCheck size={16} className="text-red-500" />
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 bg-[#4361EE] hover:bg-[#3A56D4] text-white text-base font-bold transition-all shadow-lg shadow-[#4361EE]/20 flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? 'Autenticando...' : 'Acessar Painel'}
              {!loading && <ArrowRight size={18} />}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8 font-medium">
            Desenvolvido por DonsTech &copy; Soluções Empresariais
          </p>
        </div>
      </div>
    </div>
  );
}