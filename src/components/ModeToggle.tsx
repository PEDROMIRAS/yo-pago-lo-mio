import { useId } from 'react';
import * as m from 'motion/react-m';
import type { Modo } from '../types';

const OPCIONES: { modo: Modo; label: string }[] = [
  { modo: 'consumo', label: 'Por consumo' },
  { modo: 'igual', label: 'A partes iguales' },
];

export function ModeToggle({ modo, onChange }: { modo: Modo; onChange: (m: Modo) => void }) {
  const id = useId();
  return (
    <div className="grid grid-cols-2 gap-1 rounded-box border border-control p-1" role="group" aria-label="Cómo se reparte">
      {OPCIONES.map(o => {
        const activo = modo === o.modo;
        return (
          <button
            key={o.modo}
            type="button"
            aria-pressed={activo}
            onClick={() => onChange(o.modo)}
            className={`relative min-h-10 rounded-control transition-colors duration-200 ${activo ? 'font-semibold text-accent-fg' : ''}`}
          >
            {/* la pastilla viaja de una opción a la otra: el cambio de modo se ve */}
            {activo && <m.span layoutId={`modo-${id}`} className="absolute inset-0 rounded-control bg-accent" />}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
