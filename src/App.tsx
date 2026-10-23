import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { X } from '@phosphor-icons/react';
import { useDinner } from './useDinner';
import { browserStorage, loadSession } from './lib/storage';
import { payStatus } from './lib/calc';
import { exitFast, slide } from './motion';
import { PeopleTab } from './components/PeopleTab';
import { MenuTab } from './components/MenuTab';
import { SummaryTab } from './components/SummaryTab';
import { PayTab } from './components/PayTab';
import { Skeleton } from './components/Skeleton';
import { Euros } from './components/Euros';
import { Entrada } from './components/Entrada';
import { TabBar } from './components/TabBar';
import { ordenTab, type Tab } from './tabs';

export default function App() {
  const { dinner, menu, error, act, start, resume, reset, clearError } = useDinner();
  const [saved, setSaved] = useState(() => loadSession(browserStorage));
  // dir: +1 hacia la derecha de la barra, -1 hacia la izquierda; decide de qué lado entra la pestaña
  const [{ tab, dir }, setNav] = useState<{ tab: Tab; dir: number }>({ tab: 'gente', dir: 1 });
  const [activePersona, setActivePersona] = useState<string | null>(null);
  const [ultimas, setUltimas] = useState<string[]>([]); // última selección del diálogo de la carta

  const irA = (t: Tab) => {
    if (t === tab) return;
    setNav({ tab: t, dir: Math.sign(ordenTab(t) - ordenTab(tab)) });
    window.scrollTo({ top: 0 });
  };

  const nueva = () => {
    reset();
    setSaved(null);
    setNav({ tab: 'gente', dir: 1 });
    setActivePersona(null);
    setUltimas([]);
  };

  if (!dinner) {
    return (
      <Entrada
        saved={saved}
        onContinuar={resume}
        onElegir={id => {
          setSaved(null);
          start(id);
        }}
      />
    );
  }

  if (!menu) {
    return (
      <main className="mx-auto grid max-w-120 gap-3.5 px-4 pt-10 pb-6">
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
          <Skeleton filas={8} alto="h-11" />
        )}
      </main>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex min-h-14 max-w-120 items-center gap-2 px-4 py-2">
          <h1 className="min-w-0 flex-1 truncate font-bold">{menu.nombre}</h1>
          {/* el total cuenta hasta el valor nuevo: se ve el efecto de cada plato */}
          <Euros cents={payStatus(dinner).total} className="text-xl font-bold tracking-tight" />
        </div>
      </header>

      <AnimatePresence>
        {error && (
          <m.button
            type="button"
            className="btn mx-auto mt-2.5 flex w-[calc(100%-32px)] max-w-md justify-between border-error bg-surface text-left text-error"
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
            variants={slide}
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

      <TabBar tab={tab} onChange={irA} />
    </>
  );
}
