'use client';

import { useState } from 'react';
import { AlertCircle, Check, CheckCircle2, ExternalLink, Eye, EyeOff, Loader2, RefreshCw, ShieldCheck, Zap } from 'lucide-react';
import { CardTitle, GlassCard, PageHeader } from '@/components/glass';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HoldToDeleteButton } from '@/components/microkit/hold-to-delete-button';
import { cn } from '@/lib/utils';
import type { Painel } from '../_lib/use-painel';
import type { Lead } from '../_lib/tipos';
import { formatarDataHora } from '../_lib/util';
import { Campo, Copiar } from './whatsapp-conexao';

const PASSOS: { titulo: string; texto: React.ReactNode }[] = [
  { titulo: 'Use o mesmo app da Meta', texto: <>Se a empresa já conectou o WhatsApp, use o mesmo app em <b>developers.facebook.com</b>. Se não, crie um app do tipo <b>Empresa</b> e vincule ao portfólio empresarial da empresa.</> },
  { titulo: 'Pegue o ID da Página', texto: <>Na Página do Facebook que roda os anúncios: <b>Configurações › Transparência da Página</b> (ou <b>Sobre</b>) mostra o <b>ID da Página</b>.</> },
  { titulo: 'Gere o token da Página', texto: <>Em <b>business.facebook.com › Usuários do sistema</b>, dê ao usuário do sistema acesso à Página e gere um token com <span className="font-mono">leads_retrieval</span>, <span className="font-mono">pages_manage_metadata</span>, <span className="font-mono">pages_show_list</span> e <span className="font-mono">pages_read_engagement</span>, validade <b>Nunca</b>.</> },
  { titulo: 'Configure o webhook', texto: <>Salve os dados abaixo. No app, em <b>Webhooks</b>, escolha o objeto <b>Page</b>, cole o <b>endereço</b> e o <b>token de verificação</b> que vão aparecer aqui e assine o campo <span className="font-mono">leadgen</span>.</> },
  { titulo: 'Libere o CRM nos leads', texto: <>Na Página, em <b>Configurações › Acesso a leads</b> (Central de Leads), deixe o app com acesso aos leads. Sem isso a Meta avisa, mas não entrega os dados.</> },
  { titulo: 'Teste com a ferramenta da Meta', texto: <>Toque em <b>Testar conexão</b> aqui. Depois abra a <b>Ferramenta de teste de anúncios de cadastro</b> da Meta, escolha a Página e o formulário e crie um lead de teste: ele deve aparecer no funil em segundos.</> },
];

const ROTULO_RESULTADO = { criado: 'Lead criado', duplicado: 'Já existia (no histórico)', erro: 'Erro', pendente: 'Processando' } as const;

