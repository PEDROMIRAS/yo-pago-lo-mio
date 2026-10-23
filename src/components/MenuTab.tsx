import { useEffect, useState } from 'react';
import type { Dinner, Menu, MenuItem } from '../types';
import type { Act } from '../useDinner';
import { addLine } from '../lib/dinner';
import { itemTotals } from '../lib/calc';
import { formatEuros } from '../lib/money';
import { LineDialog } from './LineDialog';
import { MenuList } from './MenuList';
import { EmptyState } from './EmptyState';
import { Icon } from './Icon';

export function MenuTab(props: {
  dinner: Dinner;
  menu: Menu;
  act: Act;
  error: string | null;
  clearError: () => void;
  activePersona: string | null;
  onClearPersona: () => void;
  onGoPeople: () => void;
  ultimas: string[];
  setUltimas: (ids: string[]) => void;
}) {
  const { dinner, menu, act, error, clearError, activePersona, onClearPersona, onGoPeople, ultimas, setUltimas } = props;
  const [item, setItem] = useState<MenuItem | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  useEffect(() => {
    if (!hecho) return;
    const t = setTimeout(() => setHecho(null), 2500);
    return () => clearTimeout(t);
  }, [hecho]);

  if (dinner.personas.length === 0) {
    return (
      <EmptyState
        icon="users"
        titulo="Primero, la gente"
        texto="Para repartir cada plato necesito saber quién está en la mesa."
        accion={{ label: 'Ir a Gente', onClick: onGoPeople }}
      />
    );
  }

  const activa = dinner.personas.find(p => p.id === activePersona);
  const existentes = new Set(dinner.personas.map(p => p.id));
  const pedidos = new Map(itemTotals(dinner).map(i => [i.producto, i.cantidad]));
  const nombres = (ids: string[]) => dinner.personas.filter(p => ids.includes(p.id)).map(p => p.nombre).join(', ');

  return (
    <section>
      {activa && (
        <div className="row banner">
          <span className="grow">
            Añadiendo para <strong>{activa.nombre}</strong>
          </span>
          <button type="button" className="icon ghost" aria-label="Dejar de añadir para una persona" onClick={onClearPersona}>
            <Icon name="x" size={18} />
          </button>
        </div>
      )}

      <MenuList
        menu={menu}
        pedidos={pedidos}
        onPick={it => {
          clearError();
          setItem(it);
        }}
      />

      <LineDialog
        open={item !== null}
        titulo={item ? `${item.nombre} · ${formatEuros(item.precio)}` : ''}
        personas={dinner.personas}
        // lo normal es pedir varias cosas seguidas para el mismo grupo
        inicial={{ cantidad: 1, personas: activa ? [activa.id] : ultimas.filter(id => existentes.has(id)) }}
        error={error}
        onAccept={({ cantidad, personas }) => {
          if (item && act(d => addLine(d, { producto: item.nombre, precio: item.precio, cantidad, personas }))) {
            if (!activa) setUltimas(personas);
            setHecho(`Añadido: ${cantidad} × ${item.nombre} · ${nombres(personas)}`);
            setItem(null);
          }
        }}
        onClose={() => setItem(null)}
      />

      <p className={hecho ? 'snackbar show' : 'snackbar'} role="status">
        {hecho && <Icon name="check" size={18} />}
        {hecho}
      </p>
    </section>
  );
}
