"use client";

// Base: microkit "hold-to-delete-button". Adaptado ao Dons CRM: recebe a ação,
// textos em português, cores do sistema (destructive) e tamanho compacto.

import { Check, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { cn } from "@/lib/utils";

type DeleteState = "idle" | "holding" | "deleted";

const HOLD_MS = 1200;
const RESET_MS = 1600;

function ButtonContent({ deleted, rotulo, rotuloFeito }: { deleted: boolean; rotulo: string; rotuloFeito: string }) {
  const trans =
    "[transition:opacity_.24s_ease,transform_.32s_cubic-bezier(.16,1,.3,1),filter_.24s_ease,visibility_.24s] motion-reduce:transition-none";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="grid shrink-0" aria-hidden="true">
        <Trash2 className={cn("[grid-area:1/1] size-3.5", trans, "data-[active=false]:scale-50 data-[active=false]:opacity-0")} data-active={!deleted} />
        <Check className={cn("[grid-area:1/1] size-3.5", trans, "data-[active=false]:scale-50 data-[active=false]:opacity-0")} data-active={deleted} strokeWidth={2.6} />
      </span>
      <span className="grid">
        <span className={cn("justify-self-start whitespace-nowrap [grid-area:1/1]", trans, "data-[active=false]:invisible data-[active=false]:translate-y-1.5 data-[active=false]:opacity-0 data-[active=false]:blur-[2px]")} data-active={!deleted}>
          {rotulo}
        </span>
        <span className={cn("justify-self-start whitespace-nowrap [grid-area:1/1]", trans, "data-[active=false]:invisible data-[active=false]:translate-y-1.5 data-[active=false]:opacity-0 data-[active=false]:blur-[2px]")} data-active={deleted}>
          {rotuloFeito}
        </span>
      </span>
    </span>
  );
}

export function HoldToDeleteButton({
  aoConfirmar,
  rotulo = "Segure para excluir",
  rotuloFeito = "Excluído",
  descricao,
  className,
}: {
  aoConfirmar: () => void | Promise<void>;
  rotulo?: string;
  rotuloFeito?: string;
  /** Complemento para leitores de tela, ex.: "etapa Proposta" (o nome começa pelo texto visível) */
  descricao?: string;
  className?: string;
}) {
  const [state, setState] = useState<DeleteState>("idle");
  const acao = useRef(aoConfirmar);
  useEffect(() => { acao.current = aoConfirmar; }, [aoConfirmar]);

  useEffect(() => {
    if (state === "idle") return;
    const timeout = window.setTimeout(() => {
      if (state === "holding") {
        setState("deleted");
        void acao.current();
      } else setState("idle");
    }, state === "holding" ? HOLD_MS : RESET_MS);
    return () => window.clearTimeout(timeout);
  }, [state]);

  const start = () => setState((c) => (c === "idle" ? "holding" : c));
  const cancel = () => setState((c) => (c === "holding" ? "idle" : c));

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button === 0) start();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    if (!event.repeat) start();
  };
  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === " " || event.key === "Enter") cancel();
  };

  return (
    <button
      type="button"
      className={cn(
        "group relative inline-flex h-8 shrink-0 cursor-pointer touch-manipulation items-center justify-center overflow-hidden rounded-full bg-destructive/10 px-3 text-xs font-medium text-destructive select-none [-webkit-touch-callout:none]",
        "[transition:transform_.25s_cubic-bezier(.16,1,.3,1),background-color_.2s_ease] hover:data-[state=idle]:bg-destructive/16 motion-safe:data-[state=holding]:scale-[.97] data-[state=deleted]:cursor-default",
        className,
      )}
      data-state={state}
      onPointerDown={handlePointerDown}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={cancel}
      onContextMenu={(event) => event.preventDefault()}
    >
      <ButtonContent deleted={state === "deleted"} rotulo={rotulo} rotuloFeito={rotuloFeito} />
      {descricao && <span className="sr-only">: {descricao}. Segure para confirmar</span>}
      <span
        className="pointer-events-none absolute inset-0 flex items-center justify-center bg-destructive text-white [clip-path:inset(0_100%_0_0)] [transition:clip-path_.4s_cubic-bezier(.16,1,.3,1)] group-data-[state=holding]:[clip-path:inset(0)] group-data-[state=holding]:[transition:clip-path_1.2s_linear] group-data-[state=deleted]:[clip-path:inset(0)] dark:text-[#1b1716]"
        aria-hidden="true"
      >
        <ButtonContent deleted={state === "deleted"} rotulo={rotulo} rotuloFeito={rotuloFeito} />
      </span>
    </button>
  );
}
