import { afterEach, expect, test, vi } from 'vitest';
import { normalizeMenu, matchesQuery, loadMenu, mitadYMitad, pedidoDe } from './menu';

test('normalizeMenu pasa precios a céntimos sin errores de float', () => {
  const m = normalizeMenu({ nombre: 'X', carta: [{ categoria: 'Raciones', nombre: 'Morcilla', precio: 6.1 }] });
  expect(m.carta[0]).toEqual({ categoria: 'Raciones', nombre: 'Morcilla', precio: 610 });
});

test('normalizeMenu pone categoría Otros por defecto', () => {
  expect(normalizeMenu({ nombre: 'X', carta: [{ nombre: 'Caña', precio: 2 }] }).carta[0].categoria).toBe('Otros');
});

test('normalizeMenu da errores legibles', () => {
  expect(() => normalizeMenu({})).toThrow(/carta/);
  expect(() => normalizeMenu({ nombre: 'X', carta: [{ nombre: 'Caña' }] })).toThrow(/Caña.*precio/);
  expect(() => normalizeMenu({ nombre: 'X', carta: [{ nombre: 'Caña', precio: -1 }] })).toThrow(/Caña.*precio/);
});

test('matchesQuery ignora mayúsculas y tildes y busca también en categoría', () => {
  const item = { categoria: 'Raciones', nombre: 'Albóndigas', precio: 800 };
  expect(matchesQuery(item, 'ALBONDI')).toBe(true);
  expect(matchesQuery(item, 'racion')).toBe(true);
  expect(matchesQuery(item, '')).toBe(true);
  expect(matchesQuery(item, 'morcilla')).toBe(false);
});

test('todas las cartas de index.json existen y cargan', () => {
  const files = import.meta.glob<unknown>('../../public/restaurantes/*.json', { eager: true, import: 'default' });
  const index = files['../../public/restaurantes/index.json'] as { id: string }[];
  expect(index.length).toBeGreaterThan(0);
  for (const { id } of index) {
    const json = files[`../../public/restaurantes/${id}.json`];
    expect(json, `falta ${id}.json`).toBeDefined();
    normalizeMenu(json);
  }
});

afterEach(() => vi.unstubAllGlobals());

test('loadMenu da un error legible si llega HTML en vez de la carta (id inexistente)', async () => {
  // el servidor de Vite y el service worker devuelven index.html con 200
  vi.stubGlobal('fetch', async () => new Response('<!doctype html><html></html>', { status: 200 }));
  await expect(loadMenu('no-existe')).rejects.toThrow('No se pudo cargar la carta');
});

test('loadMenu da el mismo error si la respuesta es 404', async () => {
  vi.stubGlobal('fetch', async () => new Response('', { status: 404 }));
  await expect(loadMenu('no-existe')).rejects.toThrow('No se pudo cargar la carta');
});

test('normalizeMenu guarda la descripción si la hay y la omite si no', () => {
  const m = normalizeMenu({
    nombre: 'X',
    carta: [
      { nombre: 'Hawaiana', precio: 12, descripcion: '  Tomate, piña, queso ' },
      { nombre: 'Caña', precio: 2, descripcion: '   ' },
      { nombre: 'Agua', precio: 1 },
    ],
  });
  expect(m.carta[0].descripcion).toBe('Tomate, piña, queso');
  expect('descripcion' in m.carta[1]).toBe(false);
  expect('descripcion' in m.carta[2]).toBe(false);
  expect(() => normalizeMenu({ nombre: 'X', carta: [{ nombre: 'Y', precio: 1, descripcion: 3 }] })).toThrow(/Y.*descripción/);
});

test('matchesQuery busca también por ingrediente', () => {
  const item = { categoria: 'Clásicas', nombre: 'Hawaiana', precio: 1200, descripcion: 'Tomate, jamón York, piña natural' };
  expect(matchesQuery(item, 'PIÑA')).toBe(true);
  expect(matchesQuery(item, 'anchoas')).toBe(false);
});

test('normalizeMenu marca los platos que se pueden pedir por mitades', () => {
  const m = normalizeMenu({ nombre: 'X', carta: [{ nombre: 'Atún', precio: 12, mitad: true }, { nombre: 'Burrata', precio: 16 }] });
  expect(m.carta[0].mitad).toBe(true);
  expect('mitad' in m.carta[1]).toBe(false);
  expect(() => normalizeMenu({ nombre: 'X', carta: [{ nombre: 'Y', precio: 1, mitad: 'sí' }] })).toThrow(/Y.*mitad/);
});

test('mitadYMitad cobra la más cara y nombra igual en cualquier orden', () => {
  const hawaiana = { categoria: 'Clásicas', nombre: 'Hawaiana', precio: 1200, mitad: true };
  const atun = { categoria: 'Del mar', nombre: 'Atún', precio: 1250, mitad: true };
  expect(mitadYMitad(hawaiana, atun)).toEqual({ producto: '½ Atún + ½ Hawaiana', precio: 1250, mitades: ['Atún', 'Hawaiana'] });
  expect(mitadYMitad(atun, hawaiana)).toEqual(mitadYMitad(hawaiana, atun));
});

test('mitadYMitad rechaza la misma pizza y las que no admiten mitades', () => {
  const hawaiana = { categoria: 'Clásicas', nombre: 'Hawaiana', precio: 1200, mitad: true };
  const burrata = { categoria: 'Especiales', nombre: 'Burrata', precio: 1600 };
  expect(() => mitadYMitad(hawaiana, hawaiana)).toThrow(/otra pizza/);
  expect(() => mitadYMitad(hawaiana, burrata)).toThrow(/Burrata.*mitad/);
});

test('pedidoDe da la pizza entera o la mitad y mitad buscando la otra en la carta', () => {
  const carta = {
    nombre: 'X',
    carta: [
      { categoria: 'A', nombre: 'Hawaiana', precio: 1200, mitad: true },
      { categoria: 'A', nombre: 'Atún', precio: 1250, mitad: true },
    ],
  };
  expect(pedidoDe(carta, carta.carta[0])).toEqual({ producto: 'Hawaiana', precio: 1200 });
  expect(pedidoDe(carta, carta.carta[0], 'Atún')).toEqual({ producto: '½ Atún + ½ Hawaiana', precio: 1250, mitades: ['Atún', 'Hawaiana'] });
  expect(() => pedidoDe(carta, carta.carta[0], 'Kebab')).toThrow(/Kebab/);
});
