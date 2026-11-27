'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Menu } from '@base-ui/react/menu';
import {
  AlertCircle, Archive, ArchiveRestore, ArrowLeft, Check, CheckCheck, Clock, FileText, Loader2, MessageCircle, MessageSquareText, MoreHorizontal,
  Plug, Plus, Search, Send, Sparkles, UserRound,
} from 'lucide-react';
import { EmptyState, GlassCard, iniciais } from '@/components/glass';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Painel } from '../_lib/use-painel';
import type { Lead } from '../_lib/tipos';
import { modelosParaLead, preencherModelo } from '../_lib/util';
import { formatarWaId, janelaAberta, restanteJanela, ROTULO_TIPO, type Conversa, type MensagemWA, type ModeloWA } from '../_lib/whatsapp';
import { ITEM, POPUP, ROTULO } from './acoes-lead';

type Filtro = 'todas' | 'nao_lidas' | 'minhas' | 'sem_responsavel';

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
function quando(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso), hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) return hora(iso);
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === ontem.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
function dia(iso: string) {
  const d = new Date(iso), hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) return 'Hoje';
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === ontem.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}

/* ---------------- Caixa de entrada ---------------- */

export function Conversas({ crm, visao, abrirLead, irPara, conversaPedida, aoAbrirPedida }: {
  crm: Painel; visao: string; abrirLead: (l: Lead) => void; irPara: (secao: string, visao?: string) => void;
  /** Conversa pedida por fora (sino, ficha do lead). */
  conversaPedida?: string | null; aoAbrirPedida?: () => void;
}) {
  const wa = crm.whatsapp;
  const admin = crm.papel === 'admin';
  const arquivadas = visao === 'arquivadas';
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [busca, setBusca] = useState('');
  const [aberta, setAberta] = useState<string | null>(null);
  const [nova, setNova] = useState(false);

  // Pedido de fora (sino): abre a conversa uma vez e devolve o pedido
  const [pedidaVista, setPedidaVista] = useState<string | null>(null);
  if (conversaPedida && conversaPedida !== pedidaVista) { setPedidaVista(conversaPedida); setAberta(conversaPedida); }
  if (!conversaPedida && pedidaVista) setPedidaVista(null);
  useEffect(() => { if (conversaPedida) aoAbrirPedida?.(); }, [conversaPedida, aoAbrirPedida]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const digitos = q.replace(/\D/g, '');
    return wa.conversas.filter((c) => {
      if ((c.status === 'arquivada') !== arquivadas) return false;
      if (filtro === 'nao_lidas' && !c.nao_lidas) return false;
      if (filtro === 'minhas' && c.responsavel_id !== crm.userId) return false;
      if (filtro === 'sem_responsavel' && c.responsavel_id) return false;
      if (!q) return true;
      const lead = c.lead_id ? crm.leads.find((l) => l.id === c.lead_id) : null;
      return [c.nome_contato, lead?.nome, c.ultima_previa].some((t) => t?.toLowerCase().includes(q)) || (!!digitos && c.wa_id.includes(digitos));
    });
  }, [wa.conversas, arquivadas, filtro, busca, crm.userId, crm.leads]);

  const conversa = wa.conversas.find((c) => c.id === aberta) ?? null;

  useEffect(() => { if (aberta) void wa.abrirConversa(aberta); }, [aberta]); // eslint-disable-line react-hooks/exhaustive-deps

  if (wa.carregando) return <GlassCard className="grid min-h-80 place-items-center"><Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Carregando conversas" /></GlassCard>;

  if (!wa.conta) {
    return (
      <GlassCard>
        <EmptyState
          icone={MessageCircle}
          titulo="Conecte o WhatsApp da empresa"
          texto={admin
            ? 'Com o número oficial conectado, as mensagens dos clientes chegam aqui, já ligadas aos leads, e a equipe responde sem sair do CRM.'
            : 'O administrador da empresa ainda não conectou o WhatsApp. Quando conectar, as conversas aparecem aqui.'}
          acao={admin ? <Button onClick={() => irPara('integracoes', 'whatsapp')}><Plug /> Conectar WhatsApp</Button> : undefined}
        />
      </GlassCard>
    );
  }

  const filtros: { id: Filtro; label: string }[] = [
    { id: 'todas', label: 'Todas' }, { id: 'nao_lidas', label: 'Não lidas' }, { id: 'minhas', label: 'Minhas' }, { id: 'sem_responsavel', label: 'Sem responsável' },
  ];

  return (
    <div className="space-y-3">
      {wa.conta.status !== 'conectado' && (
        <div role="status" className="flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px]">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <p>
            <b className="font-semibold">{wa.conta.status === 'erro' ? 'A conexão com o WhatsApp tem um problema.' : 'A conexão ainda não foi testada.'}</b>{' '}
            <span className="text-muted-foreground">{wa.conta.status_detalhe ?? 'Mensagens podem não chegar até o teste passar.'}</span>{' '}
            {admin && <button type="button" onClick={() => irPara('integracoes', 'whatsapp')} className="font-medium underline underline-offset-4">Ver conexão</button>}
          </p>
        </div>
      )}

      <GlassCard className="grid h-[calc(100dvh-16rem)] min-h-[26rem] grid-cols-1 overflow-hidden p-0 md:grid-cols-[minmax(16rem,22rem)_1fr]">
        {/* Lista */}
        <section aria-label="Conversas" className={cn('flex min-h-0 flex-col border-glass-border md:border-r', conversa && 'hidden md:flex')}>
          <div className="space-y-2.5 border-b border-glass-border p-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome, número ou texto" aria-label="Buscar conversas" className="pl-8" />
              </div>
              <Button size="icon" variant="outline" onClick={() => setNova(true)} aria-label="Nova conversa" title="Nova conversa"><Plus /></Button>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="Filtrar conversas">
              {filtros.map((f) => (
                <button key={f.id} type="button" aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}
                  className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                    filtro === f.id ? 'bg-foreground text-background' : 'bg-pill-active/60 text-muted-foreground hover:text-foreground dark:bg-white/8')}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {lista.length === 0 && (
              <li className="px-4 py-10 text-center text-xs text-muted-foreground">
                {busca ? 'Nenhuma conversa encontrada.' : arquivadas ? 'Nenhuma conversa arquivada.' : filtro === 'todas' ? 'Quando um cliente mandar mensagem para o número da empresa, a conversa aparece aqui.' : 'Nada neste filtro.'}
              </li>
            )}
            {lista.map((c) => (
              <li key={c.id}>
                <ItemConversa c={c} crm={crm} ativa={c.id === aberta} aoAbrir={() => setAberta(c.id)} />
              </li>
            ))}
          </ul>
        </section>

        {/* Conversa aberta */}
        <section aria-label="Conversa" className={cn('flex min-h-0 flex-col', !conversa && 'hidden md:flex')}>
          {conversa ? (
            <Thread key={conversa.id} crm={crm} c={conversa} voltar={() => setAberta(null)} abrirLead={abrirLead} />
          ) : (
            <div className="grid flex-1 place-items-center">
              <EmptyState icone={MessageSquareText} titulo="Escolha uma conversa" texto="As mensagens chegam em tempo real. Responda, passe para um colega ou abra a ficha do lead." />
            </div>
          )}
        </section>
      </GlassCard>

      <NovaConversaDialog crm={crm} aberto={nova} aoMudar={setNova} aoCriar={(id) => { setNova(false); setAberta(id); }} />
    </div>
  );
}

