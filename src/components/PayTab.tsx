import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { ArrowRight, CheckCircle, Wallet } from '@phosphor-icons/react';
import type { Dinner } from '../types';
import type { Act } from '../useDinner';
import { nombreDe, pagaTodo, setModo, setPago } from '../lib/dinner';
import { balances, payStatus, settle, shares } from '../lib/calc';
import { formatEuros, parseEuros } from '../lib/money';
import { exitFast, item } from '../motion';
import { ModeToggle } from './ModeToggle';
import { EmptyState } from './EmptyState';
import { Euros } from './Euros';

const aTexto = (cents: number | undefined) => (cents ? (cents / 100).toFixed(2).replace('.', ',') : '');

export function PayTab({ dinner, act, onGoMenu }: { dinner: Dinner; act: Act; onGoMenu: () => void }) {
  // lo que se está escribiendo; solo pasa a la cena al salir del campo
  const [textos, setTextos] = useState<Record<string, string>>(() =>
    Object.fromEntries(dinner.personas.map(p => [p.id, aTexto(dinner.pagos[p.id])])),
  );
  const [malos, setMalos] = useState<Set<string>>(new Set());

  if (dinner.lineas.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        titulo="No hay nada que pagar todavía"
        texto="Apunta en la carta lo que se pide y aquí saldrá quién paga a quién."
        accion={{ label: 'Ir a la carta', onClick: onGoMenu }}
      />
    );
  }

  const cuotas = shares(dinner);
  const { total, pagado, diferencia } = payStatus(dinner);

  // el caso más común: uno paga la cuenta entera y los demás no ponen nada
  const pagoTodo = (id: string) => {
    setTextos(Object.fromEntries(dinner.personas.map(p => [p.id, p.id === id ? aTexto(total) : ''])));
    setMalos(new Set());
    act(d => pagaTodo(d, id));
  };

  const guardar = (id: string) => {
    const cents = parseEuros(textos[id] ?? '');
    setMalos(prev => {
      const n = new Set(prev);
      if (cents === null) n.add(id);
      else n.delete(id);
      return n;
    });
    if (cents !== null) act(d => setPago(d, id, cents));
  };

  const transferencias = diferencia === 0 && total > 0 ? settle(balances(dinner), dinner.personas.map(p => p.id)) : [];
  // un solo mensaje de estado a la vez; al cambiar, el anterior sale y entra el nuevo
  const estado =
    pagado === 0 ? 'vacio' : diferencia < 0 ? 'faltan' : diferencia > 0 ? 'sobran' : transferencias.length ? 'pagos' : 'cuadra';

  return (
    <section>
      <ModeToggle modo={dinner.modo} onChange={modo => act(d => setModo(d, modo))} />

      <ul className="mt-2">
        {dinner.personas.map((p, i) => {
          const malo = malos.has(p.id);
          return (
            <m.li key={p.id} variants={item} initial="hidden" animate="show" custom={i} className="border-b border-line py-3">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <strong>{p.nombre}</strong>
                  <div className="text-muted">
                    le toca <Euros cents={cuotas[p.id] ?? 0} />
                  </div>
                  {total > 0 && dinner.pagos[p.id] !== total && (
                    <button type="button" className="btn mt-1.5 min-h-9 px-3 text-small" onClick={() => pagoTodo(p.id)}>
                      Pagó todo
                    </button>
                  )}
                </div>
                <label className="grid justify-items-end gap-1 text-sm">
                  <span className="text-muted">ha puesto</span>
                  <input
                    inputMode="decimal"
                    placeholder="0,00"
                    className={`w-30 text-right text-base ${malo ? 'border-error' : ''}`}
                    aria-invalid={malo}
                    aria-describedby={malo ? `err-${p.id}` : undefined}
                    value={textos[p.id] ?? ''}
                    onChange={e => setTextos(t => ({ ...t, [p.id]: e.target.value }))}
                    onBlur={() => guardar(p.id)}
                    onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                  />
                </label>
              </div>
              <AnimatePresence>
                {malo && (
                  <m.p
                    id={`err-${p.id}`}
                    className="mt-1 text-error"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: [6, -4, 2, 0] }}
                    exit={{ opacity: 0, transition: exitFast }}
                  >
                    Importe no válido
                  </m.p>
                )}
              </AnimatePresence>
            </m.li>
          );
        })}
      </ul>

      <div className="mt-4" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={estado}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: exitFast }}
          >
            {estado === 'vacio' && <p className="text-muted">Total {formatEuros(total)}. Apunta lo que ha puesto cada uno.</p>}
            {estado === 'faltan' && (
              <p className="font-semibold text-warn">
                Faltan <Euros cents={-diferencia} />
              </p>
            )}
            {estado === 'sobran' && (
              <p className="font-semibold text-warn">
                Sobran <Euros cents={diferencia} />
              </p>
            )}
            {estado === 'cuadra' && (
              <p className="flex items-center gap-2 font-semibold">
                <CheckCircle size={22} weight="fill" className="text-accent" />
                Cuentas cuadradas, nadie debe nada
              </p>
            )}
            {estado === 'pagos' && (
              <>
                <h2 className="mb-2.5 text-lg font-semibold">Quién paga a quién</h2>
                <ul>
                  {transferencias.map((t, i) => (
                    <m.li
                      key={`${t.de}-${t.a}`}
                      layout="position"
                      variants={item}
                      initial="hidden"
                      animate="show"
                      custom={i}
                      className="flex min-h-13 items-center gap-2 border-b border-line"
                    >
                      <span className="flex flex-1 items-center gap-1.5">
                        {nombreDe(dinner, t.de)}
                        <ArrowRight size={18} className="text-accent" />
                        <span className="sr-only">paga a</span>
                        {nombreDe(dinner, t.a)}
                      </span>
                      <Euros cents={t.importe} className="font-semibold" />
                    </m.li>
                  ))}
                </ul>
              </>
            )}
          </m.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
