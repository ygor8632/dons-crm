'use client';

import { useEffect, useState } from 'react';
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
  const [marca, setMarca] = useState<{ id: string; nome: string; versao: string } | null>(null);

  // Aberto pelo app instalado de uma empresa: mostra o nome e o ícone dela
  useEffect(() => {
    const doLink = new URLSearchParams(window.location.search).get('empresa');
    const noApp = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let lembrada: string | null = null;
    try { lembrada = noApp ? localStorage.getItem('dons-empresa-app') : null; } catch { /* sem armazenamento */ }
    const id = doLink || lembrada;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return;
    let vivo = true;
    fetch(`/api/app/${id}/marca`).then((r) => r.json()).then((m) => { if (vivo && m?.id) setMarca(m); }).catch(() => {});
    return () => { vivo = false; };
  }, []);

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
    router.push(perfil?.role === 'superadmin' ? '/dashboard' : marca ? `/painel?empresa=${marca.id}` : '/painel');
  };

  return (
    <AuthLayout
      titulo={marca ? `Entrar no CRM da ${marca.nome}` : 'Entrar no Dons CRM'}
      subtitulo="Use o e-mail e a senha que você criou a partir do convite."
      rodape={<>Ainda não é cliente? <Link href="/demo" className="inline-block py-2 font-medium text-foreground underline underline-offset-4">Ver a demonstração</Link></>}
    >
      {marca && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-pill-active/55 p-3 dark:bg-white/6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/app/${marca.id}/icone/192?v=${marca.versao}`} alt="" width={44} height={44} className="size-11 rounded-xl shadow-sm" />
          <p className="text-[13px]"><span className="font-semibold">{marca.nome}</span><span className="block text-xs text-muted-foreground">Acesso da equipe</span></p>
        </div>
      )}
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
