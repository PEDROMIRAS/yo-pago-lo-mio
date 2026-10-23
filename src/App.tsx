import { useEffect, useState } from 'react';
import type { RestauranteRef } from './types';
import { useDinner } from './useDinner';
import { loadRestaurants } from './lib/menu';
import { browserStorage, loadSession } from './lib/storage';
import { payStatus } from './lib/calc';
import { formatEuros } from './lib/money';
import { PeopleTab } from './components/PeopleTab';
import { MenuTab } from './components/MenuTab';
import { SummaryTab } from './components/SummaryTab';
import { PayTab } from './components/PayTab';
import { Icon, type IconName } from './components/Icon';
import { Skeleton } from './components/Skeleton';

type Tab = 'gente' | 'carta' | 'resumen' | 'pagar';
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'gente', label: 'Gente', icon: 'users' },
  { id: 'carta', label: 'Carta', icon: 'list' },
  { id: 'resumen', label: 'Resumen', icon: 'receipt' },
  { id: 'pagar', label: 'Pagar', icon: 'wallet' },
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

  const nombreDe = (id: string) => restaurantes?.find(r => r.id === id)?.nombre ?? id;

  const nueva = () => {
    reset();
    setSaved(null);
    setTab('gente');
    setActivePersona(null);
    setUltimas([]);
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
          <Skeleton filas={2} alto={56} />
        ) : (
          <ul className="list">
            {restaurantes.map(r => (
              <li key={r.id}>
                <button type="button" className="wide row pick" onClick={() => start(r.id)}>
                  <span className="grow">{r.nombre}</span>
                  <span className="chevron">
                    <Icon name="chevron" />
                  </span>
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
          <Skeleton filas={8} alto={44} />
        )}
      </main>
    );
  }

  return (
    <>
      <header className="header">
        <strong className="grow">{menu.nombre}</strong>
        <span className="header-total">{formatEuros(payStatus(dinner).total)}</span>
      </header>

      {error && (
        <button type="button" className="toast" onClick={clearError}>
          <span className="grow">{error}</span>
          <Icon name="x" size={18} />
        </button>
      )}

      {/* key: cada pestaña entra con su animación */}
      <main className="content" key={tab}>
        {tab === 'gente' && (
          <PeopleTab
            dinner={dinner}
            act={act}
            onPick={id => {
              setActivePersona(id);
              setTab('carta');
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
            onGoPeople={() => setTab('gente')}
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
            onGoMenu={() => setTab('carta')}
          />
        )}
        {tab === 'pagar' && <PayTab dinner={dinner} act={act} onGoMenu={() => setTab('carta')} />}
      </main>

      <nav className="tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            <Icon name={t.icon} size={22} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
