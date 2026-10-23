import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { ArrowCounterClockwise, Minus, Plus, X } from '@phosphor-icons/react';
import type { Dinner } from '../types';
import type { Act, Deshacer } from '../useDinner';
import { nombreDe, removeLine, updateLine } from '../lib/dinner';
import { formatEuros } from '../lib/money';
import { exitFast, itemExit } from '../motion';

/** Los pedidos que ya hay de un plato, para verlos y cambiarlos mientras se pide otro. */
export function PlatoPedidos(props: { dinner: Dinner; producto: string; act: Act; deshacer: Deshacer | null; undo: () => void }) {
  const { dinner, producto, act, deshacer, undo } = props;
  const lineas = dinner.lineas.filter(l => l.producto === producto);
  if (lineas.length === 0 && !deshacer) return null;

  return (
    <section aria-labelledby="ya-pedido" className="mt-5 border-t border-line pt-4 pb-1">
      <h3 id="ya-pedido" className="mb-1 font-semibold">
        Ya pedido
      </h3>
      <ul>
        <AnimatePresence initial={false}>
          {lineas.map(l => {
            const quien = l.personas.map(id => nombreDe(dinner, id)).join(' + ');
            return (
              <m.li key={l.id} layout="position" exit={itemExit} className="flex min-h-13 items-center gap-2 border-b border-line py-1.5 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{quien}</p>
                  <p className="text-small text-muted">{formatEuros(l.precio * l.cantidad)}</p>
                </div>
                <button
                  type="button"
                  className="btn size-10 min-h-10 rounded-full px-0 disabled:cursor-default disabled:opacity-40"
                  aria-label={`Uno menos para ${quien}`}
                  disabled={l.cantidad === 1}
                  onClick={() => act(d => updateLine(d, l.id, { cantidad: l.cantidad - 1 }))}
                >
                  <Minus size={16} />
                </button>
                <span className="min-w-[2ch] text-center font-semibold" aria-label={`Cantidad: ${l.cantidad}`}>
                  {l.cantidad}
                </span>
                <button
                  type="button"
                  className="btn size-10 min-h-10 rounded-full px-0 disabled:cursor-default disabled:opacity-40"
                  aria-label={`Uno más para ${quien}`}
                  onClick={() => act(d => updateLine(d, l.id, { cantidad: l.cantidad + 1 }))}
                >
                  <Plus size={16} />
                </button>
                <button
                  type="button"
                  className="btn btn-icon"
                  aria-label={`Borrar el pedido de ${quien}`}
                  onClick={() => act(d => removeLine(d, l.id), `Borrado: ${l.cantidad} × ${l.producto}`)}
                >
                  <X size={18} />
                </button>
              </m.li>
            );
          })}
        </AnimatePresence>
      </ul>
      {/* el aviso general de deshacer queda tapado por la hoja: aquí va dentro */}
      <AnimatePresence>
        {deshacer && (
          <m.div
            className="mt-2 flex items-center gap-2 rounded-control bg-accent-soft py-1 pr-1 pl-3"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: exitFast }}
          >
            <span className="min-w-0 flex-1 text-small">{deshacer.texto}</span>
            <button type="button" className="btn min-h-10 border-transparent px-3 font-semibold" onClick={undo}>
              <ArrowCounterClockwise size={18} />
              Deshacer
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </section>
  );
}
