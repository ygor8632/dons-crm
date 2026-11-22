'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout, AvisoErro } from '@/components/site/auth-layout';
import { CampoSenha } from '@/components/site/campo-senha';

export default function LoginPage() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error || !data.user) {
      setErro('E-mail ou senha incorretos. Confira os dois e tente de novo.');
      setCarregando(false);
      return;
    }
    const { data: perfil } = await supabase.from('perfis').select('role').eq('id', data.user.id).single();
    router.push(perfil?.role === 'superadmin' ? '/dashboard' : '/painel');
  };

  return (
    <AuthLayout
      titulo="Entrar no Dons CRM"
      subtitulo="Use o e-mail e a senha que você criou a partir do convite."
      rodape={<>Ainda não é cliente? <Link href="/demo" className="inline-block py-2 font-medium text-foreground underline underline-offset-4">Ver a demonstração</Link></>}
    >
      <form onSubmit={entrar} className="space-y-5" noValidate={false}>
        {erro && <AvisoErro>{erro}</AvisoErro>}
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" aria-invalid={!!erro} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="senha">Senha</Label>
            <Link href="/esqueci-senha" className="inline-block py-1.5 text-xs font-medium text-foreground underline-offset-4 hover:underline">Esqueci a senha</Link>
          </div>
          <CampoSenha id="senha" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} aria-invalid={!!erro} />
        </div>
        <Button type="submit" disabled={carregando} className="h-11 w-full text-sm">
          {carregando ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </AuthLayout>
  );
}
