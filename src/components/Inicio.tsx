import * as m from 'motion/react-m';
import { ArrowLeft, CaretRight, ClockCounterClockwise, ForkKnife, HandCoins, Users, type Icon } from '@phosphor-icons/react';
import type { RestauranteRef } from '../types';
import { item } from '../motion';
import { Skeleton } from './Skeleton';

const PASOS: { icon: Icon; titulo: string; texto: string }[] = [
  { icon: Users, titulo: 'Apunta quién está', texto: 'Un nombre por persona de la mesa.' },
  { icon: ForkKnife, titulo: 'Marca qué pide cada uno', texto: 'Los platos compartidos se dividen solos.' },
  { icon: HandCoins, titulo: 'Mira quién paga a quién', texto: 'Por consumo o a partes iguales, al céntimo.' },
];

export type CenaGuardada = { restaurante: string; personas: number; hora: string };

/** Primera pantalla: qué es la app, la cena guardada si la hay y el botón para empezar. */
export function Inicio({ guardada, onContinuar, onNueva }: { guardada: CenaGuardada | null; onContinuar: () => void; onNueva: () => void }) {
  let i = 0; // orden de entrada en cascada
  return (
    <div className="grid gap-6">
      <m.header variants={item} initial="hidden" animate="show" custom={i++} className="grid gap-3">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width={56} height={56} className="rounded-box shadow-soft" />
        <h1 className="text-4xl font-bold">Yo pago lo mío</h1>
        <p className="max-w-[34ch] text-lg text-muted">Reparte la cuenta de la cena sin hacer cuentas a mano.</p>
      </m.header>

      {guardada && (
        <m.section
          variants={item}
          initial="hidden"
          animate="show"
          custom={i++}
          aria-label="Cena guardada"
          className="grid gap-3 rounded-box border border-line bg-surface p-4 shadow-soft"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent-soft text-accent">
              <ClockCounterClockwise size={22} />
            </span>
            <div className="min-w-0">
              <p className="font-semibold">Cena en {guardada.restaurante}</p>
              <p className="text-[0.95rem] text-muted">
                {guardada.personas} {guardada.personas === 1 ? 'persona' : 'personas'}, guardada a las {guardada.hora}
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-primary" onClick={onContinuar}>
            Continuar
          </button>
        </m.section>
      )}

      <m.div variants={item} initial="hidden" animate="show" custom={i++}>
        <button type="button" className={`btn w-full ${guardada ? '' : 'btn-primary'}`} onClick={onNueva}>
          Nueva cena
        </button>
      </m.div>

      <section aria-labelledby="como">
        <m.h2 id="como" variants={item} initial="hidden" animate="show" custom={i++} className="mb-1 text-lg font-semibold">
          Cómo funciona
        </m.h2>
        <ol>
          {PASOS.map(p => (
            <m.li
              key={p.titulo}
              variants={item}
              initial="hidden"
              animate="show"
              custom={i++}
              className="flex items-start gap-3 border-b border-line py-3 last:border-b-0"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-control bg-surface text-accent shadow-soft">
                <p.icon size={22} />
              </span>
              <div>
                <p className="font-semibold">{p.titulo}</p>
                <p className="text-[0.95rem] text-muted">{p.texto}</p>
              </div>
            </m.li>
          ))}
        </ol>
      </section>
    </div>
  );
}

/** Segunda pantalla: elegir restaurante; empezar aquí crea la cena. */
export function Restaurantes(props: {
  restaurantes: RestauranteRef[] | null;
  error: boolean;
  onReintentar: () => void;
  onElegir: (id: string) => void;
  onVolver: () => void;
}) {
  const { restaurantes, error, onReintentar, onElegir, onVolver } = props;
  return (
    <div className="grid gap-4">
      <button type="button" className="btn -ml-3 justify-self-start border-transparent text-muted" onClick={onVolver}>
        <ArrowLeft />
        Volver
      </button>
      <h1 className="text-3xl font-bold">¿Dónde cenáis?</h1>
      {error ? (
        <>
          <p className="text-error">No se pudo cargar la lista de restaurantes</p>
          <button type="button" className="btn" onClick={onReintentar}>
            Reintentar
          </button>
        </>
      ) : !restaurantes ? (
        <Skeleton filas={2} alto={60} />
      ) : (
        <ul className="grid gap-2.5">
          {restaurantes.map((r, i) => (
            <m.li key={r.id} variants={item} initial="hidden" animate="show" custom={i}>
              <button
                type="button"
                className="btn min-h-15 w-full justify-between border-line bg-surface px-4 font-semibold shadow-soft"
                onClick={() => onElegir(r.id)}
              >
                {r.nombre}
                <CaretRight className="text-muted" />
              </button>
            </m.li>
          ))}
        </ul>
      )}
    </div>
  );
}