function nomeDaConversa(c: Conversa, crm: Painel) {
  const lead = c.lead_id ? crm.leads.find((l) => l.id === c.lead_id) : null;
  return lead?.nome || c.nome_contato || formatarWaId(c.wa_id);
}

function ItemConversa({ c, crm, ativa, aoAbrir }: { c: Conversa; crm: Painel; ativa: boolean; aoAbrir: () => void }) {
  const nome = nomeDaConversa(c, crm);
  const resp = c.responsavel_id ? crm.equipe.find((m) => m.id === c.responsavel_id)?.nome : null;
  return (
    <button type="button" onClick={aoAbrir} aria-current={ativa || undefined}
      className={cn('flex w-full items-start gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors', ativa ? 'bg-pill-active dark:bg-white/10' : 'hover:bg-pill-active/60 dark:hover:bg-white/6')}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-pill-active/80 text-xs font-bold dark:bg-white/10" aria-hidden>{iniciais(nome)}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className={cn('min-w-0 flex-1 truncate text-[13px]', c.nao_lidas ? 'font-semibold' : 'font-medium')}>{nome}</span>
          <span className={cn('shrink-0 text-[11px]', c.nao_lidas ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{quando(c.ultima_mensagem_em)}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className={cn('min-w-0 flex-1 truncate text-xs', c.nao_lidas ? 'text-foreground' : 'text-muted-foreground')}>{c.ultima_previa || 'Sem mensagens'}</span>
          {c.nao_lidas > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand-solid px-1.5 text-[10px] font-semibold text-brand-solid-foreground" aria-label={`${c.nao_lidas} não lidas`}>{c.nao_lidas > 99 ? '99+' : c.nao_lidas}</span>}
        </span>
        <span className="mt-1 block truncate text-[11px] text-muted-foreground">{resp ? `Com ${resp.split(' ')[0]}` : 'Sem responsável'}</span>
      </span>
    </button>
  );
}

/* ---------------- Conversa ---------------- */

function IconeStatus({ m }: { m: MensagemWA }) {
  if (m.status === 'enviando') return <Clock className="size-3" aria-label="Enviando" />;
  if (m.status === 'falhou') return <AlertCircle className="size-3 text-destructive" aria-label="Falhou" />;
  if (m.status === 'enviada') return <Check className="size-3" aria-label="Enviada" />;
  if (m.status === 'entregue') return <CheckCheck className="size-3" aria-label="Entregue" />;
  if (m.status === 'lida') return <CheckCheck className="size-3 text-sky-500" aria-label="Lida" />;
  return null;
}

function Bolha({ m, crm }: { m: MensagemWA; crm: Painel }) {
  const saida = m.direcao === 'saida';
  const [abrindo, setAbrindo] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const temMidia = !!m.midia_id && ['image', 'audio', 'video', 'document', 'sticker'].includes(m.tipo);
  const autor = saida && m.autor_id ? crm.equipe.find((x) => x.id === m.autor_id)?.nome?.split(' ')[0] : null;

  const abrir = async () => {
    setAbrindo(true);
    const u = await crm.whatsapp.baixarMidia(m.id);
    setAbrindo(false);
    if (!u) return;
    if (m.tipo === 'document') { const a = document.createElement('a'); a.href = u; a.download = m.midia_nome || 'arquivo'; a.click(); }
    else setUrl(u);
  };

  return (
    <div className={cn('flex', saida ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[85%] rounded-2xl px-3 py-2 text-[13px] shadow-sm sm:max-w-[70%]',
        saida ? 'rounded-br-md bg-brand-solid text-brand-solid-foreground' : 'rounded-bl-md bg-pill-active/80 dark:bg-white/10',
        m.status === 'falhou' && 'ring-1 ring-destructive/60')}>
        {m.tipo === 'template' && <p className={cn('mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide', saida ? '' : 'text-muted-foreground')}><Sparkles className="size-3" aria-hidden /> Modelo</p>}
        {temMidia && (
          url ? (
            m.tipo === 'audio' ? <audio controls src={url} className="max-w-full" />
              : m.tipo === 'video' ? <video controls src={url} className="max-h-72 rounded-xl" />
                // eslint-disable-next-line @next/next/no-img-element -- blob local da mídia recebida
                : <img src={url} alt={m.texto || 'Imagem recebida'} className="max-h-72 rounded-xl" />
          ) : (
            <button type="button" onClick={abrir} disabled={abrindo} className={cn('mb-1 flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium', saida ? 'bg-black/15' : 'bg-background/60 dark:bg-white/10')}>
              {abrindo ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" aria-hidden />}
              {m.tipo === 'document' ? `Baixar ${m.midia_nome || 'documento'}` : `Abrir ${ROTULO_TIPO[m.tipo].toLowerCase()}`}
            </button>
          )
        )}
        {m.texto && !(temMidia && m.tipo === 'document' && m.texto === m.midia_nome) && <p className="whitespace-pre-wrap break-words">{m.texto}</p>}
        {!m.texto && !temMidia && <p className="italic opacity-80">{ROTULO_TIPO[m.tipo]}</p>}
        <p className={cn('mt-1 flex items-center justify-end gap-1 text-[10px]', saida ? '' : 'text-muted-foreground')}>
          {autor && <span>{autor} ·</span>}
          {hora(m.criado_em)}
          {saida && <IconeStatus m={m} />}
        </p>
        {m.status === 'falhou' && m.erro && <p className="mt-1 text-[11px] font-medium">{m.erro}</p>}
      </div>
    </div>
  );
}

function Thread({ crm, c, voltar, abrirLead }: { crm: Painel; c: Conversa; voltar: () => void; abrirLead: (l: Lead) => void }) {
  const wa = crm.whatsapp;
  const admin = crm.papel === 'admin';
  const mensagens = wa.mensagens[c.id];
  const lead = c.lead_id ? crm.leads.find((l) => l.id === c.lead_id) ?? null : null;
  const nome = nomeDaConversa(c, crm);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [modelo, setModelo] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 60e3); return () => clearInterval(t); }, []);
  useEffect(() => { fim.current?.scrollIntoView({ block: 'end' }); }, [mensagens?.length]);

  const aberta = janelaAberta(c, agora);
  const restam = restanteJanela(c, agora);
  const bloqueado = !!lead && (lead.nao_contatar || !!lead.anonimizado_em);
  const prontas = lead ? modelosParaLead(crm.modelos, lead) : crm.modelos.filter((m) => !m.etapa_id);
  const vendedorNome = crm.nomeUsuario;

  const enviar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    const ok = await wa.enviarTexto(c.id, t);
    setEnviando(false);
    if (ok) { setTexto(''); campo.current?.focus(); }
  };

  // Agrupa por dia para os separadores
  const grupos = useMemo(() => {
    const g: { dia: string; itens: MensagemWA[] }[] = [];
    for (const m of mensagens ?? []) {
      const d = dia(m.criado_em);
      if (g[g.length - 1]?.dia !== d) g.push({ dia: d, itens: [] });
      g[g.length - 1].itens.push(m);
    }
    return g;
  }, [mensagens]);

  return (
    <>
      <header className="flex items-center gap-2.5 border-b border-glass-border px-3 py-2.5">
        <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={voltar} aria-label="Voltar às conversas"><ArrowLeft /></Button>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-pill-active/80 text-xs font-bold dark:bg-white/10" aria-hidden>{iniciais(nome)}</span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{nome}</h2>
          <p className="truncate text-[11px] text-muted-foreground">{formatarWaId(c.wa_id)}{c.nome_contato && lead && c.nome_contato !== lead.nome ? ` · ${c.nome_contato}` : ''}</p>
        </div>
        {lead && <Button variant="outline" size="sm" onClick={() => abrirLead(lead)}><UserRound /> <span className="hidden sm:inline">Ficha do lead</span></Button>}
        <Menu.Root>
          <Menu.Trigger aria-label="Mais ações da conversa" className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-pill-active hover:text-foreground data-[popup-open]:bg-pill-active dark:hover:bg-white/10">
            <MoreHorizontal className="size-4" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={6} align="end" className="z-50">
              <Menu.Popup className={POPUP}>
                <p className={ROTULO}>Responsável</p>
                {c.responsavel_id !== crm.userId && <Menu.Item className={ITEM} onClick={() => wa.atribuir(c.id, crm.userId)}><UserRound className="size-3.5" /> Assumir conversa</Menu.Item>}
                {admin && crm.equipe.filter((m) => m.id !== crm.userId && m.id !== c.responsavel_id).map((m) => (
                  <Menu.Item key={m.id} className={ITEM} onClick={() => wa.atribuir(c.id, m.id)}>Passar para {m.nome?.split(' ')[0] || m.email}</Menu.Item>
                ))}
                {c.responsavel_id && (admin || c.responsavel_id === crm.userId) && <Menu.Item className={ITEM} onClick={() => wa.atribuir(c.id, null)}>Deixar sem responsável</Menu.Item>}
                <Menu.Separator className="my-1 h-px bg-glass-border" />
                {c.status === 'aberta'
                  ? <Menu.Item className={ITEM} onClick={() => wa.arquivar(c.id, true)}><Archive className="size-3.5" /> Arquivar</Menu.Item>
                  : <Menu.Item className={ITEM} onClick={() => wa.arquivar(c.id, false)}><ArchiveRestore className="size-3.5" /> Reabrir</Menu.Item>}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4" aria-live="polite" aria-label={`Mensagens com ${nome}`}>
        {!mensagens && <div className="grid h-full place-items-center"><Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Carregando mensagens" /></div>}
        {grupos.map((g) => (
          <div key={g.dia} className="space-y-2">
            <p className="sticky top-0 z-10 mx-auto w-fit rounded-full bg-background/80 px-2.5 py-0.5 text-[11px] text-muted-foreground backdrop-blur">{g.dia}</p>
            {g.itens.map((m) => <Bolha key={m.id} m={m} crm={crm} />)}
          </div>
        ))}
        <div ref={fim} />
      </div>

      <footer className="border-t border-glass-border p-3">
        {bloqueado ? (
          <p className="rounded-xl bg-destructive/10 px-3 py-2.5 text-xs text-destructive">Este contato pediu para não ser contatado (LGPD). Não é possível enviar mensagens.</p>
        ) : aberta ? (
          <form onSubmit={enviar} className="space-y-2">
            {restam < 3 * 3600e3 && (
              <p className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400"><Clock className="size-3" aria-hidden /> A janela de 24h fecha em {Math.max(1, Math.round(restam / 60e3))} min. Depois disso, só com modelo aprovado.</p>
            )}
            <div className="flex items-end gap-2">
              {prontas.length > 0 && (
                <Menu.Root>
                  <Menu.Trigger aria-label="Inserir mensagem pronta" title="Mensagens prontas" className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-pill-active hover:text-foreground data-[popup-open]:bg-pill-active dark:hover:bg-white/10">
                    <MessageSquareText className="size-4" />
                  </Menu.Trigger>
                  <Menu.Portal>
                    <Menu.Positioner sideOffset={6} align="start" side="top" className="z-50">
                      <Menu.Popup className={cn(POPUP, 'max-h-72 max-w-80 overflow-y-auto')}>
                        <p className={ROTULO}>Mensagens prontas</p>
                        {prontas.map((p) => (
                          <Menu.Item key={p.id} className={cn(ITEM, 'flex-col items-start gap-0.5')} onClick={() => { setTexto(preencherModelo(p.texto, { nome: lead?.nome || c.nome_contato || '', empresa: crm.empresa?.nome, vendedor: vendedorNome })); setTimeout(() => campo.current?.focus(), 0); }}>
                            <span className="font-medium">{p.titulo}</span>
                            <span className="line-clamp-2 text-[11px] text-muted-foreground">{p.texto}</span>
                          </Menu.Item>
                        ))}
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
              )}
              <textarea
                ref={campo}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void enviar(); } }}
                rows={1}
                maxLength={4096}
                placeholder="Escreva uma mensagem"
                aria-label="Mensagem"
                className="field-sizing-content max-h-40 min-h-10 flex-1 resize-none rounded-2xl border border-input bg-pill-active/55 px-3.5 py-2.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-white/6"
              />
              <Button type="submit" size="icon" disabled={!texto.trim() || enviando} aria-label="Enviar">{enviando ? <Loader2 className="animate-spin" /> : <Send />}</Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-2 rounded-2xl bg-pill-active/60 p-3 sm:flex-row sm:items-center dark:bg-white/6">
            <p className="flex-1 text-xs text-muted-foreground">
              <b className="font-semibold text-foreground">Fora da janela de 24h.</b> O WhatsApp só permite retomar a conversa com um modelo aprovado pela Meta. Quando o cliente responder, o chat livre volta.
            </p>
            <Button size="sm" onClick={() => setModelo(true)}><Sparkles /> Enviar modelo</Button>
          </div>
        )}
      </footer>

      <ModeloDialog crm={crm} aberto={modelo} aoMudar={setModelo} conversaId={c.id} nome={lead?.nome || c.nome_contato || ''} />
    </>
  );
}

