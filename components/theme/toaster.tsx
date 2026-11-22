'use client';

import { Toaster } from 'sonner';
import { useTema } from './theme';

/** Toaster único da aplicação, acompanhando o tema e vestido de vidro. */
export function AppToaster() {
  const { escuro } = useTema();
  return (
    <Toaster
      theme={escuro ? 'dark' : 'light'}
      position="top-center"
      offset={84}
      richColors
      toastOptions={{
        style: {
          borderRadius: '18px',
          fontFamily: 'var(--font-sans)',
        },
      }}
    />
  );
}
