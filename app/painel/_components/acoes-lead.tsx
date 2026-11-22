'use client';

import { useState, useSyncExternalStore } from 'react';
import { Menu } from '@base-ui/react/menu';
import { AlarmClock, ArrowRight, CircleSlash, Hourglass, MessageCircle, MoreHorizontal, RotateCcw, Trophy, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Painel } from '../_lib/use-painel';
import type { Lead } from '../_lib/tipos';
import { diasParado, emAberto, grupoTarefa, linkWhatsApp, modelosParaLead, preencherModelo, proximaTarefa } from '../_lib/util';

const POPUP = 'glass-strong z-50 min-w-52 rounded-2xl p-1.5 text-[13px] text-foreground outline-none origin-[var(--transform-origin)] transition-[opacity,transform] duration-150 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0';
const ITEM = 'flex cursor-default items-center gap-2 rounded-xl px-2.5 py-2 outline-none select-none data-[highlighted]:bg-pill-active dark:data-[highlighted]:bg-white/10';
const ROTULO = 'px-2.5 pt-1.5 pb-1 text-[11px] font-medium text-muted-foreground';

/* ---------------- Motivo da perda (um diálogo para o painel todo) ---------------- */

let pedido: Lead | null = null;
const ouvintes = new Set<() => void>();
const definir = (l: Lead | null) => { pedido = l; ouvintes.forEach((f) => f()); };
export const pedirMotivoPerda = (l: Lead) => definir(l);

const MOTIVOS = ['Preço', 'Sem resposta', 'Escolheu concorrente', 'Sem orçamento', 'Não era o momento'];

