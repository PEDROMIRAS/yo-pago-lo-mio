import { useId, useState } from 'react';
import type { Menu, MenuItem } from '../types';
import { matchesQuery } from '../lib/menu';
import { formatEuros } from '../lib/money';
import { Icon } from './Icon';

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
      <div className="search">
        <Icon name="search" size={18} />
        <input
          type="search"
          aria-label="Buscar en la carta"
          placeholder="Buscar en la carta"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

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

      {grupos.size === 0 && (
        <p className="muted hint">No hay nada con “{query}”. Prueba con otra palabra o con la categoría.</p>
      )}
      {[...grupos].map(([categoria, items]) => (
        <div key={categoria}>
          <h2 className="cat" id={anchor(categoria)}>
            {categoria}
          </h2>
          <ul className="rows">
            {items.map(it => {
              const n = pedidos.get(it.nombre);
              return (
                <li key={it.nombre}>
                  <button type="button" className="item row" onClick={() => onPick(it)}>
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
