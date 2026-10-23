import { useEffect, useRef, type ReactNode } from 'react';

/** `<dialog>` nativo controlado por `open`; los hijos solo se montan mientras está abierto. */
export function Modal({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dlg = ref.current;
    if (open && !dlg?.open) dlg?.showModal();
    if (!open && dlg?.open) dlg.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      // solo Esc avisa al padre; el cierre desde código no debe disparar onClose (pisaría el siguiente estado)
      onCancel={e => {
        e.preventDefault();
        onClose();
      }}
    >
      {open && children}
    </dialog>
  );
}
