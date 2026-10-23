import { Warning } from '@phosphor-icons/react';
import { Modal } from './Modal';

/** Sustituye a confirm(): misma hoja que el resto de la app. Cancelar va primero y recibe el foco. */
export function ConfirmDialog(props: {
  open: boolean;
  titulo: string;
  texto: string;
  confirmar: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { open, titulo, texto, confirmar, onConfirm, onCancel } = props;
  return (
    <Modal open={open} onClose={onCancel} label={titulo}>
      <div className="grid gap-3 pb-1">
        <span className="grid size-11 place-items-center rounded-control bg-error/12 text-error">
          <Warning size={24} />
        </span>
        <h2 className="text-lg font-semibold">{titulo}</h2>
        <p className="text-muted">{texto}</p>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <button type="button" className="btn" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="btn border-error bg-error font-semibold text-accent-fg" onClick={onConfirm}>
            {confirmar}
          </button>
        </div>
      </div>
    </Modal>
  );
}
