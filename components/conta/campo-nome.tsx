'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** "Seu nome": como a pessoa quer ser chamada na saudação, nas anotações e na equipe. */
export function CampoNome({ inicial, aoSalvar }: { inicial: string; aoSalvar: (nome: string) => Promise<boolean> }) {
  const [nome, setNome] = useState(inicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const limpo = nome.trim().replace(/\s+/g, ' ');
  const mudou = limpo !== inicial.trim();

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (limpo.length < 2) { setErro('Escreva pelo menos 2 letras.'); return; }
    if (limpo.length > 60) { setErro('Use até 60 caracteres.'); return; }
    setErro(null);
    setSalvando(true);
    await aoSalvar(limpo);
    setSalvando(false);
  };

  return (
    <form onSubmit={salvar} className="space-y-2" noValidate>
      <Label htmlFor="campo-nome">Seu nome</Label>
      <div className="flex gap-2">
        <Input
          id="campo-nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoComplete="name"
          maxLength={60}
          aria-invalid={!!erro}
          aria-describedby="campo-nome-ajuda"
        />
        <Button type="submit" disabled={salvando || !mudou}>{salvando ? 'Salvando…' : 'Salvar'}</Button>
      </div>
      <p id="campo-nome-ajuda" className={erro ? 'text-xs font-medium text-destructive' : 'text-xs text-muted-foreground'} role={erro ? 'alert' : undefined}>
        {erro ?? 'Aparece na saudação do topo, nas anotações e na lista da equipe.'}
      </p>
    </form>
  );
}
