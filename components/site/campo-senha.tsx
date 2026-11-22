'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';

/** Campo de senha com botão para mostrar/ocultar. */
export function CampoSenha(props: Omit<React.ComponentProps<typeof Input>, 'type'>) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visivel ? 'text' : 'password'} className="h-11 pr-12" />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visivel}
        className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {visivel ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
