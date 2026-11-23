'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CampoNome } from './campo-nome';

const CHAVE = 'dons-pedir-nome-adiado';

/**
 * Quem entra sem nome cadastrado é convidado a dizer como quer ser chamado.
 * "Agora não" adia até a próxima sessão do navegador; o campo continua em Meu perfil.
 */
export function PedirNome({ semNome, aoSalvar }: { semNome: boolean; aoSalvar: (nome: string) => Promise<boolean> }) {
  const [aberto, setAberto] = useState(false);

  // Decide depois de montar: sessionStorage só existe no navegador
  useEffect(() => {
    let adiado = false;
    try { adiado = sessionStorage.getItem(CHAVE) === '1'; } catch { /* sem armazenamento: pergunta */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAberto(semNome && !adiado);
  }, [semNome]);

  const adiar = () => {
    try { sessionStorage.setItem(CHAVE, '1'); } catch { /* ignora */ }
    setAberto(false);
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => { if (!v) adiar(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Como você quer ser chamado?</DialogTitle>
          <DialogDescription>Seu nome aparece na saudação, nas anotações e na lista da equipe. Dá para mudar depois em Meu perfil.</DialogDescription>
        </DialogHeader>
        <CampoNome inicial="" aoSalvar={async (n) => { const ok = await aoSalvar(n); if (ok) setAberto(false); return ok; }} />
        <Button variant="ghost" className="self-start" onClick={adiar}>Agora não</Button>
      </DialogContent>
    </Dialog>
  );
}