export function MotivoPerdaHost({ crm }: { crm: Painel }) {
  const lead = useSyncExternalStore((f) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; }, () => pedido, () => null);
  const [motivo, setMotivo] = useState('');
  const [outro, setOutro] = useState('');
  const [ultimo, setUltimo] = useState<string | null>(null);
  if ((lead?.id ?? null) !== ultimo) { setUltimo(lead?.id ?? null); setMotivo(''); setOutro(''); }

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    const texto = motivo === 'Outro' ? outro.trim() || 'Outro' : motivo;
    definir(null);
    await crm.fecharLead(lead.id, 'perdido', texto || undefined);
  };

  return (
    <Dialog open={!!lead} onOpenChange={(v) => !v && definir(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Por que não fechou?</DialogTitle>
          <DialogDescription>{lead?.nome} sai do funil e fica em Lista › Perdidos. O motivo ajuda a ver onde a venda escapa.</DialogDescription>
        </DialogHeader>
        <form onSubmit={confirmar} className="space-y-4">
          <fieldset>
            <legend className="sr-only">Motivo</legend>
            <div className="flex flex-wrap gap-1.5">
              {[...MOTIVOS, 'Outro'].map((m) => (
                <label key={m} className={cn('inline-flex h-9 cursor-pointer items-center rounded-full border px-3.5 text-[13px] font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-foreground', motivo === m ? 'border-transparent bg-foreground text-background' : 'border-glass-border hover:bg-pill-active')}>
                  <input type="radio" name="motivo" value={m} checked={motivo === m} onChange={() => setMotivo(m)} className="sr-only" />
                  {m}
                </label>
              ))}
            </div>
          </fieldset>
          {motivo === 'Outro' && <Input autoFocus value={outro} maxLength={120} onChange={(e) => setOutro(e.target.value)} placeholder="Conte em poucas palavras" aria-label="Outro motivo" />}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => definir(null)}>Cancelar</Button>
            <Button type="submit" variant="destructive">{motivo ? 'Marcar como perdido' : 'Perdido sem motivo'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Menu ⋯ : Mover para · Ganho · Perdido ---------------- */

export function MenuLead({ crm, lead, className }: { crm: Painel; lead: Lead; className?: string }) {
  const situacao = lead.situacao ?? 'aberto';
  const fechado = situacao !== 'aberto';
  return (
    <Menu.Root>
      <Menu.Trigger aria-label={`Ações de ${lead.nome}`} className={cn('grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-pill-active hover:text-foreground data-[popup-open]:bg-pill-active dark:hover:bg-white/10', className)}>
        <MoreHorizontal className="size-4" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="z-50">
          <Menu.Popup className={POPUP}>
            {fechado ? (
              <Menu.Item className={ITEM} onClick={() => void crm.reabrirLead(lead.id)}>
                <RotateCcw className="size-4 text-muted-foreground" aria-hidden /> Reabrir negociação
              </Menu.Item>
            ) : (
              <>
                <Menu.Group>
                  <Menu.GroupLabel className={ROTULO}>Mover para</Menu.GroupLabel>
                  {crm.etapas.filter((e) => e.id !== lead.etapa_id).map((e) => (
                    <Menu.Item key={e.id} className={ITEM} onClick={() => void crm.moverLead(lead.id, e.id)}>
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: e.cor }} aria-hidden />
                      <span className="flex-1 truncate">{e.nome}</span>
                      <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
                    </Menu.Item>
                  ))}
                </Menu.Group>
                <Menu.Separator className="my-1 h-px bg-border" />
                <Menu.Item className={ITEM} onClick={() => void crm.fecharLead(lead.id, 'ganho')}>
                  <Trophy className="size-4 text-positive-foreground" aria-hidden /> Marcar como ganho
                </Menu.Item>
                <Menu.Item className={ITEM} onClick={() => pedirMotivoPerda(lead)}>
                  <XCircle className="size-4 text-destructive" aria-hidden /> Marcar como perdido…
                </Menu.Item>
              </>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/* ---------------- WhatsApp com mensagens prontas ---------------- */

export function BotaoWhatsApp({ crm, lead, variante = 'icone' }: { crm: Painel; lead: Lead; variante?: 'icone' | 'botao' }) {
  if (!lead.telefone) return null;
  const modelos = modelosParaLead(crm.modelos, lead);
  const abrir = (texto?: string, titulo?: string) => {
    window.open(linkWhatsApp(lead.telefone!, texto), '_blank', 'noopener');
    crm.registrarWhatsApp(lead.id, titulo);
  };
  const classeGatilho = variante === 'icone'
    ? 'grid size-7 shrink-0 place-items-center rounded-full text-positive-foreground hover:bg-positive data-[popup-open]:bg-positive'
    : 'inline-flex h-8 items-center gap-1.5 rounded-full border border-glass-border bg-background/40 px-3 text-xs font-medium hover:bg-pill-active data-[popup-open]:bg-pill-active dark:bg-white/6';

  // Sem mensagens prontas: um clique abre a conversa
  if (modelos.length === 0) {
    return (
      <button type="button" onClick={() => abrir()} aria-label={variante === 'icone' ? `WhatsApp de ${lead.nome}` : undefined} className={classeGatilho}>
        <MessageCircle className={variante === 'icone' ? 'size-3.5' : 'size-3.5 text-positive-foreground'} aria-hidden={variante !== 'icone'} />
        {variante === 'botao' && 'WhatsApp'}
      </button>
    );
  }

  const vars = { nome: lead.nome, empresa: crm.empresa?.nome, vendedor: crm.nomeUsuario };
  return (
    <Menu.Root>
      <Menu.Trigger aria-label={variante === 'icone' ? `WhatsApp de ${lead.nome}` : undefined} className={classeGatilho}>
        <MessageCircle className={variante === 'icone' ? 'size-3.5' : 'size-3.5 text-positive-foreground'} aria-hidden={variante !== 'icone'} />
        {variante === 'botao' && 'WhatsApp'}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="z-50">
          <Menu.Popup className={cn(POPUP, 'w-[min(320px,calc(100vw-32px))]')}>
            <Menu.Group>
              <Menu.GroupLabel className={ROTULO}>Mensagem pronta</Menu.GroupLabel>
              {modelos.map((m) => {
                const texto = preencherModelo(m.texto, vars);
                return (
                  <Menu.Item key={m.id} className={cn(ITEM, 'flex-col items-start gap-0.5')} onClick={() => abrir(texto, m.titulo)}>
                    <span className="font-medium">{m.titulo}</span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">{texto}</span>
                  </Menu.Item>
                );
              })}
            </Menu.Group>
            <Menu.Separator className="my-1 h-px bg-border" />
            <Menu.Item className={ITEM} onClick={() => abrir()}>
              <MessageCircle className="size-4 text-muted-foreground" aria-hidden /> Abrir conversa sem texto
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/* ---------------- Sinais do card ---------------- */

/** O que pede atenção neste lead, em ordem de urgência (no máximo dois sinais). */
export function sinaisDoLead(crm: Painel, lead: Lead, agora = new Date()) {
  const sinais: { id: string; texto: string; tom: 'perigo' | 'atencao' | 'neutro'; icone: typeof AlarmClock }[] = [];
  if (!emAberto(lead, crm.etapas)) return sinais;
  const t = proximaTarefa(lead, crm.tarefas);
  if (t) {
    const g = grupoTarefa(t, agora);
    if (g === 'atrasada') sinais.push({ id: 'atrasado', texto: 'Follow-up atrasado', tom: 'perigo', icone: AlarmClock });
    else if (g === 'hoje') sinais.push({ id: 'hoje', texto: 'Follow-up hoje', tom: 'atencao', icone: AlarmClock });
  } else {
    sinais.push({ id: 'sem-passo', texto: 'Sem próximo passo', tom: 'atencao', icone: CircleSlash });
  }
  const dias = diasParado(lead, crm.etapas, agora.getTime());
  if (dias != null) sinais.push({ id: 'parado', texto: `Parado há ${dias} ${dias === 1 ? 'dia' : 'dias'}`, tom: 'neutro', icone: Hourglass });
  return sinais;
}

const TOM = {
  perigo: 'bg-destructive/12 text-destructive',
  atencao: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  neutro: 'bg-foreground/8 text-muted-foreground',
};

export function SinaisLead({ crm, lead, className }: { crm: Painel; lead: Lead; className?: string }) {
  const sinais = sinaisDoLead(crm, lead);
  if (sinais.length === 0) return null;
  return (
    <ul className={cn('flex flex-wrap gap-1', className)} aria-label="Avisos">
      {sinais.map((s) => (
        <li key={s.id} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', TOM[s.tom])}>
          <s.icone className="size-3" aria-hidden /> {s.texto}
        </li>
      ))}
    </ul>
  );
}

export function SeloSituacao({ lead }: { lead: Lead }) {
  const s = lead.situacao ?? 'aberto';
  if (s === 'aberto') return null;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', s === 'ganho' ? 'bg-positive text-positive-foreground' : 'bg-destructive/12 text-destructive')}>
      {s === 'ganho' ? <Trophy className="size-3" aria-hidden /> : <XCircle className="size-3" aria-hidden />}
      {s === 'ganho' ? 'Ganho' : `Perdido${lead.motivo_perda ? ` · ${lead.motivo_perda}` : ''}`}
    </span>
  );
}
