'use client';

import { useState } from 'react';
import { AlertCircle, Check, CheckCircle2, Copy, ExternalLink, Eye, EyeOff, Loader2, ShieldCheck, Zap } from 'lucide-react';
import { CardTitle, GlassCard, PageHeader } from '@/components/glass';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HoldToDeleteButton } from '@/components/microkit/hold-to-delete-button';
import { cn } from '@/lib/utils';
import type { Painel } from '../_lib/use-painel';
import { formatarDataHora } from '../_lib/util';
import type { ResultadoTeste } from '../_lib/whatsapp';

function Copiar({ id, rotulo, valor }: { id: string; rotulo: string; valor: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      <div className="flex gap-2">
        <Input id={id} readOnly value={valor} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        <Button type="button" variant="outline" onClick={async () => { await navigator.clipboard.writeText(valor); setOk(true); setTimeout(() => setOk(false), 1600); }} aria-label={`Copiar ${rotulo.toLowerCase()}`}>
          {ok ? <Check /> : <Copy />} {ok ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
    </div>
  );
}

const PASSOS: { titulo: string; texto: React.ReactNode }[] = [
  { titulo: 'Crie o app na Meta', texto: <>Em <b>developers.facebook.com › Meus apps › Criar app</b>, escolha o tipo <b>Empresa</b> e adicione o produto <b>WhatsApp</b>. Vincule ao portfólio empresarial (Business Manager) da sua empresa.</> },
  { titulo: 'Cadastre o número', texto: <>Em <b>WhatsApp › Configuração da API</b>, adicione o número da empresa e confirme pelo código SMS. O número não pode estar em uso no app WhatsApp comum (faça backup e apague a conta dele antes). Cadastre também uma forma de pagamento: a Meta cobra as conversas direto na sua conta.</> },
  { titulo: 'Copie os dois IDs', texto: <>Na mesma tela aparecem o <b>Identificação do número de telefone</b> (Phone Number ID) e o <b>Identificação da conta do WhatsApp Business</b> (WABA ID). Cole os dois abaixo.</> },
  { titulo: 'Gere o token permanente', texto: <>Em <b>business.facebook.com › Configurações › Usuários do sistema</b>, crie um usuário do sistema <b>Administrador</b>, atribua o app e a conta do WhatsApp a ele e clique em <b>Gerar token</b> com as permissões <span className="font-mono">whatsapp_business_messaging</span> e <span className="font-mono">whatsapp_business_management</span>, validade <b>Nunca</b>. O token temporário da tela de testes expira em 24h: não use.</> },
  { titulo: 'Copie o App Secret', texto: <>Em <b>Configurações do app › Básico</b>, clique em <b>Mostrar</b> na Chave secreta do aplicativo. Ela confirma que cada mensagem recebida veio mesmo da Meta.</> },
  { titulo: 'Configure o webhook', texto: <>Salve os dados abaixo. Depois, em <b>WhatsApp › Configuração › Webhook</b>, clique em <b>Editar</b>, cole o <b>endereço</b> e o <b>token de verificação</b> que vão aparecer aqui e confirme. Em <b>Campos do webhook</b>, assine <span className="font-mono">messages</span>.</> },
  { titulo: 'Teste a conexão', texto: <>Clique em <b>Testar conexão</b>. Depois mande uma mensagem de outro celular para o número da empresa: ela deve aparecer em <b>Conversas</b> em segundos.</> },
];

export function WhatsAppConexao({ crm }: { crm: Painel }) {
  const wa = crm.whatsapp;
  const conta = wa.conta;
  const [form, setForm] = useState({ phoneNumberId: '', wabaId: '', token: '', appSecret: '' });
  const [verToken, setVerToken] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [teste, setTeste] = useState<ResultadoTeste | null>(null);
  const [editando, setEditando] = useState(false);

  const so = (v: string) => v.replace(/\D/g, '');
  const erros = {
    phoneNumberId: form.phoneNumberId && !/^[0-9]{5,30}$/.test(form.phoneNumberId) ? 'Só números (de 5 a 30 dígitos).' : null,
    wabaId: form.wabaId && !/^[0-9]{5,30}$/.test(form.wabaId) ? 'Só números (de 5 a 30 dígitos).' : null,
    token: form.token && (form.token.trim().length < 20 || /\s/.test(form.token.trim())) ? 'Cole o token completo, sem espaços.' : null,
    appSecret: form.appSecret && !/^[0-9a-f]{32}$/i.test(form.appSecret.trim()) ? 'São 32 caracteres (0–9 e a–f).' : null,
  };
  const completo = form.phoneNumberId && form.wabaId && form.token && form.appSecret && !Object.values(erros).some(Boolean);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completo) return;
    setSalvando(true);
    const ok = await wa.conectar(form);
    setSalvando(false);
    if (ok) { setForm({ phoneNumberId: '', wabaId: '', token: '', appSecret: '' }); setEditando(false); setTeste(null); }
  };

  const testar = async () => {
    setTestando(true);
    setTeste(await wa.testar());
    setTestando(false);
  };

  const mostrarForm = !conta || editando;

  return (
    <div className="space-y-5">
      <PageHeader titulo="WhatsApp oficial" subtitulo="Conecte o número da empresa pela API oficial da Meta. As mensagens chegam em Conversas, ligadas aos leads." />

      {conta && (
        <GlassCard className="max-w-3xl space-y-4">
          <CardTitle
            titulo={conta.nome_verificado || 'Número conectado'}
            descricao={conta.numero ?? `Phone Number ID ${conta.phone_number_id}`}
            acao={
              <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
                conta.status === 'conectado' ? 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-300' : conta.status === 'erro' ? 'bg-destructive/12 text-destructive' : 'bg-amber-500/12 text-amber-800 dark:text-amber-300')}>
                {conta.status === 'conectado' ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
                {conta.status === 'conectado' ? 'Conectado' : conta.status === 'erro' ? 'Com problema' : 'Aguardando teste'}
              </span>
            }
          />
          {conta.status_detalhe && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{conta.status_detalhe}</p>}
          <Copiar id="wa-webhook" rotulo="Endereço do webhook (URL de callback)" valor={wa.webhookUrl} />
          <Copiar id="wa-verify" rotulo="Token de verificação" valor={conta.verify_token} />
          <p className="text-xs text-muted-foreground">
            {conta.ultimo_evento_em ? <>Último evento recebido da Meta: <b className="text-foreground">{formatarDataHora(conta.ultimo_evento_em)}</b>.</> : 'Nenhum evento recebido da Meta ainda. Confira o webhook e assine o campo messages.'}
          </p>
          {teste && (
            <div role="status" className={cn('rounded-xl px-3 py-2.5 text-xs', teste.ok ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' : 'bg-destructive/10 text-destructive')}>
              {teste.ok
                ? <>Tudo certo: <b>{teste.nome}</b> ({teste.numero}){teste.qualidade ? `, qualidade ${teste.qualidade === 'GREEN' ? 'alta' : teste.qualidade === 'YELLOW' ? 'média' : teste.qualidade === 'RED' ? 'baixa' : teste.qualidade}` : ''}. O app foi assinado para receber mensagens.</>
                : teste.erro}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={testar} disabled={testando}>{testando ? <Loader2 className="animate-spin" /> : <Zap />} Testar conexão</Button>
            <Button variant="outline" onClick={() => setEditando((v) => !v)}>{editando ? 'Cancelar troca' : 'Trocar token ou número'}</Button>
            <HoldToDeleteButton aoConfirmar={() => { void wa.desconectar(); }} rotulo="Segure para desconectar" rotuloFeito="Desconectado" descricao="o WhatsApp da empresa" />
          </div>
          <p className="text-[11px] text-muted-foreground">Desconectar apaga o token e o App Secret do cofre. As conversas já recebidas continuam guardadas.</p>
        </GlassCard>
      )}

      {mostrarForm && (
        <GlassCard className="max-w-3xl">
          <form onSubmit={salvar} className="space-y-4" noValidate>
            <CardTitle titulo={conta ? 'Trocar dados da conexão' : 'Dados da conta da Meta'} descricao="Siga o passo a passo abaixo para encontrar cada um." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="wa-pnid" rotulo="Phone Number ID" valor={form.phoneNumberId} erro={erros.phoneNumberId} inputMode="numeric" aoMudar={(v) => setForm((f) => ({ ...f, phoneNumberId: so(v) }))} />
              <Campo id="wa-waba" rotulo="WABA ID (conta do WhatsApp Business)" valor={form.wabaId} erro={erros.wabaId} inputMode="numeric" aoMudar={(v) => setForm((f) => ({ ...f, wabaId: so(v) }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wa-token">Token permanente (usuário do sistema)</Label>
              <div className="flex gap-2">
                <Input id="wa-token" type={verToken ? 'text' : 'password'} autoComplete="off" spellCheck={false} value={form.token} onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))} aria-invalid={!!erros.token} aria-describedby={erros.token ? 'wa-token-erro' : undefined} className="font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={() => setVerToken((v) => !v)} aria-label={verToken ? 'Esconder token' : 'Mostrar token'}>{verToken ? <EyeOff /> : <Eye />}</Button>
              </div>
              {erros.token && <p id="wa-token-erro" className="text-xs text-destructive">{erros.token}</p>}
            </div>
            <Campo id="wa-secret" rotulo="App Secret (chave secreta do aplicativo)" valor={form.appSecret} erro={erros.appSecret} tipo="password" aoMudar={(v) => setForm((f) => ({ ...f, appSecret: v.trim() }))} />
            <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden /> O token e o App Secret ficam num cofre criptografado no banco. Ninguém da equipe consegue ver de novo, nem o administrador.</p>
            <Button type="submit" disabled={!completo || salvando}>{salvando ? <Loader2 className="animate-spin" /> : <Check />} Salvar e mostrar o webhook</Button>
          </form>
        </GlassCard>
      )}

      <GlassCard className="max-w-3xl">
        <CardTitle titulo="Passo a passo" descricao="Leva uns 20 minutos na primeira vez. A conta e a cobrança da Meta ficam no nome da sua empresa." />
        <ol className="mt-4 space-y-4">
          {PASSOS.map((p, i) => (
            <li key={p.titulo} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand/15 text-[11px] font-semibold text-brand" aria-hidden>{i + 1}</span>
              <div className="text-[13px]">
                <p className="font-semibold">{p.titulo}</p>
                <p className="mt-0.5 text-muted-foreground [&_b]:font-medium [&_b]:text-foreground">{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs">
          <a className="inline-flex items-center gap-1 font-medium underline underline-offset-4" href="https://developers.facebook.com/apps" target="_blank" rel="noopener">Painel de apps da Meta <ExternalLink className="size-3" aria-hidden /></a>
          <a className="inline-flex items-center gap-1 font-medium underline underline-offset-4" href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener">Usuários do sistema <ExternalLink className="size-3" aria-hidden /></a>
          <a className="inline-flex items-center gap-1 font-medium underline underline-offset-4" href="/ajuda#conectar-whatsapp">Ajuda completa <ExternalLink className="size-3" aria-hidden /></a>
        </div>
      </GlassCard>
    </div>
  );
}

function Campo({ id, rotulo, valor, erro, aoMudar, tipo = 'text', inputMode }: {
  id: string; rotulo: string; valor: string; erro: string | null; aoMudar: (v: string) => void; tipo?: string; inputMode?: 'numeric';
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      <Input id={id} type={tipo} inputMode={inputMode} autoComplete="off" spellCheck={false} value={valor} onChange={(e) => aoMudar(e.target.value)} aria-invalid={!!erro} aria-describedby={erro ? `${id}-erro` : undefined} className="font-mono text-xs" />
      {erro && <p id={`${id}-erro`} className="text-xs text-destructive">{erro}</p>}
    </div>
  );
}
