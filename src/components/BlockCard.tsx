import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { Plus, X } from '@phosphor-icons/react';
import type { Linea, Persona } from '../types';
import type { Act } from '../useDinner';
import type { Block } from '../lib/calc';
import { addPersonToLines, removeLine } from '../lib/dinner';
import { formatEuros } from '../lib/money';
import { exitFast, itemExit } from '../motion';
import { Euros } from './Euros';

const fila = 'flex items-center gap-2';

/** Lo que comparte un grupo de personas: sus líneas, editar/borrar y añadir gente o platos. */
export function BlockCard(props: {
  block: Block;
  personas: Persona[];
  act: Act;
  onEdit: (l: Linea) => void;
  onAddProduct: (personas: string[]) => void;
}) {
  const { block: b, personas, act, onEdit, onAddProduct } = props;
  const nombre = (id: string) => personas.find(p => p.id === id)?.nombre ?? '?';
  const partes = Object.values(b.cuotas);
  const min = Math.min(...partes);
  const max = Math.max(...partes);
  const fuera = personas.filter(p => !b.personas.includes(p.id));

  return (
    <m.article
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97, transition: exitFast }}
      className="mb-3 rounded-box border border-line bg-surface px-4 pt-3.5 pb-3"
    >
      <div className={fila}>
        <h3 className="flex-1 font-semibold">{b.personas.map(nombre).join(' + ')}</h3>
        <Euros cents={b.total} className="font-semibold" />
      </div>
      {b.personas.length > 1 && (
        <p className="mt-0.5 text-small text-muted">
          {min === max ? formatEuros(min) : `${formatEuros(min).replace(/\s*€/, '')}-${formatEuros(max)}`} cada uno
        </p>
      )}
      <ul className="mt-2">
        <AnimatePresence initial={false}>
          {b.lineas.map(l => (
            <m.li key={l.id} layout="position" exit={itemExit} className={`${fila} min-h-13 border-b border-line py-1.5 last:border-b-0`}>
              <span className="flex-1">
                {l.cantidad} × {l.producto} · {formatEuros(l.precio * l.cantidad)}
              </span>
              <button type="button" className="btn" onClick={() => onEdit(l)}>
                Editar
              </button>
              <button
                type="button"
                className="btn btn-icon"
                aria-label={`Borrar ${l.producto}`}
                onClick={() => act(d => removeLine(d, l.id))}
              >
                <X size={18} />
              </button>
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
      <div className="mt-2 flex flex-wrap gap-2">
        {fuera.length > 0 && (
          <select
            className="min-w-35 flex-1"
            aria-label="Añadir persona a lo compartido"
            value=""
            onChange={e => act(d => addPersonToLines(d, b.lineas.map(l => l.id), e.target.value))}
          >
            <option value="">Añadir a…</option>
            {fuera.map(p => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        )}
        <button type="button" className="btn min-w-35 flex-1" onClick={() => onAddProduct(b.personas)}>
          <Plus size={18} />
          Producto
        </button>
      </div>
    </m.article>
  );
}
