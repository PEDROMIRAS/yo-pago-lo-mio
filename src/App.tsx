import { useEffect, useState } from 'react';
import type { RestauranteRef } from './types';
import { useDinner } from './useDinner';
import { loadRestaurants } from './lib/menu';
import { browserStorage, loadSession } from './lib/storage';
import { payStatus } from './lib/calc';
import { formatEuros } from './lib/money';
import { PeopleTab } from './components/PeopleTab';
import { MenuTab } from './components/MenuTab';

type Tab = 'gente' | 'carta' | 'resumen' | 'pagar';
const TABS: { id: Tab; label: string }[] = [
  { id: 'gente', label: 'Gente' },
  { id: 'carta', label: 'Carta' },
  { id: 'resumen', label: 'Resumen' },
  { id: 'pagar', label: 'Pagar' },
];

const hora = (ms: number) => new Date(ms).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

export default function App() {
  const { dinner, menu, error, act, start, resume, reset, clearError } = useDinner();
  const [saved, setSaved] = useState(() => loadSession(browserStorage));
  const [restaurantes, setRestaurantes] = useState<RestauranteRef[] | null>(null);
  const [restError, setRestError] = useState(false);
  const [intento, setIntento] = useState(0);
  const [tab, setTab] = useState<Tab>('gente');
  const [activePersona, setActivePersona] = useState<string | null>(null);

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

  const nombreDe = (id: string) => restaurantes?.find(r => r.id === id)?.nombre ?? id;

  const nueva = () => {
    reset();
    setSaved(null);
    setTab('gente');
    setActivePersona(null);
  };

  if (!dinner) {
    if (saved) {
      const n = saved.dinner.personas.length;
      return (
        <main className="center">
          <p>
            ¿Continuar la cena en <strong>{nombreDe(saved.dinner.restauranteId)}</strong> ({n}{' '}
            {n === 1 ? 'persona' : 'personas'}, guardada a las {hora(saved.guardado)}) o empezar una nueva?
          </p>
          <button type="button" className="primary" onClick={() => resume(saved.dinner)}>
            Continuar
          </button>
          <button type="button" onClick={nueva}>
            Nueva cena
          </button>
        </main>
      );
    }
    return (
      <main className="center">
        <h1>Yo pago lo mío</h1>
        <p>¿Dónde cenáis?</p>
        {restError ? (
          <>
            <p className="error">No se pudo cargar la lista de restaurantes</p>
            <button
              type="button"
              onClick={() => {
                setRestError(false);
                setIntento(i => i + 1);
              }}
            >
              Reintentar
            </button>
          </>
        ) : !restaurantes ? (
          <p className="muted">Cargando…</p>
        ) : (
          <ul className="list">
            {restaurantes.map(r => (
              <li key={r.id}>
                <button type="button" className="wide" onClick={() => start(r.id)}>
                  {r.nombre}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    );
  }

  if (!menu) {
    return (
      <main className="center">
        {error ? (
          <>
            <p className="error">{error}</p>
            <button type="button" className="primary" onClick={() => resume(dinner)}>
              Reintentar
            </button>
            <button type="button" onClick={nueva}>
              Nueva cena
            </button>
          </>
        ) : (
          <p className="muted">Cargando carta…</p>
        )}
      </main>
    );
  }

  return (
    <>
      <header className="header">
        <div className="grow">
          <strong>{menu.nombre}</strong>
          <div>Total {formatEuros(payStatus(dinner).total)}</div>
        </div>
        <button type="button" onClick={() => confirm('¿Borrar esta cena y empezar otra?') && nueva()}>
          Nueva cena
        </button>
      </header>

      {error && (
        <button type="button" className="toast" onClick={clearError}>
          {error} <span aria-hidden="true">✕</span>
        </button>
      )}

      <main className="content">
        {tab === 'gente' && (
          <PeopleTab
            dinner={dinner}
            act={act}
            onPick={id => {
              setActivePersona(id);
              setTab('carta');
            }}
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
            onGoPeople={() => setTab('gente')}
          />
        )}
        {(tab === 'resumen' || tab === 'pagar') && <p className="muted">Próximamente.</p>}
      </main>

      <nav className="tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </>
  );
}
