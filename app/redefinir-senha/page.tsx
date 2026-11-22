'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ShieldCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AuthLayout, AvisoErro } from '@/components/site/auth-layout';
import { CampoSenha } from '@/components/site/campo-senha';
import { cn } from '@/lib/utils';

const REGRAS = [
  { id: 'tamanho', texto: '8 caracteres ou mais', ok: (s: string) => s.length >= 8 },
  { id: 'letra', texto: 'Uma letra', ok: (s: string) => /[a-zA-Z]/.test(s) },
  { id: 'numero', texto: 'Um número', ok: (s: string) => /\d/.test(s) },
];

export default function RedefinirSenha() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [linkInvalido, setLinkInvalido] = useState(false);

  // O link do e-mail cria uma sessão temporária; ela pode chegar um instante depois do carregamento.
  useEffect(() => {
    let ativo = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sessao) => { if (sessao && ativo) setLinkInvalido(false); });
    const t = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (ativo && !session) setLinkInvalido(true);
    }, 1500);
    return () => { ativo = false; clearTimeout(t); sub.subscription.unsubscribe(); };
  }, [supabase]);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!REGRAS.every((r) => r.ok(senha))) { setErro('A senha precisa ter 8 caracteres ou mais, com letras e números.'); return; }
    if (senha !== confirmar) { setErro('As duas senhas não são iguais. Digite a mesma senha nos dois campos.'); return; }
    setCarregando(true);
    setErro(null);
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) { setErro('Não foi possível salvar a senha. Peça um novo link e tente de novo.'); setCarregando(false); return; }
    setSucesso(true);
    setTimeout(() => router.push('/painel'), 2500);
  };

  return (
    <AuthLayout
      titulo="Criar uma senha nova"
      subtitulo="Depois de salvar, você entra direto no seu painel."
      rodape={<Link href="/login" className="inline-block py-2 font-medium text-foreground underline underline-offset-4">Voltar para o login</Link>}
    >
      {sucesso ? (
        <div className="space-y-3" role="status">
          <span className="grid size-12 place-items-center rounded-full bg-positive text-positive-foreground" aria-hidden><ShieldCheck className="size-5" /></span>
          <p className="text-[15px] font-semibold">Senha salva</p>
          <p className="text-sm text-muted-foreground">Abrindo o seu painel…</p>
        </div>
      ) : linkInvalido ? (
        <div className="space-y-4">
          <AvisoErro>Este link expirou ou já foi usado.</AvisoErro>
          <Link href="/esqueci-senha" className="inline-flex h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/85">Pedir um link novo</Link>
        </div>
      ) : (
        <form onSubmit={salvar} className="space-y-5">
          {erro && <AvisoErro>{erro}</AvisoErro>}
          <div className="space-y-2">
            <Label htmlFor="senha">Senha nova</Label>
            <CampoSenha id="senha" autoComplete="new-password" required value={senha} onChange={(e) => setSenha(e.target.value)} aria-describedby="regras-senha" />
            <ul id="regras-senha" className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs">
              {REGRAS.map((r) => {
                const ok = r.ok(senha);
                return (
                  <li key={r.id} className={cn('flex items-center gap-1.5', ok ? 'text-positive-foreground' : 'text-muted-foreground')}>
                    <Check className={cn('size-3.5', !ok && 'opacity-30')} aria-hidden />{r.texto}<span className="sr-only">{ok ? ' (ok)' : ' (falta)'}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmar">Repita a senha</Label>
            <CampoSenha id="confirmar" autoComplete="new-password" required value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
          </div>
          <Button type="submit" disabled={carregando} className="h-11 w-full text-sm">{carregando ? 'Salvando…' : 'Salvar senha nova'}</Button>
        </form>
      )}
    </AuthLayout>
  );
}
