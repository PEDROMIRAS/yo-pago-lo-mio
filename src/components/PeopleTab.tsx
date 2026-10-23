import { useState, type CSSProperties } from 'react';
import type { Dinner } from '../types';
import type { Act } from '../useDinner';
import { addPerson, removePerson } from '../lib/dinner';
import { shares } from '../lib/calc';
import { formatEuros } from '../lib/money';
import { Icon } from './Icon';
import { EmptyState } from './EmptyState';

export function PeopleTab(props: { dinner: Dinner; act: Act; onPick: (personaId: string) => void; onReset: () => void }) {
  const { dinner, act, onPick, onReset } = props;
  const [nombre, setNombre] = useState('');
  const cuotas = shares(dinner);

  return (
    <section>
      <form
        className="field"
        onSubmit={e => {
          e.preventDefault();
          if (act(d => addPerson(d, nombre))) setNombre('');
        }}
      >
        <label htmlFor="nombre">¿Quién está en la mesa?</label>
        <div className="row">
          <input id="nombre" placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} autoComplete="off" />
          <button type="submit">
            <Icon name="plus" size={18} />
            Añadir
          </button>
        </div>
      </form>

      {dinner.personas.length === 0 ? (
        <EmptyState
          icon="users"
          titulo="Aún no hay nadie"
          texto="Apunta a cada persona; luego toca su nombre para añadirle lo que pide."
        />
      ) : (
        <>
          <p className="hint muted">Toca un nombre para apuntarle lo que pide.</p>
          <ul className="rows">
            {dinner.personas.map((p, i) => (
              <li key={p.id} className="row" style={{ '--i': i } as CSSProperties}>
                <button
                  type="button"
                  className="link grow row"
                  aria-label={`Añadir platos para ${p.nombre}`}
                  onClick={() => onPick(p.id)}
                >
                  <span className="grow">{p.nombre}</span>
                  <span>{formatEuros(cuotas[p.id] ?? 0)}</span>
                  <span className="chevron">
                    <Icon name="chevron" />
                  </span>
                </button>
                <button
                  type="button"
                  className="icon ghost"
                  aria-label={`Quitar a ${p.nombre}`}
                  onClick={() => act(d => removePerson(d, p.id))}
                >
                  <Icon name="x" size={18} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <button type="button" className="danger" onClick={() => confirm('¿Borrar esta cena y empezar otra?') && onReset()}>
        Nueva cena
      </button>
    </section>
  );
}
