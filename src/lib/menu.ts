import type { Menu, MenuItem, RestauranteRef } from '../types';

export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Valida el JSON de una carta y pasa los precios de euros a céntimos. */
export function normalizeMenu(json: unknown): Menu {
  if (!isRecord(json) || !Array.isArray(json.carta)) throw new Error('La carta no tiene lista "carta"');
  const nombre = typeof json.nombre === 'string' ? json.nombre : 'Restaurante';
  const carta = json.carta.map((raw: unknown, i: number): MenuItem => {
    if (!isRecord(raw) || typeof raw.nombre !== 'string' || raw.nombre.trim() === '') {
      throw new Error(`El producto ${i + 1} de la carta no tiene nombre`);
    }
    const { nombre, precio, categoria, descripcion, mitad } = raw;
    if (typeof precio !== 'number' || !Number.isFinite(precio) || precio < 0) {
      throw new Error(`"${nombre}" no tiene un precio válido`);
    }
    if (descripcion !== undefined && typeof descripcion !== 'string') {
      throw new Error(`"${nombre}" tiene una descripción que no es texto`);
    }
    if (mitad !== undefined && typeof mitad !== 'boolean') {
      throw new Error(`"${nombre}": mitad tiene que ser true o false`);
    }
    const texto = descripcion?.trim();
    return {
      categoria: typeof categoria === 'string' && categoria.trim() !== '' ? categoria : 'Otros',
      nombre,
      precio: Math.round(precio * 100),
      ...(texto ? { descripcion: texto } : {}),
      ...(mitad ? { mitad: true } : {}),
    };
  });
  return { nombre, carta };
}

/**
 * Pizza mitad y mitad: se cobra la más cara. El nombre va en orden alfabético para que
 * "Atún + Hawaiana" y "Hawaiana + Atún" sean el mismo producto en el resumen.
 */
export function mitadYMitad(a: MenuItem, b: MenuItem): { producto: string; precio: number; mitades: [string, string] } {
  if (a.nombre === b.nombre) throw new Error('Elige otra pizza para la otra mitad');
  for (const p of [a, b]) if (!p.mitad) throw new Error(`${p.nombre} no se puede pedir por mitad`);
  const [x, y] = [a.nombre, b.nombre].sort((m, n) => m.localeCompare(n, 'es'));
  return { producto: `½ ${x} + ½ ${y}`, precio: Math.max(a.precio, b.precio), mitades: [x, y] };
}

export function matchesQuery(item: MenuItem, query: string): boolean {
  const q = normalizeText(query.trim());
  return [item.nombre, item.categoria, item.descripcion ?? ''].some(t => normalizeText(t).includes(q));
}

async function fetchJson(file: string): Promise<unknown> {
  const res = await fetch(`${import.meta.env.BASE_URL}restaurantes/${file}.json`);
  if (!res.ok) throw new Error('No se pudo cargar la carta');
  // un id inexistente puede volver como index.html con 200 (servidor de Vite, fallback del SW)
  return res.json().catch(() => {
    throw new Error('No se pudo cargar la carta');
  });
}

export async function loadRestaurants(): Promise<RestauranteRef[]> {
  // shortcut: index.json no se valida, lo escribimos nosotros y el test de cartas lo cubre
  return (await fetchJson('index')) as RestauranteRef[];
}

export async function loadMenu(id: string): Promise<Menu> {
  return normalizeMenu(await fetchJson(id));
}

/** Lo que se apunta al pedir un plato: entero, o mitad y mitad con `otraMitad` (nombre de la carta). */
export function pedidoDe(menu: Menu, item: MenuItem, otraMitad?: string): { producto: string; precio: number; mitades?: [string, string] } {
  if (!otraMitad) return { producto: item.nombre, precio: item.precio };
  const otra = menu.carta.find(p => p.nombre === otraMitad);
  if (!otra) throw new Error(`${otraMitad} no está en la carta`);
  return mitadYMitad(item, otra);
}

/** Para la hoja de pedido: el precio de `item` y las pizzas con las que combinarlo; undefined si no hay ninguna. */
export function mitadesDe(menu: Menu, item: MenuItem): { precio: number; opciones: MenuItem[] } | undefined {
  const opciones = item.mitad ? menu.carta.filter(p => p.mitad && p.nombre !== item.nombre) : [];
  return opciones.length ? { precio: item.precio, opciones } : undefined;
}