/* ---------------- Modelos aprovados ---------------- */

function useModelos(crm: Painel, ativo: boolean) {
  const [modelos, setModelos] = useState<ModeloWA[] | null>(null);
  useEffect(() => {
    if (!ativo || modelos) return;
    let vivo = true;
    void crm.whatsapp.listarModelos().then((m) => { if (vivo) setModelos(m); });
    return () => { vivo = false; };
  }, [ativo, modelos, crm.whatsapp]);
  return modelos;
}

function EscolherModelo({ crm, ativo, nome, aoEnviar, enviando }: {
  crm: Painel; ativo: boolean; nome: string; enviando: boolean; aoEnviar: (m: ModeloWA, parametros: string[]) => void;
}) {
  const modelos = useModelos(crm, ativo);
  const [escolhido, setEscolhido] = useState<ModeloWA | null>(null);
  const [params, setParams] = useState<string[]>([]);

  const escolher = (m: ModeloWA) => {
    setEscolhido(m);
    // Sugestão: {{1}} = primeiro nome do cliente, {{2}} = quem envia
    setParams(Array.from({ length: m.variaveis }, (_, i) => (i === 0 ? nome.trim().split(/\s+/)[0] || '' : i === 1 ? crm.nomeUsuario.split(' ')[0] : '')));
  };
  const previa = escolhido ? escolhido.texto.replace(/\{\{(\d+)\}\}/g, (_, n) => params[Number(n) - 1] || `{{${n}}}`) : '';

  if (!modelos) return <div className="grid h-32 place-items-center"><Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Carregando modelos" /></div>;
  if (!modelos.length) {
    return (
      <p className="rounded-xl bg-pill-active/60 p-3 text-xs text-muted-foreground dark:bg-white/6">
        Nenhum modelo aprovado. Crie modelos no <b className="text-foreground">Gerenciador do WhatsApp</b> da Meta (business.facebook.com › WhatsApp › Modelos de mensagem). A aprovação costuma levar minutos.
      </p>
    );
  }

  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (escolhido) aoEnviar(escolhido, params); }}>
      <div className="max-h-48 space-y-1 overflow-y-auto" role="radiogroup" aria-label="Modelos aprovados">
        {modelos.map((m) => (
          <button key={`${m.nome}-${m.idioma}`} type="button" role="radio" aria-checked={escolhido === m} onClick={() => escolher(m)}
            className={cn('w-full rounded-xl px-3 py-2 text-left text-xs transition-colors', escolhido === m ? 'bg-brand/12 ring-1 ring-brand/50' : 'hover:bg-pill-active/70 dark:hover:bg-white/8')}>
            <span className="flex items-center gap-2"><span className="font-mono text-[11px] font-medium">{m.nome}</span><span className="text-[10px] text-muted-foreground">{m.idioma} · {m.categoria === 'MARKETING' ? 'Marketing' : m.categoria === 'UTILITY' ? 'Utilidade' : m.categoria}</span></span>
            <span className="mt-0.5 line-clamp-2 block text-muted-foreground">{m.texto}</span>
          </button>
        ))}
      </div>
      {escolhido && (
        <>
          {params.map((p, i) => (
            <div key={i} className="space-y-1">
              <Label htmlFor={`var-${i}`}>Variável {`{{${i + 1}}}`}</Label>
              <Input id={`var-${i}`} value={p} onChange={(e) => setParams((l) => l.map((x, j) => (j === i ? e.target.value : x)))} required maxLength={1000} />
            </div>
          ))}
          <div className="rounded-xl bg-pill-active/60 p-3 text-[13px] whitespace-pre-wrap dark:bg-white/6"><p className="mb-1 text-[11px] font-medium text-muted-foreground">Prévia</p>{previa}</div>
          <p className="text-[11px] text-muted-foreground">Mensagens com modelo são cobradas pela Meta direto na conta da empresa.</p>
        </>
      )}
      <DialogFooter>
        <Button type="submit" disabled={!escolhido || enviando || params.some((p) => !p.trim())}>{enviando ? <Loader2 className="animate-spin" /> : <Send />} Enviar modelo</Button>
      </DialogFooter>
    </form>
  );
}

