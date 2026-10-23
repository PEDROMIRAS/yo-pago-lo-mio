import { useState } from 'react';
import type { Dinner, Menu, MenuItem } from '../types';
import type { Act } from '../useDinner';
import { matchesQuery } from '../lib/menu';
import { addLine } from '../lib/dinner';
import { formatEuros } from '../lib/money';
import { LineDialog } from './LineDialog';

export function MenuTab(props: {
  dinner: Dinner;
  menu: Menu;
  act: Act;
  error: string | null;
  clearError: () => void;
  activePersona: string | null;
  onClearPersona: () => void;
  onGoPeople: () => void;
}) {
  const { dinner, menu, act, error, clearError, activePersona, onClearPersona, onGoPeople } = props;
  const [query, setQuery] = useState('');
  const [item, setItem] = useState<MenuItem | null>(null);

  if (dinner.personas.length === 0) {
    return (
      <section className="center">
        <p>Añade primero a la gente.</p>
        <button type="button" className="primary" onClick={onGoPeople}>
          Ir a Gente
        </button>
      </section>
    );
  }

  const activa = dinner.personas.find(p => p.id === activePersona);
  const grupos = new Map<string, MenuItem[]>();
  for (const it of menu.carta) {
    if (matchesQuery(it, query)) grupos.set(it.categoria, [...(grupos.get(it.categoria) ?? []), it]);
  }

  return (
    <section>
      <input
        type="search"
        className="search"
        aria-label="Buscar en la carta"
        placeholder="Buscar en la carta"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      {activa && (
        <div className="row banner">
          <span className="grow">
            Añadiendo para <strong>{activa.nombre}</strong>
          </span>
          <button type="button" className="icon" aria-label="Dejar de añadir para una persona" onClick={onClearPersona}>
            ✕
          </button>
        </div>
      )}

      {grupos.size === 0 && <p className="muted">No hay nada con “{query}”.</p>}
      {[...grupos].map(([categoria, items]) => (
        <div key={categoria}>
          <h2 className="cat">{categoria}</h2>
          <ul className="list">
            {items.map(it => (
              <li key={it.nombre}>
                <button type="button" className="wide row" onClick={() => {
                    clearError();
                    setItem(it);
                  }}
                >
                  <span className="grow">{it.nombre}</span>
                  <span>{formatEuros(it.precio)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <LineDialog
        open={item !== null}
        titulo={item ? `${item.nombre} · ${formatEuros(item.precio)}` : ''}
        personas={dinner.personas}
        inicial={{ cantidad: 1, personas: activa ? [activa.id] : [] }}
        error={error}
        onAccept={({ cantidad, personas }) => {
          if (item && act(d => addLine(d, { producto: item.nombre, precio: item.precio, cantidad, personas }))) {
            setItem(null);
          }
        }}
        onClose={() => setItem(null)}
      />
    </section>
  );
}
