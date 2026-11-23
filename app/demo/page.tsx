'use client';

import Link from 'next/link';
import { CONTATO_URL } from '@/lib/contato';
import { FlaskConical } from 'lucide-react';
import { Segmented } from '@/components/glass';
import { PainelApp } from '../painel/_components/painel-app';
import { useDemoPainel } from './use-demo';
import type { Papel } from '../painel/_lib/tipos';

/** Demonstração pública: o painel real com dados fictícios em memória. */
export default function DemoPage() {
  const { crm, papel, setPapel } = useDemoPainel();

  const aviso = (
    <div className="glass-card flex flex-col gap-3 rounded-2xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2.5 text-[13px]">
        <FlaskConical className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
        <span>
          <b className="font-semibold">Demonstração com dados fictícios.</b>{' '}
          <span className="text-muted-foreground">Mexa à vontade: nada é gravado e recarregar a página recomeça do zero.</span>
        </span>
      </p>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Segmented<Papel>
          rotulo="Ver o painel como"
          valor={papel}
          aoMudar={setPapel}
          opcoes={[{ id: 'admin', label: 'Administrador' }, { id: 'vendedor', label: 'Vendedor' }]}
        />
        <a href={CONTATO_URL} target="_blank" rel="noopener" className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/85">Falar com um consultor</a>
        <Link href="/" className="rounded-full px-3 py-1.5 text-xs font-medium underline-offset-4 hover:underline">Voltar ao site</Link>
      </div>
    </div>
  );

  return <PainelApp crm={crm} aviso={aviso} />;
}
