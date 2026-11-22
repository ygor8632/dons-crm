'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout, AvisoErro } from '@/components/site/auth-layout';

export default function EsqueciSenha() {
  const [supabase] = useState(createClient);
  const [email, setEmail] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/redefinir-senha` });
    if (error) setErro('Não foi possível enviar o e-mail agora. Confira o endereço e tente de novo em alguns minutos.');
    else setEnviado(true);
    setCarregando(false);
  };

  return (
    <AuthLayout
      titulo="Recuperar a senha"
      subtitulo="Enviamos um link para você criar uma senha nova."
      rodape={<Link href="/login" className="inline-block py-2 font-medium text-foreground underline underline-offset-4">Voltar para o login</Link>}
    >
      {enviado ? (
        <div className="space-y-3" role="status">
          <span className="grid size-12 place-items-center rounded-full bg-positive text-positive-foreground" aria-hidden><MailCheck className="size-5" /></span>
          <p className="text-[15px] font-semibold">Link enviado para {email}</p>
          <p className="text-sm text-muted-foreground">Abra o e-mail e clique em “Redefinir senha”. Se não aparecer em alguns minutos, olhe a caixa de spam.</p>
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-5">
          {erro && <AvisoErro>{erro}</AvisoErro>}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail da sua conta</Label>
            <Input id="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
          </div>
          <Button type="submit" disabled={carregando} className="h-11 w-full text-sm">{carregando ? 'Enviando…' : 'Enviar link de recuperação'}</Button>
        </form>
      )}
    </AuthLayout>
  );
}
