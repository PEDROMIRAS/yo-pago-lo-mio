import { useState } from 'react';
import type { Dinner, Linea, Menu, MenuItem } from '../types';
import type { Act } from '../useDinner';
import { addLine, addPersonToLines, removeLine, setModo, updateLine } from '../lib/dinner';
import { blocks, breakdown, itemTotals, payStatus, shares } from '../lib/calc';
import { formatEuros } from '../lib/money';
import { LineDialog } from './LineDialog';
import { MenuList } from './MenuList';
import { Modal } from './Modal';
import { ModeToggle } from './ModeToggle';
import { Icon } from './Icon';
import { EmptyState } from './EmptyState';

type Edicion =
  | { tipo: 'editar'; linea: Linea }
  | { tipo: 'elegir'; personas: string[] }
  | { tipo: 'nueva'; item: MenuItem; personas: string[] }
  | null;

export function SummaryTab(props: {
  dinner: Dinner;
  menu: Menu;
  act: Act;
  error: string | null;
  clearError: () => void;
  onGoMenu: () => void;
}) {
  const { dinner, menu, act, error, clearError, onGoMenu } = props;
  const [edicion, setEdicion] = useState<Edicion>(null);

  if (dinner.lineas.length === 0) {
    return (
      <EmptyState
        icon="receipt"
        titulo="Aún no habéis pedido nada"
        texto="Cuando apuntes platos en la carta, aquí verás lo que le toca a cada uno."
        accion={{ label: 'Ir a la carta', onClick: onGoMenu }}
      />
    );
  }

  const nombre = (id: string) => dinner.personas.find(p => p.id === id)?.nombre ?? '?';
  const { total } = payStatus(dinner);
  const cuotas = shares(dinner);
  const desglose = breakdown(dinner);
  const totales = itemTotals(dinner);
  const abrir = (e: Edicion) => {
    clearError();
    setEdicion(e);
  };

  return (
    <section>
      <h2>Por persona</h2>
      <ModeToggle modo={dinner.modo} onChange={m => act(d => setModo(d, m))} />
      {dinner.modo === 'igual' && (
        <p className="muted">
          Total {formatEuros(total)} entre {dinner.personas.length} personas
        </p>
      )}
      <ul className="rows">
        {dinner.personas.map(p => (
          <li key={p.id}>
            <div className="row">
              <strong className="grow">{p.nombre}</strong>
              <strong>{formatEuros(cuotas[p.id] ?? 0)}</strong>
            </div>
            {dinner.modo === 'consumo' &&
              (desglose[p.id]?.length ? (
                <ul className="sub muted">
                  {desglose[p.id].map(({ linea, parte }) => (
                    <li key={linea.id} className="row">
                      <span className="grow">
                        {linea.cantidad} × {linea.producto}
                        {linea.personas.length > 1 && ` (entre ${linea.personas.length})`}
                      </span>
                      <span>{formatEuros(parte)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted sub">No ha pedido nada</p>
              ))}
          </li>
        ))}
      </ul>

      <h2>Compartido entre…</h2>
      {blocks(dinner).map(b => {
        const partes = Object.values(b.cuotas);
        const min = Math.min(...partes);
        const max = Math.max(...partes);
        const fuera = dinner.personas.filter(p => !b.personas.includes(p.id));
        return (
          <article key={b.personas.join()} className="card">
            <div className="row">
              <h3 className="grow">{b.personas.map(nombre).join(' + ')}</h3>
              <strong>{formatEuros(b.total)}</strong>
            </div>
            {b.personas.length > 1 && (
              <p className="muted sub">
                {min === max ? formatEuros(min) : `${formatEuros(min).replace(/\s*€/, '')}-${formatEuros(max)}`} cada uno
              </p>
            )}
            <ul className="rows">
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
                    className="icon ghost"
                    aria-label={`Borrar ${l.producto}`}
                    onClick={() => act(d => removeLine(d, l.id))}
                  >
                    <Icon name="x" size={18} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="row add">
              {fuera.length > 0 && (
                <select
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
              <button type="button" onClick={() => abrir({ tipo: 'elegir', personas: b.personas })}>
                <Icon name="plus" size={18} />
                Producto
              </button>
            </div>
          </article>
        );
      })}

      <h2>Lo pedido</h2>
      <ul className="rows">
        {totales.map(it => (
          <li key={it.producto} className="row">
            <span className="grow">
              {it.cantidad} × {it.producto}
            </span>
            <span>{formatEuros(it.total)}</span>
          </li>
        ))}
      </ul>
      <p className="row total">
        <strong className="grow">Total de la cuenta</strong>
        <strong>{formatEuros(total)}</strong>
      </p>

      <Modal open={edicion?.tipo === 'elegir'} onClose={() => setEdicion(null)} label="Elegir producto">
        <div className="row">
          <h2 className="grow">Elegir producto</h2>
          <button type="button" className="icon ghost" aria-label="Cerrar" onClick={() => setEdicion(null)}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <MenuList
          menu={menu}
          pedidos={new Map(totales.map(i => [i.producto, i.cantidad]))}
          onPick={item => edicion?.tipo === 'elegir' && setEdicion({ tipo: 'nueva', item, personas: edicion.personas })}
        />
      </Modal>

      <LineDialog
        open={edicion?.tipo === 'editar' || edicion?.tipo === 'nueva'}
        titulo={
          edicion?.tipo === 'editar'
            ? edicion.linea.producto
            : edicion?.tipo === 'nueva'
              ? `${edicion.item.nombre} · ${formatEuros(edicion.item.precio)}`
              : ''
        }
        personas={dinner.personas}
        inicial={
          edicion?.tipo === 'editar'
            ? { cantidad: edicion.linea.cantidad, personas: edicion.linea.personas }
            : { cantidad: 1, personas: edicion?.tipo === 'nueva' ? edicion.personas : [] }
        }
        error={error}
        onAccept={v => {
          const ok =
            edicion?.tipo === 'editar'
              ? act(d => updateLine(d, edicion.linea.id, v))
              : edicion?.tipo === 'nueva' &&
                act(d => addLine(d, { producto: edicion.item.nombre, precio: edicion.item.precio, ...v }));
          if (ok) setEdicion(null);
        }}
        onClose={() => setEdicion(null)}
      />
    </section>
  );
}
