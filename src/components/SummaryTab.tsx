import { useState } from 'react';
import type { Dinner, Linea, Menu, MenuItem } from '../types';
import type { Act } from '../useDinner';
import { addLine, addPersonToLines, removeLine, setModo, updateLine } from '../lib/dinner';
import { blocks, breakdown, itemTotals, payStatus, shares } from '../lib/calc';
import { formatEuros } from '../lib/money';
import { LineDialog } from './LineDialog';
import { ModeToggle } from './ModeToggle';

type Edicion = { tipo: 'editar'; linea: Linea } | { tipo: 'nueva'; item: MenuItem; personas: string[] } | null;

export function SummaryTab(props: {
  dinner: Dinner;
  menu: Menu;
  act: Act;
  error: string | null;
  clearError: () => void;
}) {
  const { dinner, menu, act, error, clearError } = props;
  const [edicion, setEdicion] = useState<Edicion>(null);

  if (dinner.lineas.length === 0) return <p className="muted">Aún no habéis pedido nada.</p>;

  const nombre = (id: string) => dinner.personas.find(p => p.id === id)?.nombre ?? '?';
  const { total } = payStatus(dinner);
  const cuotas = shares(dinner);
  const desglose = breakdown(dinner);
  const abrir = (e: Edicion) => {
    clearError();
    setEdicion(e);
  };

  return (
    <section>
      <h2>Lo pedido</h2>
      <ul className="plain">
        {itemTotals(dinner).map(it => (
          <li key={it.producto}>
            {it.producto} ×{it.cantidad} · {formatEuros(it.total)}
          </li>
        ))}
      </ul>

      <h2>Bloques</h2>
      {blocks(dinner).map(b => {
        const partes = Object.values(b.cuotas);
        const min = Math.min(...partes);
        const max = Math.max(...partes);
        const fuera = dinner.personas.filter(p => !b.personas.includes(p.id));
        return (
          <article key={b.personas.join()} className="card">
            <h3>
              {b.personas.map(nombre).join(' + ')} · {formatEuros(b.total)}
              {b.personas.length > 1 &&
                ` · ${min === max ? formatEuros(min) : `${formatEuros(min).replace(/\s*€/, '')}–${formatEuros(max)}`} cada uno`}
            </h3>
            <ul className="list">
              {b.lineas.map(l => (
                <li key={l.id} className="row">
                  <span className="grow">
                    {l.cantidad} × {l.producto} · {formatEuros(l.precio * l.cantidad)}
                  </span>
                  <button type="button" onClick={() => abrir({ tipo: 'editar', linea: l })}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="icon"
                    aria-label={`Borrar ${l.producto}`}
                    onClick={() => act(d => removeLine(d, l.id))}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <div className="row add">
              {fuera.length > 0 && (
                <select
                  aria-label="Añadir persona al bloque"
                  value=""
                  onChange={e => act(d => addPersonToLines(d, b.lineas.map(l => l.id), e.target.value))}
                >
                  <option value="">+ Persona</option>
                  {fuera.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              )}
              <select
                aria-label="Añadir producto al bloque"
                value=""
                onChange={e => {
                  const item = menu.carta[Number(e.target.value)];
                  if (item) abrir({ tipo: 'nueva', item, personas: b.personas });
                }}
              >
                <option value="">+ Producto</option>
                {menu.carta.map((it, i) => (
                  <option key={i} value={i}>
                    {it.nombre} · {formatEuros(it.precio)}
                  </option>
                ))}
              </select>
            </div>
          </article>
        );
      })}

      <h2>Por persona</h2>
      <ModeToggle modo={dinner.modo} onChange={m => act(d => setModo(d, m))} />
      {dinner.modo === 'igual' && (
        <p className="muted">
          Total {formatEuros(total)} entre {dinner.personas.length} personas
        </p>
      )}
      <ul className="list">
        {dinner.personas.map(p => (
          <li key={p.id}>
            <div className="row">
              <strong className="grow">{p.nombre}</strong>
              <strong>{formatEuros(cuotas[p.id] ?? 0)}</strong>
            </div>
            {dinner.modo === 'consumo' &&
              (desglose[p.id]?.length ? (
                <ul className="plain muted">
                  {desglose[p.id].map(({ linea, parte }) => (
                    <li key={linea.id}>
                      {linea.cantidad} × {linea.producto}
                      {linea.personas.length > 1 && ` (entre ${linea.personas.length})`} · {formatEuros(parte)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No ha pedido nada</p>
              ))}
          </li>
        ))}
      </ul>
      <p className="row">
        <strong className="grow">Total de la cuenta</strong>
        <strong>{formatEuros(total)}</strong>
      </p>

      <LineDialog
        open={edicion !== null}
        titulo={edicion?.tipo === 'editar' ? edicion.linea.producto : (edicion?.item.nombre ?? '')}
        personas={dinner.personas}
        inicial={
          edicion?.tipo === 'editar'
            ? { cantidad: edicion.linea.cantidad, personas: edicion.linea.personas }
            : { cantidad: 1, personas: edicion?.personas ?? [] }
        }
        error={error}
        onAccept={v => {
          if (!edicion) return;
          const ok =
            edicion.tipo === 'editar'
              ? act(d => updateLine(d, edicion.linea.id, v))
              : act(d => addLine(d, { producto: edicion.item.nombre, precio: edicion.item.precio, ...v }));
          if (ok) setEdicion(null);
        }}
        onClose={() => setEdicion(null)}
      />
    </section>
  );
}
