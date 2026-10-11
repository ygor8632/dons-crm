'use client';

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldAlert } from "lucide-react";

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const supabase = createClient();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    if (error) {
      setErro("Não foi possível enviar o e-mail de recuperação. Verifique se o endereço está correto.");
    } else {
      setSucesso(true);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-[#F8FFFE] items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#112031] to-[#345B63] flex items-center justify-center text-3xl font-bold text-white shadow-lg">D</div>
        </div>
        
        <h1 className="text-2xl font-bold text-center text-[#112031] mb-2">Recuperar Acesso</h1>
        
        {sucesso ? (
          <div className="text-center space-y-4 py-4 animate-in fade-in duration-500">
            <div className="flex justify-center"><CheckCircle2 size={48} className="text-green-500" /></div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Enviamos as instruções de recuperação para <strong>{email}</strong>. Verifique sua caixa de entrada (e a pasta de spam).
            </p>
            <Link href="/login" className="inline-flex items-center text-sm font-bold text-[#4361EE] hover:underline mt-4">
              <ArrowLeft size={16} className="mr-2" /> Voltar ao Login
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-center text-gray-500 mb-8">Digite o e-mail associado à sua conta para receber um link de redefinição seguro.</p>

            {erro && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-medium mb-6 flex items-start gap-2 border border-red-100">
                <ShieldAlert size={16} className="shrink-0 mt-0.5" /> {erro}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">E-mail Cadastrado</Label>
                <Input 
                  required 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="h-12 border-gray-200 text-sm focus-visible:ring-[#4361EE]" 
                  placeholder="seu-email@exemplo.com"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full h-12 bg-[#4361EE] hover:bg-[#3A56D4] text-white font-bold rounded-xl transition-all shadow-md">
                {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <Link href="/login" className="text-sm font-bold text-gray-500 hover:text-[#112031] flex items-center justify-center gap-2 transition-colors">
                <ArrowLeft size={16} /> Voltar ao Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}