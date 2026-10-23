import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { CheckCircle, Users, X } from '@phosphor-icons/react';
import type { Dinner, Menu, MenuItem } from '../types';
import type { Act } from '../useDinner';
import { addLine, nombreDe } from '../lib/dinner';
import { itemTotals } from '../lib/calc';
import { formatEuros } from '../lib/money';
import { exitFast } from '../motion';
import { LineDialog } from './LineDialog';
import { MenuList } from './MenuList';
import { EmptyState } from './EmptyState';
import { Snackbar } from './Snackbar';

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
  // n: cada aviso es nuevo aunque el texto se repita, para que vuelva a entrar
  const [hecho, setHecho] = useState<{ n: number; texto: string } | null>(null);

  useEffect(() => {
    if (!hecho) return;
    const t = setTimeout(() => setHecho(null), 2500);
    return () => clearTimeout(t);
  }, [hecho]);

  if (dinner.personas.length === 0) {
    return (
      <EmptyState
        icon={Users}
        titulo="Primero, la gente"
        texto="Para repartir cada plato hace falta saber quién está en la mesa."
        accion={{ label: 'Ir a Gente', onClick: onGoPeople }}
      />
    );
  }

  const activa = dinner.personas.find(p => p.id === activePersona);
  const existentes = new Set(dinner.personas.map(p => p.id));
  const pedidos = new Map(itemTotals(dinner).map(i => [i.producto, i.cantidad]));


  return (
    <section>
      <AnimatePresence initial={false}>
        {activa && (
          <m.div
            className="overflow-hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0, transition: exitFast }}
          >
            <div className="mb-3 flex items-center gap-2 rounded-box bg-accent-soft pl-3.5">
              <span className="flex-1">
                Añadiendo para <strong>{activa.nombre}</strong>
              </span>
              <button type="button" className="btn btn-icon" aria-label="Dejar de añadir para una persona" onClick={onClearPersona}>
                <X size={18} />
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>

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
            setHecho(h => ({ n: (h?.n ?? 0) + 1, texto: `Añadido: ${cantidad} × ${item.nombre} · ${personas.map(id => nombreDe(dinner, id)).join(', ')}` }));
            setItem(null);
          }
        }}
        onClose={() => setItem(null)}
      />

      <Snackbar id={hecho?.n ?? null}>
        <CheckCircle size={20} weight="fill" className="shrink-0" />
        <span className="py-1">{hecho?.texto}</span>
      </Snackbar>
    </section>
  );
}