function ModeloDialog({ crm, aberto, aoMudar, conversaId, nome }: { crm: Painel; aberto: boolean; aoMudar: (v: boolean) => void; conversaId: string; nome: string }) {
  const [enviando, setEnviando] = useState(false);
  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar modelo aprovado</DialogTitle>
          <DialogDescription>Fora da janela de 24h, o WhatsApp só aceita modelos aprovados pela Meta.</DialogDescription>
        </DialogHeader>
        <EscolherModelo crm={crm} ativo={aberto} nome={nome} enviando={enviando} aoEnviar={async (m, p) => {
          setEnviando(true);
          const ok = await crm.whatsapp.enviarModelo({ conversaId, nome: m.nome, idioma: m.idioma, parametros: p });
          setEnviando(false);
          if (ok) aoMudar(false);
        }} />
      </DialogContent>
    </Dialog>
  );
}

/** Começar uma conversa com um lead (sempre por modelo: a empresa fala primeiro). */
export function NovaConversaDialog({ crm, aberto, aoMudar, aoCriar, leadInicial }: {
  crm: Painel; aberto: boolean; aoMudar: (v: boolean) => void; aoCriar: (conversaId: string) => void; leadInicial?: Lead | null;
}) {
  const [busca, setBusca] = useState('');
  const [lead, setLead] = useState<Lead | null>(leadInicial ?? null);
  const [enviando, setEnviando] = useState(false);
  const [ultimo, setUltimo] = useState(aberto);
  if (aberto !== ultimo) { setUltimo(aberto); if (aberto) { setLead(leadInicial ?? null); setBusca(''); } }

  const existente = lead ? crm.whatsapp.conversas.find((c) => c.lead_id === lead.id) : null;
  const opcoes = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return crm.leads.filter((l) => l.telefone && !l.nao_contatar && !l.anonimizado_em && (!q || l.nome.toLowerCase().includes(q) || (l.telefone ?? '').includes(q.replace(/\D/g, '') || '§'))).slice(0, 30);
  }, [crm.leads, busca]);

  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova conversa</DialogTitle>
          <DialogDescription>Escolha o lead e um modelo aprovado. Quando ele responder, o chat livre fica liberado por 24h.</DialogDescription>
        </DialogHeader>
        {!lead ? (
          <div className="space-y-2">
            <Input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar lead por nome ou telefone" aria-label="Buscar lead" />
            <ul className="max-h-64 space-y-0.5 overflow-y-auto">
              {opcoes.length === 0 && <li className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhum lead com telefone encontrado.</li>}
              {opcoes.map((l) => (
                <li key={l.id}>
                  <button type="button" onClick={() => setLead(l)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-[13px] hover:bg-pill-active/70 dark:hover:bg-white/8">
                    <span className="truncate font-medium">{l.nome}</span><span className="shrink-0 text-xs text-muted-foreground">{l.telefone}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : existente ? (
          <div className="space-y-3 text-[13px]">
            <p>Já existe uma conversa com <b>{lead.nome}</b>.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLead(null)}>Escolher outro</Button>
              <Button onClick={() => aoCriar(existente.id)}>Abrir conversa</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-pill-active/60 px-3 py-2 text-[13px] dark:bg-white/6">
              <span><b className="font-semibold">{lead.nome}</b> <span className="text-muted-foreground">· {lead.telefone}</span></span>
              {!leadInicial && <button type="button" onClick={() => setLead(null)} className="text-xs font-medium underline underline-offset-4">Trocar</button>}
            </div>
            <EscolherModelo crm={crm} ativo={aberto} nome={lead.nome} enviando={enviando} aoEnviar={async (m, p) => {
              setEnviando(true);
              const id = await crm.whatsapp.enviarModelo({ leadId: lead.id, nome: m.nome, idioma: m.idioma, parametros: p });
              setEnviando(false);
              if (id) aoCriar(id);
            }} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
