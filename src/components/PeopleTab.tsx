import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { CaretRight, Plus, Users, X } from '@phosphor-icons/react';
import type { Dinner } from '../types';
import type { Act } from '../useDinner';
import { addPerson, removePerson } from '../lib/dinner';
import { shares } from '../lib/calc';
import { item, itemExit } from '../motion';
import { EmptyState } from './EmptyState';
import { Euros } from './Euros';
import { ConfirmDialog } from './ConfirmDialog';

export function PeopleTab(props: { dinner: Dinner; act: Act; onPick: (personaId: string) => void; onReset: () => void }) {
  const { dinner, act, onPick, onReset } = props;
  const [nombre, setNombre] = useState('');
  const [borrar, setBorrar] = useState(false);
  const cuotas = shares(dinner);

  return (
    <section>
      <form
        className="grid grid-cols-[minmax(0,1fr)] gap-2"
        onSubmit={e => {
          e.preventDefault();
          if (act(d => addPerson(d, nombre))) setNombre('');
        }}
      >
        <label htmlFor="nombre" className="font-semibold">
          ¿Quién está en la mesa?
        </label>
        <div className="flex gap-2">
          <input
            id="nombre"
            className="flex-1"
            placeholder="Nombre"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary">
            <Plus size={18} />
            Añadir
          </button>
        </div>
      </form>

      {dinner.personas.length === 0 ? (
        <EmptyState
          icon={Users}
          titulo="Aún no hay nadie"
          texto="Apunta a cada persona; luego toca su nombre para añadirle lo que pide."
        />
      ) : (
        <>
          <p className="mt-4 mb-1 text-small text-muted">Toca un nombre para apuntarle lo que pide.</p>
          <ul>
            <AnimatePresence>
              {dinner.personas.map((p, i) => (
                <m.li
                  key={p.id}
                  layout
                  variants={item}
                  initial="hidden"
                  animate="show"
                  custom={i}
                  exit={itemExit}
                  className="flex min-h-13 items-center gap-2 border-b border-line"
                >
                  <button
                    type="button"
                    className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left transition-transform duration-150 active:scale-[0.98]"
                    aria-label={`Añadir platos para ${p.nombre}`}
                    onClick={() => onPick(p.id)}
                  >
                    <span className="min-w-0 flex-1 truncate">{p.nombre}</span>
                    <Euros cents={cuotas[p.id] ?? 0} />
                    <CaretRight className="text-muted" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-icon"
                    aria-label={`Quitar a ${p.nombre}`}
                    onClick={() => act(d => removePerson(d, p.id))}
                  >
                    <X size={18} />
                  </button>
                </m.li>
              ))}
            </AnimatePresence>
          </ul>
        </>
      )}

      <button
        type="button"
        className="btn mt-10 w-full border-error text-error"
        onClick={() => setBorrar(true)}
      >
        Nueva cena
      </button>

      <ConfirmDialog
        open={borrar}
        titulo="¿Empezar otra cena?"
        texto="Se borrará esta cena con todo lo apuntado. No se puede deshacer."
        confirmar="Borrar y empezar"
        onConfirm={onReset}
        onCancel={() => setBorrar(false)}
      />
    </section>
  );
}
