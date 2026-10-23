import { useEffect, useRef, useState } from 'react';
import type { Persona } from '../types';

type Valor = { cantidad: number; personas: string[] };
type Props = {
  open: boolean;
  titulo: string;
  personas: Persona[];
  inicial: Valor;
  error?: string | null; // el aviso general queda tapado por el modal
  onAccept: (v: Valor) => void;
  onClose: () => void;
};

export function LineDialog({ open, ...rest }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dlg = ref.current;
    if (open && !dlg?.open) dlg?.showModal();
    if (!open && dlg?.open) dlg.close();
  }, [open]);

  return (
    <dialog ref={ref} onClose={rest.onClose} aria-labelledby="line-title">
      {/* montado solo al abrir: el formulario arranca siempre desde `inicial` */}
      {open && <LineForm {...rest} />}
    </dialog>
  );
}

function LineForm({ titulo, personas, inicial, error, onAccept, onClose }: Omit<Props, 'open'>) {
  const [cantidad, setCantidad] = useState(inicial.cantidad);
  const [marcadas, setMarcadas] = useState(inicial.personas);

  const todas = marcadas.length === personas.length;
  // mantener el orden de la mesa, no el orden en que se marcaron
  const toggle = (id: string) =>
    setMarcadas(m => personas.map(p => p.id).filter(x => (x === id ? !m.includes(id) : m.includes(x))));

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onAccept({ cantidad, personas: marcadas });
      }}
    >
      <h2 id="line-title">{titulo}</h2>

      <div className="row stepper">
        <button type="button" aria-label="Menos" onClick={() => setCantidad(c => Math.max(1, c - 1))}>
          −
        </button>
        <output aria-label="Cantidad">{cantidad}</output>
        <button type="button" aria-label="Más" onClick={() => setCantidad(c => c + 1)}>
          +
        </button>
      </div>

      <fieldset>
        <legend>¿Quién lo comparte?</legend>
        <button type="button" onClick={() => setMarcadas(todas ? [] : personas.map(p => p.id))}>
          {todas ? 'Ninguno' : 'Todos'}
        </button>
        {personas.map(p => (
          <label key={p.id} className="check">
            <input type="checkbox" checked={marcadas.includes(p.id)} onChange={() => toggle(p.id)} />
            {p.nombre}
          </label>
        ))}
      </fieldset>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="row actions">
        <button type="button" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit">Aceptar</button>
      </div>
    </form>
  );
}
