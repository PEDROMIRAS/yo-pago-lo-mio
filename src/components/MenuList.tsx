import { useEffect, useId, useRef, useState } from 'react';
import * as m from 'motion/react-m';
import { MagnifyingGlass } from '@phosphor-icons/react';
import type { Menu, MenuItem } from '../types';
import { matchesQuery } from '../lib/menu';
import { formatEuros } from '../lib/money';

/** Buscador + saltos por categoría + platos; `pedidos` marca cuántos van ya de cada uno. */
export function MenuList(props: { menu: Menu; pedidos: Map<string, number>; onPick: (it: MenuItem) => void; fija?: boolean }) {
  const { menu, pedidos, onPick, fija = true } = props;
  const [query, setQuery] = useState('');
  const [activa, setActiva] = useState<string | null>(null);
  const uid = useId();
  const chips = useRef<HTMLElement>(null);

  const grupos = new Map<string, MenuItem[]>();
  for (const it of menu.carta) {
    if (matchesQuery(it, query)) grupos.set(it.categoria, [...(grupos.get(it.categoria) ?? []), it]);
  }
  const cats = [...grupos.keys()];
  const anchor = (cat: string) => `${uid}-${cats.indexOf(cat)}`;
  const clave = cats.join('|');

  // categoría visible: la marca un IntersectionObserver, sin escuchar el scroll
  useEffect(() => {
    if (!fija) return;
    const io = new IntersectionObserver(
      entries => {
        const visible = entries.find(e => e.isIntersecting);
        if (visible) setActiva(visible.target.getAttribute('data-cat'));
      },
      { rootMargin: '-140px 0px -65% 0px' },
    );
    document.querySelectorAll(`[data-cat][id^="${CSS.escape(uid)}"]`).forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [clave, uid, fija]);

  // lleva la pastilla activa a la vista dentro de la fila de chips (scroll del contenedor, no de la página)
  useEffect(() => {
    const nav = chips.current;
    const chip = nav?.querySelector<HTMLElement>('[aria-current="true"]');
    if (nav && chip) nav.scrollTo({ left: chip.offsetLeft - 16, behavior: 'smooth' });
  }, [activa]);

  return (
    <>
      <div className={fija ? 'sticky top-14 z-10 -mx-4 bg-bg/85 px-4 pt-1 pb-2 backdrop-blur-md' : ''}>
        <div className="relative flex items-center">
          <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 text-muted" />
          <input
            type="search"
            className="w-full pl-9.5"
            aria-label="Buscar en la carta"
            placeholder="Buscar en la carta"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        {cats.length > 1 && (
          <nav ref={chips} className="-mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 scrollbar-none" aria-label="Categorías">
            {cats.map(cat => {
              const on = fija && activa === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  aria-current={on}
                  className={`relative min-h-9.5 flex-none rounded-full border px-3.5 text-small transition-colors duration-200 ${on ? 'border-accent text-accent-fg' : 'border-line bg-surface'}`}
                  onClick={() => document.getElementById(anchor(cat))?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {on && <m.span layoutId={`chip-${uid}`} className="absolute inset-0 rounded-full bg-accent" />}
                  <span className="relative">{cat}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {grupos.size === 0 && (
        <p className="mt-4 text-muted">No hay nada con “{query}”. Prueba con otra palabra o con la categoría.</p>
      )}
      {[...grupos].map(([categoria, items]) => (
        <div key={categoria}>
          <h2
            id={anchor(categoria)}
            data-cat={categoria}
            className="mt-6 scroll-mt-44 text-xs font-semibold tracking-[0.06em] text-muted uppercase"
          >
            {categoria}
          </h2>
          <ul>
            {items.map(it => {
              const n = pedidos.get(it.nombre);
              return (
                <li key={it.nombre} className="border-b border-line">
                  <button
                    type="button"
                    className="-mx-2 flex min-h-13 w-[calc(100%+16px)] items-center gap-2 rounded-control px-2 py-2 text-left transition-colors duration-150 active:bg-line/60"
                    onClick={() => onPick(it)}
                  >
                    <span className="min-w-0 flex-1">
                      {it.nombre}
                      {it.descripcion && <span className="mt-0.5 block text-small text-muted">{it.descripcion}</span>}
                    </span>
                    {n ? (
                      // key={n}: cada plato añadido hace rebotar el contador
                      <m.span
                        key={n}
                        className="rounded-full bg-accent px-2 py-px text-xs font-semibold text-accent-fg"
                        aria-label={`${n} pedidos`}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                      >
                        ×{n}
                      </m.span>
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
