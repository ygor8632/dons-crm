'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { corTextoSobre } from '@/lib/marca';

const CORES = [
  { nome: 'Coral', cor: '#da4c3c' },
  { nome: 'Azul', cor: '#3d5fd9' },
  { nome: 'Verde', cor: '#13775b' },
  { nome: 'Âmbar', cor: '#b7791f' },
  { nome: 'Grafite', cor: '#1b1716' },
];

/** Troca a cor da marca e recolore a prévia na hora, como acontece no painel do cliente. */
export function SeletorMarca() {
  const [cor, setCor] = useState(CORES[0].cor);
  return (
    <div className="glass-card flex h-full flex-col p-5 sm:p-6" style={{ ['--brand' as string]: cor, ['--brand-foreground' as string]: corTextoSobre(cor) }}>
      <div role="radiogroup" aria-label="Cor da marca na prévia" className="flex flex-wrap gap-2">
        {CORES.map((c) => (
          <button
            key={c.cor}
            type="button"
            role="radio"
            aria-checked={cor === c.cor}
            aria-label={c.nome}
            onClick={() => setCor(c.cor)}
            className={cn('grid size-11 place-items-center rounded-full shadow-[inset_0_0_0_2px_rgb(255_255_255/0.5)] transition-transform duration-150 ease-(--ease-out) hover:scale-105 active:scale-95', cor === c.cor && 'scale-110')}
            style={{ backgroundColor: c.cor }}
          >
            {cor === c.cor && <Check className="size-4" style={{ color: corTextoSobre(c.cor) }} aria-hidden />}
          </button>
        ))}
      </div>
      <div className="mt-6 flex flex-1 flex-col justify-end gap-4" aria-hidden>
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-brand text-sm font-bold text-brand-foreground transition-colors duration-300">SF</span>
          <div>
            <p className="text-[13px] font-semibold">Studio Fit</p>
            <p className="text-xs text-ink-2">Seu logo e sua cor no topo do painel</p>
          </div>
        </div>
        <div className="flex h-24 items-end gap-2">
          {[42, 66, 54, 80, 62, 95].map((h, i) => (
            <span key={i} className={cn('flex-1 rounded-lg transition-colors duration-300', i === 5 ? 'hatch text-brand' : 'bg-foreground/80')} style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="h-2 rounded-full bg-chart-muted"><div className="h-full w-3/5 rounded-full bg-brand transition-colors duration-300" /></div>
      </div>
    </div>
  );
}
