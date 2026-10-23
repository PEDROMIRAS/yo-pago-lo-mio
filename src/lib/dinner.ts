import type { Dinner, Linea, Modo } from '../types';
import { normalizeText } from './menu';
import { payStatus } from './calc';

export function createDinner(restauranteId: string): Dinner {
  return { restauranteId, personas: [], lineas: [], pagos: {}, modo: 'consumo', nextId: 1 };
}

export function setModo(d: Dinner, modo: Modo): Dinner {
  return { ...d, modo };
}

export function addPerson(d: Dinner, nombre: string): Dinner {
  const limpio = nombre.trim();
  if (limpio === '') throw new Error('Escribe un nombre');
  const clave = normalizeText(limpio);
  const repe = d.personas.find(p => normalizeText(p.nombre) === clave);
  if (repe) throw new Error(`Ya hay alguien llamado ${repe.nombre}`);
  return { ...d, personas: [...d.personas, { id: `p${d.nextId}`, nombre: limpio }], nextId: d.nextId + 1 };
}

export function removePerson(d: Dinner, id: string): Dinner {
  const persona = d.personas.find(p => p.id === id);
  if (persona && d.lineas.some(l => l.personas.includes(id))) {
    throw new Error(`${persona.nombre} está en algún pedido`);
  }
  const { [id]: _, ...pagos } = d.pagos;
  return { ...d, personas: d.personas.filter(p => p.id !== id), pagos };
}

function checkLine(d: Dinner, l: Pick<Linea, 'cantidad' | 'personas'>): void {
  if (!Number.isInteger(l.cantidad) || l.cantidad < 1) throw new Error('La cantidad tiene que ser 1 o más');
  const ids = new Set(d.personas.map(p => p.id));
  if (l.personas.length === 0 || !l.personas.every(p => ids.has(p))) throw new Error('Elige al menos una persona');
}

/**
 * Al marcar gente en el formulario de pedido, cada persona suma uno a la cantidad y desmarcarla lo resta.
 * La primera ya cuenta en el 1 inicial, y nunca baja de 1; lo ajustado a mano con +/- se conserva.
 */
export const cantidadAlMarcar = (cantidad: number, antes: number, ahora: number) =>
  Math.max(1, cantidad + Math.max(1, ahora) - Math.max(1, antes));

const mismoGrupo = (a: string[], b: string[]) => a.length === b.length && a.every(id => b.includes(id));

/** Si ese grupo ya tiene el mismo plato (y al mismo precio), se suma a su cantidad en vez de crear otra línea. */
export function addLine(d: Dinner, l: Omit<Linea, 'id'>): Dinner {
  checkLine(d, l);
  const personas = [...new Set(l.personas)];
  const igual = d.lineas.find(x => x.producto === l.producto && x.precio === l.precio && mismoGrupo(x.personas, personas));
  if (igual) return { ...d, lineas: d.lineas.map(x => (x === igual ? { ...x, cantidad: x.cantidad + l.cantidad } : x)) };
  const linea: Linea = { id: `l${d.nextId}`, ...l, personas };
  return { ...d, lineas: [...d.lineas, linea], nextId: d.nextId + 1 };
}

export function updateLine(d: Dinner, id: string, patch: Partial<Pick<Linea, 'cantidad' | 'personas'>>): Dinner {
  return {
    ...d,
    lineas: d.lineas.map(l => {
      if (l.id !== id) return l;
      const nueva = { ...l, ...patch, personas: [...new Set(patch.personas ?? l.personas)] };
      checkLine(d, nueva);
      return nueva;
    }),
  };
}

export function removeLine(d: Dinner, id: string): Dinner {
  return { ...d, lineas: d.lineas.filter(l => l.id !== id) };
}

export function addPersonToLines(d: Dinner, lineIds: string[], personaId: string): Dinner {
  if (!d.personas.some(p => p.id === personaId)) throw new Error('Elige al menos una persona');
  return {
    ...d,
    lineas: d.lineas.map(l =>
      lineIds.includes(l.id) && !l.personas.includes(personaId) ? { ...l, personas: [...l.personas, personaId] } : l,
    ),
  };
}

export function setPago(d: Dinner, personaId: string, cents: number): Dinner {
  const { [personaId]: _, ...pagos } = d.pagos;
  return { ...d, pagos: cents === 0 ? pagos : { ...pagos, [personaId]: cents } };
}

/** Una persona paga la cuenta entera: el total es suyo y lo que pusieron las demás se borra. */
export function pagaTodo(d: Dinner, personaId: string): Dinner {
  if (!d.personas.some(p => p.id === personaId)) throw new Error('Elige al menos una persona');
  return setPago({ ...d, pagos: {} }, personaId, payStatus(d).total);
}

export type Deshacer = { n: number; texto: string; antes: Dinner };

/**
 * Deshacer pendiente tras un cambio: con `aviso`, se puede volver a `antes`. Cualquier otro
 * cambio lo anula, porque volver atrás pisaría ese cambio (p. ej. un pago recién apuntado).
 */
export function trasCambio(prev: Deshacer | null, antes: Dinner, aviso?: string): Deshacer | null {
  return aviso ? { n: (prev?.n ?? 0) + 1, texto: aviso, antes } : null;
}
