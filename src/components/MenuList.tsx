import { useId, useState } from 'react';
import type { Menu, MenuItem } from '../types';
import { matchesQuery } from '../lib/menu';
import { formatEuros } from '../lib/money';

/** Buscador + saltos por categoría + platos; `pedidos` marca cuántos van ya de cada uno. */
export function MenuList({ menu, pedidos, onPick }: { menu: Menu; pedidos: Map<string, number>; onPick: (it: MenuItem) => void }) {
  const [query, setQuery] = useState('');
  const uid = useId();

  const grupos = new Map<string, MenuItem[]>();
  for (const it of menu.carta) {
    if (matchesQuery(it, query)) grupos.set(it.categoria, [...(grupos.get(it.categoria) ?? []), it]);
  }
  const anchor = (cat: string) => `${uid}-${[...grupos.keys()].indexOf(cat)}`;

  return (
    <>
      <input
        type="search"
        className="search"
        aria-label="Buscar en la carta"
        placeholder="Buscar en la carta"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      {grupos.size > 1 && (
        <nav className="chips" aria-label="Categorías">
          {[...grupos.keys()].map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => document.getElementById(anchor(cat))?.scrollIntoView({ behavior: 'smooth' })}
            >
              {cat}
            </button>
          ))}
        </nav>
      )}

      {grupos.size === 0 && <p className="muted">No hay nada con “{query}”.</p>}
      {[...grupos].map(([categoria, items]) => (
        <div key={categoria}>
          <h2 className="cat" id={anchor(categoria)}>
            {categoria}
          </h2>
          <ul className="list">
            {items.map(it => {
              const n = pedidos.get(it.nombre);
              return (
                <li key={it.nombre}>
                  <button type="button" className="wide row" onClick={() => onPick(it)}>
                    <span className="grow">{it.nombre}</span>
                    {n ? (
                      <span className="badge" aria-label={`${n} pedidos`}>
                        ×{n}
                      </span>
                    ) : null}
                    <span>{formatEuros(it.precio)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}