export function AnunciosMeta({ crm, abrirLead }: { crm: Painel; abrirLead: (l: Lead) => void }) {
  const an = crm.anuncios;
  const conta = an.conta;
  const [form, setForm] = useState({ pageId: '', token: '', appSecret: '' });
  const [verToken, setVerToken] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [teste, setTeste] = useState<{ ok: boolean; pagina?: string; erro?: string | null } | null>(null);
  const [sync, setSync] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);

  const erros = {
    pageId: form.pageId && !/^[0-9]{5,30}$/.test(form.pageId) ? 'Só números (de 5 a 30 dígitos).' : null,
    token: form.token && (form.token.trim().length < 20 || /\s/.test(form.token.trim())) ? 'Cole o token completo, sem espaços.' : null,
    appSecret: form.appSecret && !/^[0-9a-f]{32}$/i.test(form.appSecret.trim()) ? 'São 32 caracteres (0–9 e a–f).' : null,
  };
  const precisaSegredo = !an.podeReaproveitarSegredo;
  const completo = !!form.pageId && !!form.token && (!precisaSegredo || !!form.appSecret) && !Object.values(erros).some(Boolean);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completo) return;
    setSalvando(true);
    const ok = await an.conectar(form);
    setSalvando(false);
    if (ok) { setForm({ pageId: '', token: '', appSecret: '' }); setEditando(false); setTeste(null); }
  };

  const testar = async () => { setTestando(true); setTeste(await an.testar()); setTestando(false); };
  const sincronizar = async () => {
    setSincronizando(true);
    const r = await an.sincronizar();
    setSincronizando(false);
    if (r) {
      setSync(r.formularios === 0 ? 'Nenhum formulário encontrado na Página.'
        : `${r.formularios} ${r.formularios === 1 ? 'formulário' : 'formulários'} conferidos: ${r.criado} ${r.criado === 1 ? 'lead novo' : 'leads novos'}, ${r.duplicado} já no funil, ${r.ja_recebido} já recebidos antes${r.erro ? `, ${r.erro} com erro` : ''}.`);
      if (r.criado) void crm.recarregar();
    }
  };

  if (an.carregando) return <GlassCard className="grid min-h-60 place-items-center"><Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Carregando" /></GlassCard>;

  const mostrarForm = !conta || editando;

  return (
    <div className="space-y-5">
      <PageHeader titulo="Anúncios da Meta" subtitulo="Leads dos formulários do Facebook e do Instagram entram direto no funil, com a campanha e o anúncio de onde vieram." />

      {conta && (
        <GlassCard className="max-w-3xl space-y-4">
          <CardTitle
            titulo={conta.page_nome || 'Página conectada'}
            descricao={`ID da Página ${conta.page_id}`}
            acao={
              <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
                conta.status === 'conectado' ? 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-300' : conta.status === 'erro' ? 'bg-destructive/12 text-destructive' : 'bg-amber-500/12 text-amber-800 dark:text-amber-300')}>
                {conta.status === 'conectado' ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
                {conta.status === 'conectado' ? 'Conectado' : conta.status === 'erro' ? 'Com problema' : 'Aguardando teste'}
              </span>
            }
          />
          {conta.status_detalhe && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{conta.status_detalhe}</p>}
          <Copiar id="meta-webhook" rotulo="Endereço do webhook (URL de callback)" valor={an.webhookUrl} />
          <Copiar id="meta-verify" rotulo="Token de verificação" valor={conta.verify_token} />
          <p className="text-xs text-muted-foreground">
            {conta.ultimo_evento_em ? <>Último lead recebido da Meta: <b className="text-foreground">{formatarDataHora(conta.ultimo_evento_em)}</b>.</> : 'Nenhum lead recebido ainda. Depois de configurar, crie um lead de teste na ferramenta da Meta.'}
          </p>
          {teste && (
            <div role="status" className={cn('rounded-xl px-3 py-2.5 text-xs', teste.ok ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' : 'bg-destructive/10 text-destructive')}>
              {teste.ok ? <>Tudo certo: Página <b>{teste.pagina}</b> assinada para receber os leads dos formulários.</> : teste.erro}
            </div>
          )}
          {sync && <p role="status" className="rounded-xl bg-pill-active/60 px-3 py-2.5 text-xs dark:bg-white/6">{sync}</p>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={testar} disabled={testando}>{testando ? <Loader2 className="animate-spin" /> : <Zap />} Testar conexão</Button>
            <Button variant="outline" onClick={sincronizar} disabled={sincronizando} title="Busca os leads dos últimos 7 dias em todos os formulários da Página">
              {sincronizando ? <Loader2 className="animate-spin" /> : <RefreshCw />} Buscar leads dos últimos 7 dias
            </Button>
            <Button variant="outline" onClick={() => setEditando((v) => !v)}>{editando ? 'Cancelar troca' : 'Trocar token ou Página'}</Button>
            <HoldToDeleteButton aoConfirmar={() => { void an.desconectar(); }} rotulo="Segure para desconectar" rotuloFeito="Desconectado" descricao="os anúncios da Meta" />
          </div>
        </GlassCard>
      )}

      {conta && (
        <GlassCard className="max-w-3xl">
          <CardTitle titulo="Últimos leads recebidos" descricao="Os 20 mais recentes vindos dos formulários. Repetidos não viram lead novo: entram no histórico do lead que já existe." />
          {an.recebidos.length === 0 ? (
            <p className="mt-3 rounded-xl bg-pill-active/50 px-3 py-3 text-xs text-muted-foreground dark:bg-white/6">Nada ainda. Os leads aparecem aqui assim que alguém preenche um formulário de anúncio.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border/60">
              {an.recebidos.map((r) => {
                const lead = r.lead_id ? crm.leads.find((l) => l.id === r.lead_id) : null;
                return (
                  <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-[13px]">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{lead?.nome ?? (r.resultado === 'erro' ? 'Lead não importado' : 'Lead')}</p>
                      <p className="truncate text-xs text-muted-foreground">{[r.campanha, r.formulario].filter(Boolean).join(' · ') || 'Formulário de anúncio'} · {formatarDataHora(r.recebido_em)}</p>
                      {r.erro && <p className="text-xs text-destructive">{r.erro}</p>}
                    </div>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium',
                      r.resultado === 'criado' ? 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-300' : r.resultado === 'erro' ? 'bg-destructive/12 text-destructive' : 'bg-muted text-muted-foreground')}>
                      {ROTULO_RESULTADO[r.resultado]}
                    </span>
                    {lead && <Button size="xs" variant="outline" onClick={() => abrirLead(lead)}>Abrir</Button>}
                  </li>
                );
              })}
            </ul>
          )}
        </GlassCard>
      )}

      {mostrarForm && (
        <GlassCard className="max-w-3xl">
          <form onSubmit={salvar} className="space-y-4" noValidate>
            <CardTitle titulo={conta ? 'Trocar dados da conexão' : 'Dados da Página'} descricao="Siga o passo a passo abaixo para encontrar cada um." />
            <Campo id="meta-page" rotulo="ID da Página do Facebook" valor={form.pageId} erro={erros.pageId} inputMode="numeric" aoMudar={(v) => setForm((f) => ({ ...f, pageId: v.replace(/\D/g, '') }))} />
            <div className="space-y-1.5">
              <Label htmlFor="meta-token">Token permanente da Página (usuário do sistema)</Label>
              <div className="flex gap-2">
                <Input id="meta-token" type={verToken ? 'text' : 'password'} autoComplete="off" spellCheck={false} value={form.token} onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))} aria-invalid={!!erros.token} aria-describedby={erros.token ? 'meta-token-erro' : undefined} className="font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={() => setVerToken((v) => !v)} aria-label={verToken ? 'Esconder token' : 'Mostrar token'}>{verToken ? <EyeOff /> : <Eye />}</Button>
              </div>
              {erros.token && <p id="meta-token-erro" className="text-xs text-destructive">{erros.token}</p>}
            </div>
            <Campo id="meta-secret" rotulo={precisaSegredo ? 'App Secret (chave secreta do aplicativo)' : 'App Secret (opcional: em branco usa o mesmo do WhatsApp)'} valor={form.appSecret} erro={erros.appSecret} tipo="password" aoMudar={(v) => setForm((f) => ({ ...f, appSecret: v.trim() }))} />
            <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden /> O token e o App Secret ficam num cofre criptografado no banco. Ninguém da equipe consegue ver de novo.</p>
            <Button type="submit" disabled={!completo || salvando}>{salvando ? <Loader2 className="animate-spin" /> : <Check />} Salvar e mostrar o webhook</Button>
          </form>
        </GlassCard>
      )}

      <GlassCard className="max-w-3xl">
        <CardTitle titulo="Passo a passo" descricao="Os leads chegam com origem Facebook Ads ou Instagram Ads, a campanha e o anúncio. A roleta de distribuição vale para eles." />
        <ol className="mt-4 space-y-4">
          {PASSOS.map((p, i) => (
            <li key={p.titulo} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand/15 text-[11px] font-semibold text-foreground" aria-hidden>{i + 1}</span>
              <div className="text-[13px]">
                <p className="font-semibold">{p.titulo}</p>
                <p className="mt-0.5 text-muted-foreground [&_b]:font-medium [&_b]:text-foreground">{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 rounded-xl bg-pill-active/50 px-3 py-2.5 text-xs text-muted-foreground dark:bg-white/6">
          <b className="text-foreground">Anúncio que abre conversa no WhatsApp (Click-to-WhatsApp)</b> não precisa de nada disso: com o WhatsApp oficial conectado, quem chega pelo anúncio já vira lead com a campanha, e a conversa mostra de qual anúncio veio.
        </p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs">
          <a className="inline-flex items-center gap-1 font-medium underline underline-offset-4" href="https://developers.facebook.com/tools/lead-ads-testing" target="_blank" rel="noopener">Ferramenta de teste de leads <ExternalLink className="size-3" aria-hidden /></a>
          <a className="inline-flex items-center gap-1 font-medium underline underline-offset-4" href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener">Usuários do sistema <ExternalLink className="size-3" aria-hidden /></a>
          <a className="inline-flex items-center gap-1 font-medium underline underline-offset-4" href="/ajuda#anuncios-meta">Ajuda completa <ExternalLink className="size-3" aria-hidden /></a>
        </div>
      </GlassCard>
    </div>
  );
}
