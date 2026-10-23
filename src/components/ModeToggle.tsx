import type { Modo } from '../types';

const OPCIONES: { modo: Modo; label: string }[] = [
  { modo: 'consumo', label: 'Por consumo' },
  { modo: 'igual', label: 'A partes iguales' },
];

export function ModeToggle({ modo, onChange }: { modo: Modo; onChange: (m: Modo) => void }) {
  return (
    <div className="segmented" role="group" aria-label="Cómo se reparte">
      {OPCIONES.map(o => (
        <button key={o.modo} type="button" aria-pressed={modo === o.modo} onClick={() => onChange(o.modo)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
