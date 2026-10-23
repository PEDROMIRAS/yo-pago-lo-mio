import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, useDragControls } from 'motion/react';
import * as m from 'motion/react-m';
import { exitFast, springSoft } from '../motion';

/**
 * Hoja inferior sobre un `<dialog>` nativo (foco atrapado, Esc, inerte el resto).
 * El dialog se abre al instante y se cierra cuando termina la animación de salida.
 */
export function Modal({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const drag = useDragControls();

  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={label}
      // solo Esc avisa al padre; el cierre real lo hace onExitComplete
      onCancel={e => {
        e.preventDefault();
        onClose();
      }}
    >
      <AnimatePresence onExitComplete={() => ref.current?.close()}>
        {open && (
          <div key="sheet" className="fixed inset-0 flex items-end justify-center">
            <m.div
              className="absolute inset-0 bg-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.2 } }}
              exit={{ opacity: 0, transition: exitFast }}
              onClick={onClose}
            />
            <m.div
              className="relative max-h-[88dvh] w-full max-w-120 overflow-y-auto rounded-t-box border border-b-0 border-line bg-surface px-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-soft"
              initial={{ y: '100%' }}
              animate={{ y: 0, transition: springSoft }}
              exit={{ y: '100%', transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
              drag="y"
              dragListener={false}
              dragControls={drag}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.7 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 || info.velocity.y > 600) onClose();
              }}
            >
              {/* asa: arrastrar hacia abajo cierra; la lista de dentro sigue haciendo scroll */}
              <div
                className="sticky top-0 z-10 -mx-4 flex cursor-grab touch-none justify-center bg-surface pt-2.5 pb-2"
                onPointerDown={e => drag.start(e)}
                aria-hidden="true"
              >
                <span className="h-1.5 w-10 rounded-full bg-control/60" />
              </div>
              {children}
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </dialog>
  );
}
