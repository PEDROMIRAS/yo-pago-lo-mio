import { useState, type CSSProperties } from 'react';
import type { Dinner } from '../types';
import type { Act } from '../useDinner';
import { setModo, setPago } from '../lib/dinner';
import { balances, payStatus, settle, shares } from '../lib/calc';
import { formatEuros, parseEuros } from '../lib/money';
import { ModeToggle } from './ModeToggle';
import { Icon } from './Icon';
import { EmptyState } from './EmptyState';

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
        icon="wallet"
        titulo="No hay nada que pagar todavía"
        texto="Apuntad lo que pedís en la carta y aquí saldrá quién paga a quién."
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
    act(d => d.personas.reduce((acc, p) => setPago(acc, p.id, p.id === id ? total : 0), d));
  };
  const nombre = (id: string) => dinner.personas.find(p => p.id === id)?.nombre ?? '?';

  const guardar = (id: string) => {
    const cents = parseEuros(textos[id] ?? '');
    setMalos(m => {
      const n = new Set(m);
      if (cents === null) n.add(id);
      else n.delete(id);
      return n;
    });
    if (cents !== null) act(d => setPago(d, id, cents));
  };

  const transferencias = diferencia === 0 && total > 0 ? settle(balances(dinner), dinner.personas.map(p => p.id)) : [];

  return (
    <section>
      <ModeToggle modo={dinner.modo} onChange={m => act(d => setModo(d, m))} />

      <ul className="rows pay">
        {dinner.personas.map((p, i) => {
          const malo = malos.has(p.id);
          return (
            <li key={p.id} style={{ '--i': i } as CSSProperties}>
              <div className="row">
                <div className="grow">
                  <strong>{p.nombre}</strong>
                  <div className="muted">le toca {formatEuros(cuotas[p.id] ?? 0)}</div>
                  {total > 0 && dinner.pagos[p.id] !== total && (
                    <button type="button" className="small" onClick={() => pagoTodo(p.id)}>
                      Pagó todo
                    </button>
                  )}
                </div>
                <label className="paid">
                  <span className="muted">ha puesto</span>
                  <input
                    inputMode="decimal"
                    placeholder="0,00"
                    aria-invalid={malo}
                    aria-describedby={malo ? `err-${p.id}` : undefined}
                    value={textos[p.id] ?? ''}
                    onChange={e => setTextos(t => ({ ...t, [p.id]: e.target.value }))}
                    onBlur={() => guardar(p.id)}
                    onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                  />
                </label>
              </div>
              {malo && (
                <p id={`err-${p.id}`} className="error">
                  Importe no válido
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="status" aria-live="polite">
        {pagado === 0 && total > 0 && (
          <p className="muted">Total {formatEuros(total)}. Apuntad lo que ha puesto cada uno.</p>
        )}
        {pagado > 0 && diferencia < 0 && <p className="warn">Faltan {formatEuros(-diferencia)}</p>}
        {diferencia > 0 && <p className="warn">Sobran {formatEuros(diferencia)}</p>}
        {diferencia === 0 && total > 0 && (
          transferencias.length === 0 ? (
            <p>Cuentas cuadradas, nadie debe nada</p>
          ) : (
            <>
              <h2>Quién paga a quién</h2>
              <ul className="rows">
                {transferencias.map((t, i) => (
                  <li key={`${t.de}-${t.a}`} className="row" style={{ '--i': i } as CSSProperties}>
                    <span className="grow row transfer">
                      {nombre(t.de)}
                      <Icon name="arrow" size={18} />
                      <span className="sr-only">paga a</span>
                      {nombre(t.a)}
                    </span>
                    <strong>{formatEuros(t.importe)}</strong>
                  </li>
                ))}
              </ul>
            </>
          )
        )}
      </div>
    </section>
  );
}
