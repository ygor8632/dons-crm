'use client';

import { toast } from 'sonner';
import { CalendarClock, MessageCircle, Phone, Undo2, X } from 'lucide-react';

/** Data relativa às 10h, pulando para segunda se cair no fim de semana. */
export function emDias(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(10, 0, 0, 0);
  if (d.getDay() === 6) d.setDate(d.getDate() + 2);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d;
}

export const SUGESTOES = [
  { id: 'whats', rotulo: 'WhatsApp amanhã', descricao: 'Mandar WhatsApp', dias: 1, icone: MessageCircle },
  { id: 'ligar', rotulo: 'Ligar em 2 dias', descricao: 'Ligar para o lead', dias: 2, icone: Phone },
  { id: 'semana', rotulo: 'Retorno em 1 semana', descricao: 'Retomar contato', dias: 7, icone: CalendarClock },
] as const;

/**
 * Toast com o resultado da ação e, quando o lead fica sem próximo passo,
 * sugestões de um clique. Pode ser ignorado: some sozinho e nunca bloqueia.
 */
export function avisarComProximoPasso({
  titulo,
  sugerir,
  agendar,
  desfazer,
}: {
  titulo: string;
  sugerir: boolean;
  agendar: (descricao: string, quando: Date) => void | Promise<void>;
  desfazer?: () => void;
}) {
  toast.custom(
    (id) => (
      <div className="glass-strong w-[min(380px,calc(100vw-32px))] rounded-2xl p-3.5 text-[13px] text-foreground" role="status">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium">{titulo}</p>
          <div className="flex shrink-0 items-center gap-1">
            {desfazer && (
              <button type="button" onClick={() => { desfazer(); toast.dismiss(id); }} className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs font-medium hover:bg-muted">
                <Undo2 className="size-3.5" aria-hidden /> Desfazer
              </button>
            )}
            <button type="button" onClick={() => toast.dismiss(id)} aria-label="Fechar aviso" className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-muted">
              <X className="size-3.5" />
            </button>
          </div>
        </div>
        {sugerir && (
          <>
            <p className="mt-2 text-xs text-muted-foreground">Sem próximo passo. Agendar agora?</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUGESTOES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={async () => { toast.dismiss(id); await agendar(s.descricao, emDias(s.dias)); }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-glass-border bg-pill-active/70 px-3 text-xs font-medium hover:bg-pill-active dark:bg-white/8 dark:hover:bg-white/14"
                >
                  <s.icone className="size-3.5" aria-hidden /> {s.rotulo}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    ),
    { duration: sugerir ? 9000 : 4500 },
  );
}
