import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { CaretRight, List, Receipt, Users, Wallet, X, type Icon } from '@phosphor-icons/react';
import type { RestauranteRef } from './types';
import { useDinner } from './useDinner';
import { loadRestaurants } from './lib/menu';
import { browserStorage, loadSession } from './lib/storage';
import { payStatus } from './lib/calc';
import { exitFast } from './motion';
import { PeopleTab } from './components/PeopleTab';
import { MenuTab } from './components/MenuTab';
import { SummaryTab } from './components/SummaryTab';
import { PayTab } from './components/PayTab';
import { Skeleton } from './components/Skeleton';
import { Euros } from './components/Euros';

type Tab = 'gente' | 'carta' | 'resumen' | 'pagar';
const TABS: { id: Tab; label: string; icon: Icon }[] = [
  { id: 'gente', label: 'Gente', icon: Users },
  { id: 'carta', label: 'Carta', icon: List },
  { id: 'resumen', label: 'Resumen', icon: Receipt },
  { id: 'pagar', label: 'Pagar', icon: Wallet },
];
const orden = (t: Tab) => TABS.findIndex(x => x.id === t);

const hora = (ms: number) => new Date(ms).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

const pantalla = 'mx-auto grid max-w-120 gap-3.5 px-4 pt-10 pb-6';

export default function App() {
  const { dinner, menu, error, act, start, resume, reset, clearError } = useDinner();
  const [saved, setSaved] = useState(() => loadSession(browserStorage));
  const [restaurantes, setRestaurantes] = useState<RestauranteRef[] | null>(null);
  const [restError, setRestError] = useState(false);
  const [intento, setIntento] = useState(0);
  // dir: +1 hacia la derecha de la barra, -1 hacia la izquierda; decide de qué lado entra la pestaña
  const [{ tab, dir }, setNav] = useState<{ tab: Tab; dir: number }>({ tab: 'gente', dir: 1 });
  const [activePersona, setActivePersona] = useState<string | null>(null);
  const [ultimas, setUltimas] = useState<string[]>([]); // última selección del diálogo de la carta

  useEffect(() => {
    let vivo = true;
    loadRestaurants().then(
      r => vivo && setRestaurantes(r),
      () => vivo && setRestError(true),
    );
    return () => {
      vivo = false;
    };
  }, [intento]);

  const irA = (t: Tab) => {
    if (t === tab) return;
    setNav({ tab: t, dir: Math.sign(orden(t) - orden(tab)) });
    window.scrollTo({ top: 0 });
  };

  const nombreDe = (id: string) => restaurantes?.find(r => r.id === id)?.nombre ?? id;

  const nueva = () => {
    reset();
    setSaved(null);
    setNav({ tab: 'gente', dir: 1 });
    setActivePersona(null);
    setUltimas([]);
  };

  if (!dinner) {
    if (saved) {
      const n = saved.dinner.personas.length;
      return (
        <m.main className={pantalla} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p>
            ¿Continuar la cena en <strong>{nombreDe(saved.dinner.restauranteId)}</strong> ({n}{' '}
            {n === 1 ? 'persona' : 'personas'}, guardada a las {hora(saved.guardado)}) o empezar una nueva?
          </p>
          <button type="button" className="btn btn-primary" onClick={() => resume(saved.dinner)}>
            Continuar
          </button>
          <button type="button" className="btn" onClick={nueva}>
            Nueva cena
          </button>
        </m.main>
      );
    }
    return (
      <main className={pantalla}>
        <m.h1 className="text-[2rem] font-bold" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          Yo pago lo mío
        </m.h1>
        <p>¿Dónde cenáis?</p>
        {restError ? (
          <>
            <p className="text-error">No se pudo cargar la lista de restaurantes</p>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setRestError(false);
                setIntento(i => i + 1);
              }}
            >
              Reintentar
            </button>
          </>
        ) : !restaurantes ? (
          <Skeleton filas={2} alto={60} />
        ) : (
          <ul className="grid gap-2.5">
            {restaurantes.map((r, i) => (
              <m.li key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.04 }}>
                <button
                  type="button"
                  className="btn min-h-15 w-full justify-between border-line bg-surface px-4 font-semibold shadow-soft"
                  onClick={() => start(r.id)}
                >
                  {r.nombre}
                  <CaretRight className="text-muted" />
                </button>
              </m.li>
            ))}
          </ul>
        )}
      </main>
    );
  }

  if (!menu) {
    return (
      <main className={pantalla}>
        {error ? (
          <>
            <p className="text-error">{error}</p>
            <button type="button" className="btn btn-primary" onClick={() => resume(dinner)}>
              Reintentar
            </button>
            <button type="button" className="btn" onClick={nueva}>
              Nueva cena
            </button>
          </>
        ) : (
          <Skeleton filas={8} alto={44} />
        )}
      </main>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex min-h-14 items-center gap-2 border-b border-line bg-bg/85 px-4 py-2 backdrop-blur-md">
        <strong className="min-w-0 flex-1 truncate">{menu.nombre}</strong>
        {/* el total cuenta hasta el valor nuevo: se ve el efecto de cada plato */}
        <Euros cents={payStatus(dinner).total} className="text-xl font-bold tracking-tight" />
      </header>

      <AnimatePresence>
        {error && (
          <m.button
            type="button"
            className="btn mx-auto mt-2.5 flex w-[calc(100%-32px)] max-w-mdjustify-between border-error bg-surface text-left text-error"
            onClick={clearError}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, transition: exitFast }}
          >
            <span className="min-w-0 flex-1">{error}</span>
            <X size={18} />
          </m.button>
        )}
      </AnimatePresence>

      <div className="overflow-x-clip">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <m.main
            key={tab}
            custom={dir}
            className="mx-auto max-w-120 px-4 pt-5 pb-28"
            variants={{
              enter: (d: number) => ({ x: d * 28, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d * -28, opacity: 0, transition: exitFast }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {tab === 'gente' && (
              <PeopleTab
                dinner={dinner}
                act={act}
                onPick={id => {
                  setActivePersona(id);
                  irA('carta');
                }}
                onReset={nueva}
              />
            )}
            {tab === 'carta' && (
              <MenuTab
                dinner={dinner}
                menu={menu}
                act={act}
                error={error}
                clearError={clearError}
                activePersona={activePersona}
                onClearPersona={() => setActivePersona(null)}
                onGoPeople={() => irA('gente')}
                ultimas={ultimas}
                setUltimas={setUltimas}
              />
            )}
            {tab === 'resumen' && (
              <SummaryTab
                dinner={dinner}
                menu={menu}
                act={act}
                error={error}
                clearError={clearError}
                onGoMenu={() => irA('carta')}
              />
            )}
            {tab === 'pagar' && <PayTab dinner={dinner} act={act} onGoMenu={() => irA('carta')} />}
          </m.main>
        </AnimatePresence>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        {TABS.map(t => {
          const activa = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-current={activa ? 'page' : undefined}
              onClick={() => irA(t.id)}
              className={`relative flex h-16 flex-col items-center justify-center gap-0.5 text-[0.8rem] transition-colors duration-200 ${activa ? 'font-semibold text-accent' : 'text-muted'}`}
            >
              <span className="relative grid h-8 w-14 place-items-center">
                {/* la pastilla viaja a la pestaña elegida */}
                {activa && <m.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-accent-soft" />}
                <t.icon size={22} weight={activa ? 'fill' : 'regular'} className="relative" />
              </span>
              {t.label}
            </button>
          );
        })}
      </nav>
    </>
  );
}
