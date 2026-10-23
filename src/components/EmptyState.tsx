import * as m from 'motion/react-m';
import type { Icon } from '@phosphor-icons/react';
import { springSoft } from '../motion';

export function EmptyState(props: { icon: Icon; titulo: string; texto: string; accion?: { label: string; onClick: () => void } }) {
  const { icon: IconCmp, titulo, texto, accion } = props;
  return (
    <m.div
      className="grid justify-items-start gap-2.5 px-1 py-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
    >
      <m.span
        className="grid size-14 place-items-center rounded-box bg-accent-soft text-accent"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
      >
        <IconCmp size={28} />
      </m.span>
      <h2 className="mt-1 text-lg font-semibold">{titulo}</h2>
      <p className="max-w-[34ch] text-muted">{texto}</p>
      {accion && (
        <button type="button" className="btn btn-primary" onClick={accion.onClick}>
          {accion.label}
        </button>
      )}
    </m.div>
  );
}
