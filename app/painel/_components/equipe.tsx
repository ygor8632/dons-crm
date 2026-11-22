'use client';

import { UserPlus, Users } from 'lucide-react';
import { EmptyState, GlassCard, PageHeader, iniciais } from '@/components/glass';
import { Button } from '@/components/ui/button';
import { HoldToDeleteButton } from '@/components/microkit/hold-to-delete-button';
import type { Painel } from '../_lib/use-painel';
import type { Papel } from '../_lib/tipos';

export function Equipe({ crm, convidar }: { crm: Painel; convidar: () => void }) {
  const admin = crm.papel === 'admin';
  const contagem = (id: string) => crm.leads.filter((l) => l.vendedor_id === id).length;

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Equipe"
        subtitulo={`${crm.equipe.length} ${crm.equipe.length === 1 ? 'pessoa' : 'pessoas'} com acesso a ${crm.empresa?.nome ?? 'este CRM'}`}
        acoes={admin ? <Button onClick={convidar}><UserPlus /> Convidar vendedor</Button> : undefined}
      />
      <GlassCard className="p-2 sm:p-3">
        {crm.equipe.length === 0 ? (
          <EmptyState icone={Users} titulo="Ninguém por aqui ainda" texto="Convide vendedores para distribuir os leads." />
        ) : (
          <ul className="divide-y divide-border/60">
            {crm.equipe.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-pill-active/80 text-xs font-bold dark:bg-white/10" aria-hidden>
                  {iniciais(m.nome || m.email)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">
                    {m.nome || m.email}
                    {m.id === crm.userId && <span className="ml-2 text-xs font-normal text-muted-foreground">(você)</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.email} · {contagem(m.id)} leads</p>
                </div>
                {admin && m.id !== crm.userId ? (
                  <div className="flex items-center gap-2">
                    <label className="sr-only" htmlFor={`papel-${m.id}`}>Cargo de {m.nome || m.email}</label>
                    <select
                      id={`papel-${m.id}`}
                      value={m.role === 'admin' ? 'admin' : 'vendedor'}
                      onChange={(e) => void crm.mudarPapel(m.id, e.target.value as Papel)}
                      className="h-8 appearance-none rounded-full border border-glass-border bg-pill-active/60 px-3 text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/25 dark:bg-white/8"
                    >
                      <option value="vendedor">Vendedor</option>
                      <option value="admin">Administrador</option>
                    </select>
                    <HoldToDeleteButton rotulo="Remover" rotuloFeito="Removido" descricao={`Remover acesso de ${m.email}`} aoConfirmar={() => crm.removerMembro(m)} />
                  </div>
                ) : (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{m.role === 'admin' ? 'Administrador' : 'Vendedor'}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
