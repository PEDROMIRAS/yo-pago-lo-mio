import type { Menu, MenuItem, RestauranteRef } from '../types';

export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Valida el JSON de una carta y pasa los precios de euros a céntimos. */
export function normalizeMenu(json: unknown): Menu {
  if (!isRecord(json) || !Array.isArray(json.carta)) throw new Error('La carta no tiene lista "carta"');
  const nombre = typeof json.nombre === 'string' ? json.nombre : 'Restaurante';
  const carta = json.carta.map((raw: unknown, i: number): MenuItem => {
    if (!isRecord(raw) || typeof raw.nombre !== 'string' || raw.nombre.trim() === '') {
      throw new Error(`El producto ${i + 1} de la carta no tiene nombre`);
    }
    const { nombre, precio, categoria } = raw;
    if (typeof precio !== 'number' || !Number.isFinite(precio) || precio < 0) {
      throw new Error(`"${nombre}" no tiene un precio válido`);
    }
    return {
      categoria: typeof categoria === 'string' && categoria.trim() !== '' ? categoria : 'Otros',
      nombre,
      precio: Math.round(precio * 100),
    };
  });
  return { nombre, carta };
}

export function matchesQuery(item: MenuItem, query: string): boolean {
  const q = normalizeText(query.trim());
  return normalizeText(item.nombre).includes(q) || normalizeText(item.categoria).includes(q);
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
