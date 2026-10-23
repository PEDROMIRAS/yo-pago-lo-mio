import type { ReactNode } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { exitFast } from '../motion';

/**
 * Aviso inferior, sobre la barra de pestañas. `id` null lo oculta; un id nuevo lo hace entrar otra vez
 * aunque el texto se repita. La región viva está siempre montada para que el lector de pantalla lo anuncie.
 */
export function Snackbar({ id, children }: { id: number | null; children: ReactNode }) {
  return (
    <div role="status" className="pointer-events-none fixed inset-x-4 bottom-[calc(64px+14px+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md">
      <AnimatePresence mode="popLayout">
        {id !== null && (
          <m.div
            key={id}
            className="pointer-events-auto flex min-h-12 items-center gap-2 rounded-box bg-fg py-2 pr-2 pl-4 text-bg shadow-soft"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, transition: exitFast }}
          >
            {children}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
