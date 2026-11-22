'use client';

import { usePainel } from './_lib/use-painel';
import { PainelApp } from './_components/painel-app';

export default function PainelPage() {
  return <PainelApp crm={usePainel()} />;
}
