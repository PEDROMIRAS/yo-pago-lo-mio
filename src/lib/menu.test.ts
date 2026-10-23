import { afterEach, expect, test, vi } from 'vitest';
import { normalizeMenu, matchesQuery, loadMenu } from './menu';

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
