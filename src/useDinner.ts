import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dinner, Menu } from './types';
import { createDinner } from './lib/dinner';
import { loadMenu } from './lib/menu';
import { browserStorage, clearSession, saveSession } from './lib/storage';

/** Aplica un cambio a la cena; con `aviso`, el cambio se puede deshacer unos segundos. */
export type Act = (fn: (d: Dinner) => Dinner, aviso?: string) => boolean;
export type Deshacer = { n: number; texto: string; antes: Dinner };

const SIN_GUARDAR = 'Este navegador no deja guardar la cena: no cierres la pestaña hasta terminar.';
const DESHACER_MS = 5000;

export function useDinner() {
  const [dinner, setDinnerState] = useState<Dinner | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deshacer, setDeshacer] = useState<Deshacer | null>(null);
  // el ref deja que dos `act` seguidos en el mismo evento vean el estado del anterior
  const ref = useRef<Dinner | null>(null);
  // el aviso de "no se guarda" sale una vez, no en cada cambio
  const avisado = useRef(false);

  const setDinner = (d: Dinner | null) => {
    ref.current = d;
    setDinnerState(d);
  };

  const guardar = (d: Dinner) => {
    const guardado = saveSession(browserStorage, d);
    setError(guardado || avisado.current ? null : SIN_GUARDAR);
    if (!guardado) avisado.current = true;
  };

  const act: Act = useCallback((fn, aviso) => {
    const antes = ref.current;
    if (!antes) return false;
    try {
      const next = fn(antes);
      setDinner(next);
      guardar(next);
      // cualquier otro cambio anula el deshacer anterior: volver atrás pisaría ese cambio
      setDeshacer(prev => (aviso ? { n: (prev?.n ?? 0) + 1, texto: aviso, antes } : null));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, []);

  const undo = useCallback(() => {
    if (!deshacer) return;
    setDinner(deshacer.antes);
    guardar(deshacer.antes);
    setDeshacer(null);
  }, [deshacer]);

  useEffect(() => {
    if (!deshacer) return;
    const t = setTimeout(() => setDeshacer(null), DESHACER_MS);
    return () => clearTimeout(t);
  }, [deshacer]);

  const resume = useCallback(async (d: Dinner) => {
    setDinner(d);
    setMenu(null);
    setError(null);
    setDeshacer(null);
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
    setDeshacer(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { dinner, menu, error, deshacer, act, undo, start, resume, reset, clearError };
}
