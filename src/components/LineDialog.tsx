import { useState, type ReactNode } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { Minus, Plus } from '@phosphor-icons/react';
import type { MenuItem, Persona } from '../types';
import { formatEuros } from '../lib/money';
import { Modal } from './Modal';

type Valor = { cantidad: number; personas: string[]; otraMitad?: string };
type Props = {
  open: boolean;
  titulo: string;
  descripcion?: string; // ingredientes del plato, bajo el título
  // si el plato admite mitad y mitad: su precio y las otras pizzas con las que se puede combinar
  mitades?: { precio: number; opciones: MenuItem[] };
  personas: Persona[];
  inicial: Valor;
  error?: string | null; // el aviso general queda tapado por el modal
  onAccept: (v: Valor) => void;
  onClose: () => void;
  children?: ReactNode; // debajo del formulario, en la misma hoja
};

export function LineDialog({ open, children, ...rest }: Props) {
  return (
    <Modal open={open} onClose={rest.onClose} label={rest.titulo}>
      {/* montado solo al abrir: el formulario arranca siempre desde `inicial` */}
      <LineForm {...rest} />
      {children}
    </Modal>
  );
}

function LineForm(props: Omit<Props, 'open' | 'children'>) {
  const { titulo, descripcion, mitades, personas, inicial, error, onAccept, onClose } = props;
  const [cantidad, setCantidad] = useState(inicial.cantidad);
  const [sube, setSube] = useState(true);
  const [marcadas, setMarcadas] = useState(inicial.personas);
  const [otraMitad, setOtraMitad] = useState('');
  const otra = mitades?.opciones.find(o => o.nombre === otraMitad);

  const todas = marcadas.length === personas.length;
  // mantener el orden de la mesa, no el orden en que se marcaron
  const toggle = (id: string) =>
    setMarcadas(prev => personas.map(p => p.id).filter(x => (x === id ? !prev.includes(id) : prev.includes(x))));
  const cambiar = (d: number) => {
    setSube(d > 0);
    setCantidad(c => Math.max(1, c + d));
  };

  return (
    <form
      className="pb-1"
      onSubmit={e => {
        e.preventDefault();
        onAccept({ cantidad, personas: marcadas, ...(otraMitad ? { otraMitad } : {}) });
      }}
    >
      <h2 className={`text-lg font-semibold ${descripcion ? '' : 'mb-3'}`}>{titulo}</h2>
      {descripcion && <p className="mt-0.5 mb-3 text-small text-muted">{descripcion}</p>}

      {mitades && (
        <div className="mb-4 grid gap-1.5">
          <label htmlFor="otra-mitad" className="font-semibold">
            ¿Mitad y mitad?
          </label>
          <select id="otra-mitad" value={otraMitad} onChange={e => setOtraMitad(e.target.value)}>
            <option value="">No, pizza entera</option>
            {mitades.opciones.map(o => (
              <option key={o.nombre} value={o.nombre}>
                Otra mitad: {o.nombre} · {formatEuros(o.precio)}
              </option>
            ))}
          </select>
          {otra && (
            <p className="text-small text-muted">
              Se cobra la más cara: {formatEuros(Math.max(mitades.precio, otra.precio))} por pizza.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-center gap-4">
        <button type="button" className="btn size-12 rounded-full px-0" aria-label="Menos" onClick={() => cambiar(-1)}>
          <Minus />
        </button>
        <output aria-label="Cantidad" className="relative grid h-10 min-w-[3ch] place-items-center overflow-hidden text-2xl font-semibold">
          {/* el número entra desde la dirección del cambio */}
          <AnimatePresence initial={false} mode="popLayout" custom={sube}>
            <m.span
              key={cantidad}
              custom={sube}
              variants={{ from: (s: boolean) => ({ y: s ? 18 : -18, opacity: 0 }), to: (s: boolean) => ({ y: s ? -18 : 18, opacity: 0 }) }}
              initial="from"
              animate={{ y: 0, opacity: 1 }}
              exit="to"
            >
              {cantidad}
            </m.span>
          </AnimatePresence>
        </output>
        <button type="button" className="btn size-12 rounded-full px-0" aria-label="Más" onClick={() => cambiar(1)}>
          <Plus />
        </button>
      </div>

      <fieldset className="my-4 grid gap-0.5 rounded-box border border-line px-3 py-2">
        <legend className="px-1 font-semibold">¿Quién lo comparte?</legend>
        <button type="button" className="btn" onClick={() => setMarcadas(todas ? [] : personas.map(p => p.id))}>
          {todas ? 'Ninguno' : 'Todos'}
        </button>
        {personas.map(p => (
          <label key={p.id} className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              className="size-5.5 accent-accent"
              checked={marcadas.includes(p.id)}
              onChange={() => toggle(p.id)}
            />
            {p.nombre}
          </label>
        ))}
      </fieldset>

      <AnimatePresence>
        {error && (
          <m.p
            role="alert"
            className="mb-3 text-error"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: [6, -4, 2, 0] }}
            exit={{ opacity: 0 }}
          >
            {error}
          </m.p>
        )}
      </AnimatePresence>

      <div className="flex justify-end gap-2">
        <button type="button" className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary">
          Aceptar
        </button>
      </div>
    </form>
  );
}
