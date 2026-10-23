import { useState } from 'react';
import type { Dinner } from '../types';
import type { Act } from '../useDinner';
import { addPerson, removePerson } from '../lib/dinner';
import { shares } from '../lib/calc';
import { formatEuros } from '../lib/money';

export function PeopleTab({ dinner, act, onPick }: { dinner: Dinner; act: Act; onPick: (personaId: string) => void }) {
  const [nombre, setNombre] = useState('');
  const cuotas = shares(dinner);

  return (
    <section>
      <form
        className="row"
        onSubmit={e => {
          e.preventDefault();
          if (act(d => addPerson(d, nombre))) setNombre('');
        }}
      >
        <input
          aria-label="Nombre"
          placeholder="Nombre"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          autoComplete="off"
        />
        <button type="submit">Añadir</button>
      </form>

      {dinner.personas.length === 0 ? (
        <p className="muted">Añade a quienes estáis en la mesa.</p>
      ) : (
        <ul className="list">
          {dinner.personas.map(p => (
            <li key={p.id} className="row">
              <button type="button" className="link grow" onClick={() => onPick(p.id)}>
                {p.nombre}
              </button>
              <span>{formatEuros(cuotas[p.id] ?? 0)}</span>
              <button
                type="button"
                className="icon"
                aria-label={`Quitar a ${p.nombre}`}
                onClick={() => act(d => removePerson(d, p.id))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
