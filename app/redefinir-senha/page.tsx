'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, CheckCircle2, Lock } from "lucide-react";

export default function RedefinirSenha() {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // O clique no link do email já cria a sessão temporária para permitir a troca
    const verificarSessao = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErro("Link inválido ou expirado. Por favor, solicite a recuperação novamente.");
      }
    };
    verificarSessao();
  }, [supabase.auth]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }
    if (novaSenha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    setErro(null);

    const { error } = await supabase.auth.updateUser({ password: novaSenha });

    if (error) {
      setErro("Ocorreu um erro ao atualizar a senha. Tente novamente.");
    } else {
      setSucesso(true);
      setTimeout(() => { router.push('/painel'); }, 3000);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-[#F8FFFE] items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-2xl bg-[#112031] flex items-center justify-center text-white shadow-lg"><Lock size={28} /></div>
        </div>
        
        <h1 className="text-2xl font-bold text-center text-[#112031] mb-2">Criar Nova Senha</h1>
        
        {sucesso ? (
          <div className="text-center space-y-4 py-4 animate-in fade-in duration-500">
            <div className="flex justify-center"><CheckCircle2 size={48} className="text-green-500" /></div>
            <p className="text-sm text-gray-600 font-medium">Senha atualizada com sucesso!</p>
            <p className="text-xs text-gray-400">Redirecionando para o painel...</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-center text-gray-500 mb-8">Digite sua nova senha abaixo para recuperar o acesso à conta.</p>

            {erro && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-medium mb-6 flex items-start gap-2 border border-red-100">
                <ShieldAlert size={16} className="shrink-0 mt-0.5" /> {erro}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nova Senha</Label>
                <Input 
                  required type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} 
                  className="h-12 border-gray-200 text-sm focus-visible:ring-[#4361EE]" placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Confirmar Senha</Label>
                <Input 
                  required type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} 
                  className="h-12 border-gray-200 text-sm focus-visible:ring-[#4361EE]" placeholder="••••••••"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full h-12 bg-[#4361EE] hover:bg-[#3A56D4] text-white font-bold rounded-xl transition-all shadow-md">
                {loading ? 'Salvando...' : 'Atualizar e Entrar'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}