import { useCallback, useRef, useState } from 'react';
import type { Dinner, Menu } from './types';
import { createDinner } from './lib/dinner';
import { loadMenu } from './lib/menu';
import { browserStorage, clearSession, saveSession } from './lib/storage';

export type Act = (fn: (d: Dinner) => Dinner) => boolean;

const SIN_GUARDAR = 'Este navegador no deja guardar la cena: no cierres la pestaña hasta terminar.';

export function useDinner() {
  const [dinner, setDinnerState] = useState<Dinner | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [error, setError] = useState<string | null>(null);
  // el ref deja que dos `act` seguidos en el mismo evento vean el estado del anterior
  const ref = useRef<Dinner | null>(null);
  // el aviso de "no se guarda" sale una vez, no en cada cambio
  const avisado = useRef(false);

  const setDinner = (d: Dinner | null) => {
    ref.current = d;
    setDinnerState(d);
  };

  const act: Act = useCallback(fn => {
    if (!ref.current) return false;
    try {
      const next = fn(ref.current);
      setDinner(next);
      const guardado = saveSession(browserStorage, next);
      setError(guardado || avisado.current ? null : SIN_GUARDAR);
      if (!guardado) avisado.current = true;
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, []);

  const resume = useCallback(async (d: Dinner) => {
    setDinner(d);
    setMenu(null);
    setError(null);
    try {
      setMenu(await loadMenu(d.restauranteId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const start = useCallback(async (restauranteId: string) => {
    const d = createDinner(restauranteId);
    // si no se puede guardar, avisa la primera acción (aquí taparía un posible error de la carta)
    saveSession(browserStorage, d);
    await resume(d);
  }, [resume]);

  const reset = useCallback(() => {
    clearSession(browserStorage);
    setDinner(null);
    setMenu(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { dinner, menu, error, act, start, resume, reset, clearError };
}
