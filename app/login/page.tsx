'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Mail, Lock, ArrowRight, PlayCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      const { data: perfil } = await supabase.from('perfis').select('role').eq('id', data.user.id).single();
      
      if (perfil?.role === 'superadmin') {
        router.push('/dashboard');
      } else {
        router.push('/painel');
      }
    } catch (error: any) {
      setErro('Credenciais inválidas. Verifique o e-mail e a palavra-passe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans selection:bg-[#5483B3] selection:text-white bg-[#f4f7f9]">
      
      {/* LADO ESQUERDO: BRANDING */}
      <div className="hidden md:flex md:w-1/2 lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden" style={{ backgroundColor: '#021024', color: '#C1E8FF' }}>
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-20">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full blur-[120px]" style={{ backgroundColor: '#5483B3' }}></div>
          <div className="absolute bottom-[10%] -right-[20%] w-[60%] h-[60%] rounded-full blur-[100px]" style={{ backgroundColor: '#052659' }}></div>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#052659' }}>
            <Sparkles size={20} className="text-white" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-white">Dons CRM</span>
        </div>

        <div className="relative z-10 space-y-6 max-w-md">
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
            Escale as suas <br />vendas com <span style={{ color: '#5483B3' }}>inteligência</span>.
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: '#7DA0CA' }}>
            Acesso restrito a clientes implementados. Organize o seu pipeline e acompanhe métricas em tempo real.
          </p>

          <div className="space-y-3 pt-4">
            {['Ambiente seguro e isolado', 'Suporte técnico dedicado', 'Atualizações contínuas de performance'].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-xs font-medium" style={{ color: '#C1E8FF' }}>
                <CheckCircle2 size={16} style={{ color: '#5483B3' }} /> {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-xs font-medium" style={{ color: '#7DA0CA' }}>
          <span>&copy; 2026 Dons CRM. Área restrita.</span>
        </div>
      </div>

      {/* LADO DIREITO: FORMULÁRIO */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md space-y-8 relative z-10">
          
          <div className="md:hidden flex items-center justify-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: '#021024' }}>
              <Sparkles size={20} className="text-[#C1E8FF]" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-[#021024]">Dons CRM</span>
          </div>

          <div className="text-center md:text-left space-y-2">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[#021024]">Bem-vindo de volta</h2>
            <p className="text-sm text-zinc-500">Insira as suas credenciais fornecidas na implementação.</p>
          </div>

          {erro && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold text-center">
              {erro}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">E-mail Profissional</Label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@empresa.com" className="pl-9 h-11 rounded-xl bg-white border-zinc-200 focus-visible:ring-[#5483B3] text-sm" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Palavra-passe</Label>
                <button type="button" className="text-[10px] font-bold text-[#5483B3] hover:underline">Esqueceu a senha?</button>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-9 h-11 rounded-xl bg-white border-zinc-200 focus-visible:ring-[#5483B3] text-sm" />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-md hover:-translate-y-0.5 mt-4" style={{ backgroundColor: '#021024' }}>
              {loading ? 'A processar...' : 'Entrar no Painel'}
              {!loading && <ArrowRight size={16} />}
            </Button>
          </form>

          {/* ÁREA DE DEMONSTRAÇÃO E SUPORTE */}
          <div className="pt-6 mt-6 border-t border-zinc-200 space-y-4">
            <div className="text-center text-xs font-medium text-zinc-500 mb-3">
              Ainda não é cliente ou quer testar a plataforma?
            </div>
            <Button onClick={() => router.push('/demo')} variant="outline" className="w-full h-11 rounded-xl font-bold flex items-center justify-center gap-2 border-zinc-300 hover:bg-zinc-50 text-[#021024]">
              <PlayCircle size={18} style={{ color: '#5483B3' }} /> Acessar Ambiente de Demonstração
            </Button>
            <div className="text-center text-[10px] text-zinc-400 mt-2">
              Para contratar uma licença, <a href="#" className="underline hover:text-[#5483B3]">fale com um consultor</a>.
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}