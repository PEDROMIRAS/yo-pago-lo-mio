import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { Receipt, X } from '@phosphor-icons/react';
import type { Dinner, Linea, Menu, MenuItem } from '../types';
import type { Act } from '../useDinner';
import { addLine, setModo, updateLine } from '../lib/dinner';
import { blocks, breakdown, itemTotals, payStatus, shares } from '../lib/calc';
import { formatEuros } from '../lib/money';
import { exitFast, item } from '../motion';
import { LineDialog } from './LineDialog';
import { MenuList } from './MenuList';
import { Modal } from './Modal';
import { ModeToggle } from './ModeToggle';
import { EmptyState } from './EmptyState';
import { Euros } from './Euros';
import { BlockCard } from './BlockCard';

type Edicion =
  | { tipo: 'editar'; linea: Linea }
  | { tipo: 'elegir'; personas: string[] }
  | { tipo: 'nueva'; item: MenuItem; personas: string[] }
  | null;

const h2 = 'mt-7 mb-2.5 text-lg font-semibold first:mt-0';
const fila = 'flex items-center gap-2';

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
        icon={Receipt}
        titulo="Aún no habéis pedido nada"
        texto="Cuando apuntes platos en la carta, aquí verás lo que le toca a cada uno."
        accion={{ label: 'Ir a la carta', onClick: onGoMenu }}
      />
    );
  }

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
      <h2 className={h2}>Por persona</h2>
      <ModeToggle modo={dinner.modo} onChange={modo => act(d => setModo(d, modo))} />
      <AnimatePresence initial={false}>
        {dinner.modo === 'igual' && (
          <m.p className="mt-2 text-muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: exitFast }}>
            Total {formatEuros(total)} entre {dinner.personas.length} personas
          </m.p>
        )}
      </AnimatePresence>
      <ul className="mt-2">
        {dinner.personas.map((p, i) => (
          <m.li key={p.id} layout="position" variants={item} initial="hidden" animate="show" custom={i} className="border-b border-line py-2">
            <div className={fila}>
              <strong className="flex-1">{p.nombre}</strong>
              {/* al cambiar de modo, cada cuota cuenta hasta su valor nuevo */}
              <Euros cents={cuotas[p.id] ?? 0} className="font-semibold" />
            </div>
            <AnimatePresence initial={false}>
              {dinner.modo === 'consumo' && (
                <m.div
                  className="overflow-hidden text-small text-muted"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0, transition: exitFast }}
                >
                  {desglose[p.id]?.length ? (
                    <ul className="mt-0.5">
                      {desglose[p.id].map(({ linea, parte }) => (
                        <li key={linea.id} className={fila}>
                          <span className="flex-1">
                            {linea.cantidad} × {linea.producto}
                            {linea.personas.length > 1 && ` (entre ${linea.personas.length})`}
                          </span>
                          <span>{formatEuros(parte)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-0.5">No ha pedido nada</p>
                  )}
                </m.div>
              )}
            </AnimatePresence>
          </m.li>
        ))}
      </ul>

      <h2 className={h2}>Compartido entre…</h2>
      <AnimatePresence initial={false} mode="popLayout">
        {blocks(dinner).map(b => (
          <BlockCard
            key={b.personas.join()}
            block={b}
            dinner={dinner}
            act={act}
            onEdit={linea => abrir({ tipo: 'editar', linea })}
            onAddProduct={personas => abrir({ tipo: 'elegir', personas })}
          />
        ))}
      </AnimatePresence>

      <m.div layout="position">
        <h2 className={h2}>Lo pedido</h2>
        <ul>
          {totales.map(it => (
            <li key={it.producto} className={`${fila} min-h-11 border-b border-line`}>
              <span className="flex-1">
                {it.cantidad} × {it.producto}
              </span>
              <span>{formatEuros(it.total)}</span>
            </li>
          ))}
        </ul>
        <p className={`${fila} mt-4 border-t-2 border-fg pt-3`}>
          <strong className="flex-1">Total de la cuenta</strong>
          <Euros cents={total} className="font-semibold" />
        </p>
      </m.div>

      <Modal open={edicion?.tipo === 'elegir'} onClose={() => setEdicion(null)} label="Elegir producto">
        <div className={`${fila} mb-2`}>
          <h2 className="flex-1 text-lg font-semibold">Elegir producto</h2>
          <button type="button" className="btn btn-icon" aria-label="Cerrar" onClick={() => setEdicion(null)}>
            <X size={18} />
          </button>
        </div>
        <MenuList
          menu={menu}
          fija={false}
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
