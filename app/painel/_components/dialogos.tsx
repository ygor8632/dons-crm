'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Download, FileUp, Globe, Mail, MessageCircle, Percent, Phone, RotateCcw, ShieldCheck, Sparkles, StickyNote, Trash2, Trophy, UserX, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Segmented, Toggle } from '@/components/glass';
import { formatarMoeda } from '@/lib/marca';
import { cn } from '@/lib/utils';
import type { Painel } from '../_lib/use-painel';
import type { Anotacao, Atividade, BaseLegal, Lead, RegistroAcesso, Tarefa, TipoAtividade } from '../_lib/tipos';
import { acharDuplicados, BASES_LEGAIS, formatarDataHora, grupoTarefa, ROTULO_ACESSO } from '../_lib/util';
import { BotaoWhatsApp, pedirMotivoPerda, SeloSituacao, SinaisLead } from './acoes-lead';

type Aberto = { aberto: boolean; aoMudar: (v: boolean) => void };

const VAZIO = { nome: '', email: '', telefone: '', origem: 'Adicionado manualmente', vendedor_id: '', valor: '', documento: '', base_legal: '' };
const ORIGENS = ['Adicionado manualmente', 'WhatsApp', 'Instagram', 'Indicação', 'Site', 'Google'];

/** Cadastro rápido: nome, WhatsApp e origem; o resto fica em "Mais detalhes". */
export function NovoLeadDialog({ crm, aberto, aoMudar, abrirLead }: { crm: Painel; abrirLead?: (l: Lead) => void } & Aberto) {
  const [dados, setDados] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [mais, setMais] = useState(false);
  const campo = (k: keyof typeof VAZIO) => ({ value: dados[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDados({ ...dados, [k]: e.target.value }) });
  const duplicados = acharDuplicados(crm.leads, dados);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    if (await crm.criarLead(dados)) { setDados(VAZIO); setMais(false); aoMudar(false); }
    setSalvando(false);
  };

  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo lead</DialogTitle>
          <DialogDescription>Entra na primeira etapa do funil{crm.etapas[0] ? ` (${crm.etapas[0].nome})` : ''}. Só o nome é obrigatório.</DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="nl-nome">Nome *</Label><Input id="nl-nome" required autoFocus autoComplete="off" {...campo('nome')} /></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="nl-tel">WhatsApp</Label><Input id="nl-tel" inputMode="tel" placeholder="(11) 99999-0000" autoComplete="off" {...campo('telefone')} /></div>
            <div className="space-y-2">
              <Label htmlFor="nl-origem">Origem</Label>
              <Input id="nl-origem" list="nl-origens" {...campo('origem')} />
              <datalist id="nl-origens">{ORIGENS.map((o) => <option key={o} value={o} />)}</datalist>
            </div>
          </div>

          {duplicados.length > 0 && (
            <div role="status" className="rounded-2xl bg-amber-500/12 p-3 text-[13px] text-amber-900 dark:text-amber-100">
              <p className="font-medium">Parece que já existe:</p>
              <ul className="mt-1 space-y-1">
                {duplicados.slice(0, 3).map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">{l.nome} · {crm.etapas.find((e) => e.id === l.etapa_id)?.nome ?? 'sem etapa'}{l.situacao === 'perdido' ? ' (perdido)' : ''}</span>
                    {abrirLead && <Button type="button" size="xs" variant="outline" onClick={() => { aoMudar(false); abrirLead(l); }}>Abrir ficha</Button>}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs opacity-80">Você ainda pode salvar se for outra pessoa.</p>
            </div>
          )}

          <button type="button" onClick={() => setMais((v) => !v)} aria-expanded={mais} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            <ChevronDown className={cn('size-3.5 transition-transform duration-150', mais && 'rotate-180')} aria-hidden /> Mais detalhes (e-mail, valor, CPF/CNPJ, base legal{crm.papel === 'admin' && crm.equipe.length > 1 ? ', responsável' : ''})
          </button>
          {mais && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="nl-email">E-mail</Label><Input id="nl-email" type="email" {...campo('email')} /></div>
                <div className="space-y-2"><Label htmlFor="nl-valor">Valor (R$)</Label><Input id="nl-valor" type="number" step="0.01" min="0" inputMode="decimal" {...campo('valor')} /></div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="nl-doc">CPF ou CNPJ</Label><Input id="nl-doc" inputMode="numeric" {...campo('documento')} /></div>
                <div className="space-y-2">
                  <Label htmlFor="nl-base">Base legal (LGPD)</Label>
                  <select id="nl-base" {...campo('base_legal')} className="h-10 w-full appearance-none rounded-xl border border-input bg-pill-active/55 px-3 text-[13px] dark:bg-white/6">
                    <option value="">Não informada</option>
                    {BASES_LEGAIS.map((b) => <option key={b.id} value={b.id}>{b.rotulo}</option>)}
                  </select>
                </div>
                {crm.papel === 'admin' && crm.equipe.length > 1 && (
                  <div className="space-y-2">
                    <Label htmlFor="nl-resp">Responsável</Label>
                    <select id="nl-resp" {...campo('vendedor_id')} className="h-10 w-full appearance-none rounded-xl border border-input bg-pill-active/55 px-3 text-[13px] dark:bg-white/6">
                      <option value="">Sem responsável</option>
                      {crm.equipe.map((m) => <option key={m.id} value={m.id}>{m.nome || m.email}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => aoMudar(false)}>Cancelar</Button>
            <Button type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar lead'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ConvidarDialog({ crm, aberto, aoMudar }: { crm: Painel } & Aberto) {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    if (await crm.convidar(email)) { setEmail(''); aoMudar(false); }
    setEnviando(false);
  };
  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar vendedor</DialogTitle>
          <DialogDescription>A pessoa recebe um e-mail para criar a senha e entra como vendedor.</DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="cv-email">E-mail</Label><Input id="cv-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => aoMudar(false)}>Cancelar</Button>
            <Button type="submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar convite'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Ficha do lead: contato, etapa, anotações e follow-ups. */
export function FichaLeadDialog({ crm, lead, aoFechar, abrirConversa }: { crm: Painel; lead: Lead | null; aoFechar: () => void; /** Caixa de entrada do WhatsApp oficial (quando conectado). */ abrirConversa?: (lead: Lead) => void }) {
  const [aba, setAba] = useState<'anotacoes' | 'tarefas' | 'historico' | 'privacidade'>('anotacoes');
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [texto, setTexto] = useState('');
  const [desc, setDesc] = useState('');
  const [data, setData] = useState('');
  const [apagando, setApagando] = useState<string | null>(null);
  const [leadAnterior, setLeadAnterior] = useState<string | null>(null);

  // Trocou de lead: zera a ficha no próprio render (padrão recomendado pelo React)
  if ((lead?.id ?? null) !== leadAnterior) {
    setLeadAnterior(lead?.id ?? null);
    setAba('anotacoes'); setTexto(''); setDesc(''); setData(''); setAnotacoes([]); setTarefas([]); setAtividades([]);
  }

  // Lead "vivo" (etapa atualizada pelo Kanban/lista)
  const atual = lead ? crm.leads.find((l) => l.id === lead.id) ?? lead : null;
  const fechado = !!atual && (atual.situacao ?? 'aberto') !== 'aberto';

  const recarregar = useCallback(async () => {
    if (!lead) return;
    const r = await crm.carregarFicha(lead.id);
    setAnotacoes(r.anotacoes);
    setTarefas(r.tarefas);
    setAtividades(r.atividades);
  }, [lead, crm]);

  useEffect(() => {
    // Busca da ficha: os setState acontecem depois do await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (lead) { void recarregar(); void crm.registrarAcesso('visualizou', lead.id); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id]);

  // Mudou etapa/situação ou registrou atividade: atualiza o histórico se estiver aberto
  const marcaAtividade = atual ? `${atual.etapa_id}|${atual.situacao}|${atual.ultima_atividade_em}` : '';
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (lead && aba === 'historico') void recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marcaAtividade, aba]);

  const confirmarApagar = async (id: string, fn: (id: string) => Promise<void>) => {
    if (apagando !== id) { setApagando(id); setTimeout(() => setApagando((a) => (a === id ? null : a)), 2500); return; }
    setApagando(null);
    await fn(id);
    void recarregar();
  };

  return (
    <Dialog open={!!lead} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        {atual && (
          <>
            <div className="space-y-4 border-b border-border p-6 pb-4">
              <DialogHeader className="pr-8">
                <DialogTitle className="text-xl">{atual.nome}</DialogTitle>
                <DialogDescription>
                  {[atual.telefone, atual.email, atual.documento].filter(Boolean).join(' · ') || 'Sem contato'}
                  {(atual.valor ?? 0) > 0 && <> · <span className="tabular font-semibold text-foreground">{formatarMoeda(atual.valor || 0)}</span></>}
                </DialogDescription>
              </DialogHeader>
              {fechado && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-pill-active/45 p-2.5 pl-3 dark:bg-white/5">
                  <SeloSituacao lead={atual} />
                  {atual.fechado_em && <span className="text-xs text-muted-foreground">em {formatarDataHora(atual.fechado_em)}</span>}
                  <Button size="xs" variant="outline" className="ml-auto" onClick={() => void crm.reabrirLead(atual.id)}><RotateCcw /> Reabrir</Button>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <label className="relative inline-flex items-center">
                  <span className="sr-only">Etapa</span>
                  <span className="pointer-events-none absolute left-3 size-2 rounded-full" style={{ backgroundColor: crm.etapas.find((e) => e.id === atual.etapa_id)?.cor }} aria-hidden />
                  <select
                    value={atual.etapa_id ?? ''}
                    disabled={atual.situacao === 'perdido'}
                    onChange={(e) => void crm.moverLead(atual.id, e.target.value)}
                    className="h-8 appearance-none rounded-full border border-glass-border bg-pill-active/60 pr-3 pl-7 text-xs font-medium disabled:opacity-60 dark:bg-white/8"
                  >
                    {crm.etapas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </label>
                {!fechado && (
                  <label className="relative inline-flex items-center" title="Chance de fechar este negócio. Por padrão segue a etapa.">
                    <span className="sr-only">Chance de fechar</span>
                    <Percent className="pointer-events-none absolute left-2.5 size-3 text-muted-foreground" aria-hidden />
                    <select
                      value={atual.probabilidade ?? ''}
                      onChange={(e) => void crm.salvarProbabilidadeLead(atual.id, e.target.value === '' ? null : Number(e.target.value))}
                      className="h-8 appearance-none rounded-full border border-glass-border bg-pill-active/60 pr-3 pl-7 text-xs font-medium dark:bg-white/8"
                    >
                      <option value="">Chance da etapa ({crm.etapas.find((e) => e.id === atual.etapa_id)?.probabilidade ?? 0}%)</option>
                      {[10, 25, 50, 75, 90].map((n) => <option key={n} value={n}>Chance {n}%</option>)}
                    </select>
                  </label>
                )}
                <BotaoWhatsApp crm={crm} lead={atual} variante="botao" />
                {abrirConversa && crm.whatsapp.conta && atual.telefone && !atual.nao_contatar && !atual.anonimizado_em && (
                  <Button size="sm" variant="outline" onClick={() => { aoFechar(); abrirConversa(atual); }}>
                    <MessageCircle /> {crm.whatsapp.conversas.some((c) => c.lead_id === atual.id) ? 'Ver conversa' : 'Iniciar conversa'}
                  </Button>
                )}
                {!fechado && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => void crm.fecharLead(atual.id, 'ganho')}><Trophy className="text-positive-foreground" /> Ganho</Button>
                    <Button size="sm" variant="outline" onClick={() => pedirMotivoPerda(atual)}><XCircle className="text-destructive" /> Perdido</Button>
                  </>
                )}
              </div>
              {!fechado && <SinaisLead crm={crm} lead={atual} />}
              <Segmented
                rotulo="Seções da ficha"
                valor={aba}
                aoMudar={setAba}
                opcoes={[{ id: 'anotacoes', label: 'Anotações' }, { id: 'tarefas', label: 'Follow-ups' }, { id: 'historico', label: 'Histórico' }, { id: 'privacidade', label: 'Privacidade' }]}
              />
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              {aba === 'privacidade' ? (
                <Privacidade crm={crm} lead={atual} aoAnonimizar={() => void recarregar()} />
              ) : aba === 'historico' ? (
                <Historico crm={crm} lead={atual} atividades={atividades} anotacoes={anotacoes} tarefas={tarefas} />
              ) : aba === 'anotacoes' ? (
                <>
                  <form
                    onSubmit={async (e) => { e.preventDefault(); if (!texto.trim()) return; await crm.adicionarAnotacao(atual.id, texto.trim()); setTexto(''); void recarregar(); }}
                    className="flex gap-2"
                  >
                    <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva uma anotação" aria-label="Nova anotação" />
                    <Button type="submit">Adicionar</Button>
                  </form>
                  {anotacoes.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma anotação. Registre ligações, combinados e objeções.</p>}
                  <ul className="space-y-2">
                    {anotacoes.map((n) => (
                      <li key={n.id} className="rounded-2xl bg-pill-active/45 p-3.5 dark:bg-white/5">
                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{n.texto}</p>
                        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span>{formatarDataHora(n.created_at)} · {n.perfis?.nome || 'Equipe'}</span>
                          <button type="button" onClick={() => confirmarApagar(n.id, crm.apagarAnotacao)} className={cn('rounded-full px-2 py-1 font-medium', apagando === n.id ? 'bg-destructive text-white dark:text-[#1b1716]' : 'hover:text-destructive')}>
                            {apagando === n.id ? 'Confirmar' : 'Excluir'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <form
                    onSubmit={async (e) => { e.preventDefault(); if (!desc.trim() || !data) return; await crm.criarTarefa(atual.id, desc.trim(), data); setDesc(''); setData(''); void recarregar(); }}
                    className="flex flex-col gap-2 sm:flex-row"
                  >
                    <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Próximo passo" aria-label="Descrição do follow-up" required />
                    <Input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} aria-label="Quando" required className="sm:w-52" />
                    <Button type="submit">Agendar</Button>
                  </form>
                  {tarefas.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Nenhum follow-up. Agende o próximo retorno para não perder o lead.</p>}
                  <ul className="space-y-1">
                    {tarefas.map((t) => {
                      const g = grupoTarefa(t);
                      return (
                        <li key={t.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={t.concluida}
                            aria-label={`Marcar “${t.descricao}” como ${t.concluida ? 'pendente' : 'concluído'}`}
                            onClick={async () => { await crm.alternarTarefa(t.id, t.concluida); void recarregar(); }}
                            className={cn('grid size-5 shrink-0 place-items-center rounded-full border-2', t.concluida ? 'border-brand-solid bg-brand-solid text-brand-solid-foreground' : 'border-foreground/30 hover:border-brand')}
                          >
                            {t.concluida && <Check className="size-3" strokeWidth={3} />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className={cn('truncate text-[13px] font-medium', t.concluida && 'text-muted-foreground line-through')}>{t.descricao}</p>
                            <p className={cn('text-xs', g === 'atrasada' ? 'text-destructive' : 'text-muted-foreground')}>{g === 'atrasada' && 'Atrasado · '}{formatarDataHora(t.data_vencimento)}</p>
                          </div>
                          <button type="button" onClick={() => confirmarApagar(t.id, crm.apagarTarefa)} aria-label={apagando === t.id ? 'Confirmar exclusão' : `Excluir “${t.descricao}”`} className={cn('grid h-7 shrink-0 place-items-center rounded-full px-2 text-xs font-medium', apagando === t.id ? 'bg-destructive text-white dark:text-[#1b1716]' : 'text-muted-foreground hover:text-destructive')}>
                            {apagando === t.id ? 'Confirmar' : <Trash2 className="size-3.5" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const ICONE_ATIVIDADE: Record<TipoAtividade | 'anotacao' | 'tarefa' | 'criado', typeof MessageCircle> = {
  whatsapp: MessageCircle, ligacao: Phone, email: Mail, etapa: ArrowRight, ganho: Trophy, perdido: XCircle,
  reaberto: RotateCcw, webhook: Globe, importacao: FileUp, anotacao: StickyNote, tarefa: Check, criado: Sparkles,
};
const ROTULO_ATIVIDADE: Record<TipoAtividade, string> = {
  whatsapp: 'WhatsApp', ligacao: 'Ligação', email: 'E-mail', etapa: 'Mudou de etapa', ganho: 'Venda concluída',
  perdido: 'Marcado como perdido', reaberto: 'Negociação reaberta', webhook: 'Novo contato pelo site', importacao: 'Importado',
};

/** Linha do tempo: atividades registradas, anotações, follow-ups concluídos e a criação do lead. */
function Historico({ crm, lead, atividades, anotacoes, tarefas }: { crm: Painel; lead: Lead; atividades: Atividade[]; anotacoes: Anotacao[]; tarefas: Tarefa[] }) {
  const quem = (id?: string | null) => (id ? crm.equipe.find((m) => m.id === id)?.nome || crm.equipe.find((m) => m.id === id)?.email : null);
  const itens = [
    ...atividades.map((a) => ({ id: a.id, tipo: a.tipo as keyof typeof ICONE_ATIVIDADE, titulo: ROTULO_ATIVIDADE[a.tipo], texto: a.descricao, quando: a.created_at, por: quem(a.usuario_id) })),
    ...anotacoes.map((n) => ({ id: n.id, tipo: 'anotacao' as const, titulo: 'Anotação', texto: n.texto, quando: n.created_at, por: n.perfis?.nome ?? null })),
    ...tarefas.filter((t) => t.concluida).map((t) => ({ id: t.id, tipo: 'tarefa' as const, titulo: 'Follow-up concluído', texto: t.descricao, quando: t.data_vencimento, por: null })),
    { id: 'criado', tipo: 'criado' as const, titulo: 'Lead criado', texto: lead.origem ? `Origem: ${lead.origem}` : null, quando: lead.created_at, por: null },
  ].sort((a, b) => b.quando.localeCompare(a.quando));

  return (
    <ol className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-[13px] before:w-px before:bg-border">
      {itens.map((i) => {
        const Icone = ICONE_ATIVIDADE[i.tipo] ?? Sparkles;
        return (
          <li key={i.id} className="relative flex gap-3">
            <span className={cn('relative z-10 grid size-7 shrink-0 place-items-center rounded-full bg-background ring-1 ring-border', i.tipo === 'ganho' && 'bg-positive text-positive-foreground ring-0', i.tipo === 'perdido' && 'text-destructive')} aria-hidden>
              <Icone className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13px] font-medium">{i.titulo}</p>
              {i.texto && <p className="text-[13px] whitespace-pre-wrap text-muted-foreground">{i.texto}</p>}
              <p className="mt-0.5 text-xs text-muted-foreground">{formatarDataHora(i.quando)}{i.por ? ` · ${i.por}` : ''}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Aba Privacidade: base legal, não contatar, direitos do titular e quem acessou. */
function Privacidade({ crm, lead, aoAnonimizar }: { crm: Painel; lead: Lead; aoAnonimizar: () => void }) {
  const admin = crm.papel === 'admin';
  const [acessos, setAcessos] = useState<RegistroAcesso[] | null>(null);
  const [anonimizando, setAnonimizando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [ciente, setCiente] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const marca = `${lead.base_legal}|${lead.nao_contatar}|${lead.anonimizado_em}`;

  useEffect(() => {
    if (!admin) return;
    let vivo = true;
    void crm.carregarAcessos({ leadId: lead.id, limite: 20 }).then((r) => { if (vivo) setAcessos(r); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id, admin, marca]);

  const quem = (id?: string | null) => (id ? crm.equipe.find((m) => m.id === id)?.nome || crm.equipe.find((m) => m.id === id)?.email || 'Pessoa removida da equipe' : 'Sistema');
  const anonimizar = async () => {
    setEnviando(true);
    if (await crm.anonimizarLead(lead.id, motivo)) { setAnonimizando(false); setMotivo(''); setCiente(false); aoAnonimizar(); }
    setEnviando(false);
  };

  if (lead.anonimizado_em) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-pill-active/45 p-4 text-[13px] dark:bg-white/5">
          <p className="flex items-center gap-2 font-medium"><ShieldCheck className="size-4 text-positive-foreground" aria-hidden /> Dados pessoais removidos em {formatarDataHora(lead.anonimizado_em)}</p>
          <p className="mt-1 text-muted-foreground">Nome, contatos, CPF/CNPJ e anotações foram apagados. Ficaram só os números do funil (valor, etapa e datas), sem identificar a pessoa.</p>
        </div>
        {admin && <ListaAcessos acessos={acessos} quem={quem} />}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <Label htmlFor="pv-base">Por que podemos guardar e usar este contato</Label>
        <select
          id="pv-base"
          value={lead.base_legal ?? ''}
          onChange={(e) => void crm.salvarPrivacidadeLead(lead.id, { base_legal: (e.target.value || null) as BaseLegal | null })}
          className="h-10 w-full appearance-none rounded-xl border border-input bg-pill-active/55 px-3 text-[13px] dark:bg-white/6"
        >
          <option value="">Não informada</option>
          {BASES_LEGAIS.map((b) => <option key={b.id} value={b.id}>{b.rotulo}</option>)}
        </select>
        <p className="text-xs text-muted-foreground">
          {lead.base_legal ? BASES_LEGAIS.find((b) => b.id === lead.base_legal)?.dica : 'É a base legal da LGPD. Sem ela, fica difícil explicar de onde veio o contato se a pessoa perguntar.'}
          {lead.base_legal === 'consentimento' && lead.consentimento_em && ` Registrado em ${formatarDataHora(lead.consentimento_em)}.`}
        </p>
        <p className="text-xs text-muted-foreground">Origem: <span className="text-foreground">{lead.origem || 'não informada'}</span> · cadastrado em {formatarDataHora(lead.created_at)}</p>
      </section>

      <section className="flex items-start justify-between gap-4 rounded-2xl bg-pill-active/45 p-3.5 dark:bg-white/5">
        <div>
          <p className="text-[13px] font-medium">Não contatar</p>
          <p className="text-xs text-muted-foreground">A pessoa pediu para não receber mais mensagens. O WhatsApp fica bloqueado e o lead sai da tela Hoje.</p>
        </div>
        <Toggle ativo={!!lead.nao_contatar} aoMudar={(v) => void crm.salvarPrivacidadeLead(lead.id, { nao_contatar: v })} rotulo="Não contatar" />
      </section>

      {admin ? (
        <section className="space-y-2">
          <h3 className="text-[13px] font-semibold">Pedidos do titular</h3>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void crm.exportarDadosLead(lead.id)}><Download /> Exportar dados (JSON)</Button>
            {!anonimizando && <Button size="sm" variant="destructive" onClick={() => setAnonimizando(true)}><UserX /> Apagar dados pessoais…</Button>}
          </div>
          {anonimizando && (
            <div className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-3.5">
              <p className="text-[13px]">Apaga nome, WhatsApp, e-mail, CPF/CNPJ, anotações e follow-ups pendentes deste contato. Valor, etapa e datas continuam nos relatórios, sem identificar a pessoa. <strong className="font-semibold">Não dá para desfazer.</strong></p>
              <div className="space-y-1.5">
                <Label htmlFor="pv-motivo">Motivo (fica no registro)</Label>
                <Input id="pv-motivo" value={motivo} maxLength={200} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: pedido por e-mail em 23/11" />
              </div>
              <label className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" checked={ciente} onChange={(e) => setCiente(e.target.checked)} className="size-4 accent-[var(--destructive)]" />
                Entendo que os dados pessoais serão apagados de vez
              </label>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" disabled={!ciente || enviando} onClick={anonimizar}>{enviando ? 'Apagando…' : 'Apagar dados pessoais'}</Button>
                <Button size="sm" variant="ghost" onClick={() => { setAnonimizando(false); setCiente(false); }}>Cancelar</Button>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Antes de apagar, exporte e envie o arquivo à pessoa se ela pediu uma cópia.</p>
        </section>
      ) : (
        <p className="text-xs text-muted-foreground">Pedido de cópia ou exclusão dos dados? Encaminhe para o administrador da conta.</p>
      )}

      {admin && <ListaAcessos acessos={acessos} quem={quem} />}
    </div>
  );
}

function ListaAcessos({ acessos, quem }: { acessos: RegistroAcesso[] | null; quem: (id?: string | null) => string }) {
  return (
    <section>
      <h3 className="mb-2 text-[13px] font-semibold">Quem acessou este contato</h3>
      {acessos === null ? (
        <p className="text-xs text-muted-foreground">Carregando…</p>
      ) : acessos.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum acesso registrado ainda.</p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border text-[13px]">
          {acessos.map((a) => (
            <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-3 px-3 py-2">
              <span><span className="font-medium">{quem(a.usuario_id)}</span> · {ROTULO_ACESSO[a.acao] ?? a.acao}{a.detalhes ? ` · ${a.detalhes}` : ''}</span>
              <span className="text-xs text-muted-foreground">{formatarDataHora(a.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
