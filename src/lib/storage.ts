import type { Dinner } from '../types';

const KEY = 'cuentas-cena';
const VERSION = 1;

// Con las cookies bloqueadas, solo leer el global `localStorage` ya lanza SecurityError.
export const browserStorage: Storage | null = (() => {
  try {
    return localStorage;
  } catch {
    return null;
  }
})();

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function isDinner(v: unknown): v is Dinner {
  return (
    isRecord(v) &&
    typeof v.restauranteId === 'string' &&
    (v.modo === 'consumo' || v.modo === 'igual') &&
    Array.isArray(v.personas) &&
    Array.isArray(v.lineas) &&
    isRecord(v.pagos) &&
    typeof v.nextId === 'number'
  );
}

export function loadSession(storage: Pick<Storage, 'getItem'> | null): { dinner: Dinner; guardado: number } | null {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data) || data.version !== VERSION || typeof data.guardado !== 'number' || !isDinner(data.dinner)) {
      return null;
    }
    return { dinner: data.dinner, guardado: data.guardado };
  } catch {
    return null;
  }
}

export function saveSession(storage: Pick<Storage, 'setItem'> | null, dinner: Dinner, now = Date.now()): void {
  try {
    storage?.setItem(KEY, JSON.stringify({ version: VERSION, guardado: now, dinner }));
  } catch {
    // lleno o bloqueado: seguimos sin guardar
  }
}

export function clearSession(storage: Pick<Storage, 'removeItem'> | null): void {
  try {
    storage?.removeItem(KEY);
  } catch {
    // bloqueado: nada que borrar
  }
}
