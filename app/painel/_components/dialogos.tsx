'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, MessageCircle, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Segmented } from '@/components/glass';
import { formatarMoeda } from '@/lib/marca';
import { cn } from '@/lib/utils';
import type { Painel } from '../_lib/use-painel';
import type { Anotacao, Lead, Tarefa } from '../_lib/tipos';
import { abrirWhatsApp, formatarDataHora, grupoTarefa } from '../_lib/util';

type Aberto = { aberto: boolean; aoMudar: (v: boolean) => void };

const VAZIO = { nome: '', email: '', telefone: '', origem: 'Adicionado manualmente', vendedor_id: '', valor: '' };

export function NovoLeadDialog({ crm, aberto, aoMudar }: { crm: Painel } & Aberto) {
  const [dados, setDados] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const campo = (k: keyof typeof VAZIO) => ({ value: dados[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDados({ ...dados, [k]: e.target.value }) });

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    if (await crm.criarLead(dados)) { setDados(VAZIO); aoMudar(false); }
    setSalvando(false);
  };

  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo lead</DialogTitle>
          <DialogDescription>Entra na primeira etapa do funil{crm.etapas[0] ? ` (${crm.etapas[0].nome})` : ''}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="nl-nome">Nome *</Label><Input id="nl-nome" required autoFocus {...campo('nome')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label htmlFor="nl-tel">Telefone</Label><Input id="nl-tel" inputMode="tel" {...campo('telefone')} /></div>
            <div className="space-y-2"><Label htmlFor="nl-email">E-mail</Label><Input id="nl-email" type="email" {...campo('email')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label htmlFor="nl-origem">Origem</Label><Input id="nl-origem" {...campo('origem')} /></div>
            <div className="space-y-2"><Label htmlFor="nl-valor">Valor (R$)</Label><Input id="nl-valor" type="number" step="0.01" min="0" inputMode="decimal" {...campo('valor')} /></div>
          </div>
          {crm.papel === 'admin' && crm.equipe.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="nl-resp">Responsável</Label>
              <select id="nl-resp" {...campo('vendedor_id')} className="h-10 w-full appearance-none rounded-xl border border-input bg-pill-active/55 px-3 text-[13px] outline-none focus-visible:ring-3 focus-visible:ring-ring/20 dark:bg-white/6">
                <option value="">Sem responsável</option>
                {crm.equipe.map((m) => <option key={m.id} value={m.id}>{m.nome || m.email}</option>)}
              </select>
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
          <div className="space-y-2"><Label htmlFor="cv-email">E-mail</Label><Input id="cv-email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} /></div>
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
export function FichaLeadDialog({ crm, lead, aoFechar }: { crm: Painel; lead: Lead | null; aoFechar: () => void }) {
  const [aba, setAba] = useState<'anotacoes' | 'tarefas'>('anotacoes');
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [texto, setTexto] = useState('');
  const [desc, setDesc] = useState('');
  const [data, setData] = useState('');
  const [apagando, setApagando] = useState<string | null>(null);
  const [leadAnterior, setLeadAnterior] = useState<string | null>(null);

  // Trocou de lead: zera a ficha no próprio render (padrão recomendado pelo React)
  if ((lead?.id ?? null) !== leadAnterior) {
    setLeadAnterior(lead?.id ?? null);
    setAba('anotacoes'); setTexto(''); setDesc(''); setData(''); setAnotacoes([]); setTarefas([]);
  }

  // Lead "vivo" (etapa atualizada pelo Kanban/lista)
  const atual = lead ? crm.leads.find((l) => l.id === lead.id) ?? lead : null;

  const recarregar = useCallback(async () => {
    if (!lead) return;
    const r = await crm.carregarFicha(lead.id);
    setAnotacoes(r.anotacoes);
    setTarefas(r.tarefas);
  }, [lead, crm]);

  useEffect(() => {
    // Busca da ficha: os setState acontecem depois do await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (lead) void recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id]);

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
                  {[atual.telefone, atual.email].filter(Boolean).join(' · ') || 'Sem contato'}
                  {(atual.valor ?? 0) > 0 && <> · <span className="tabular font-semibold text-foreground">{formatarMoeda(atual.valor || 0)}</span></>}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <label className="relative inline-flex items-center">
                  <span className="sr-only">Etapa</span>
                  <span className="pointer-events-none absolute left-3 size-2 rounded-full" style={{ backgroundColor: crm.etapas.find((e) => e.id === atual.etapa_id)?.cor }} aria-hidden />
                  <select
                    value={atual.etapa_id ?? ''}
                    onChange={(e) => void crm.moverLead(atual.id, e.target.value)}
                    className="h-8 appearance-none rounded-full border border-glass-border bg-pill-active/60 pr-3 pl-7 text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/25 dark:bg-white/8"
                  >
                    {crm.etapas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </label>
                {atual.telefone && (
                  <Button size="sm" variant="outline" onClick={() => abrirWhatsApp(atual.telefone)}><MessageCircle /> WhatsApp</Button>
                )}
                <Segmented
                  className="ml-auto"
                  rotulo="Seções da ficha"
                  valor={aba}
                  aoMudar={setAba}
                  opcoes={[{ id: 'anotacoes', label: 'Anotações' }, { id: 'tarefas', label: 'Follow-ups' }]}
                />
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              {aba === 'anotacoes' ? (
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
                            className={cn('grid size-5 shrink-0 place-items-center rounded-full border-2', t.concluida ? 'border-brand bg-brand text-brand-foreground' : 'border-foreground/30 hover:border-brand')}
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
