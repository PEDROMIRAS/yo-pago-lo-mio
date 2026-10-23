import { expect, test } from 'vitest';
import { loadSession, saveSession, clearSession } from './storage';
import { createDinner } from './dinner';

const fake = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
};

test('guarda y recupera', () => {
  const s = fake();
  saveSession(s, createDinner('padillas'), 123);
  expect(loadSession(s)).toEqual({ dinner: createDinner('padillas'), guardado: 123 });
  clearSession(s);
  expect(loadSession(s)).toBeNull();
});

test('ignora JSON corrupto, otra versión o forma rara', () => {
  const s = fake();
  s.m.set('cuentas-cena', '{nope');
  expect(loadSession(s)).toBeNull();
  s.m.set('cuentas-cena', JSON.stringify({ version: 0, guardado: 1, dinner: createDinner('x') }));
  expect(loadSession(s)).toBeNull();
  s.m.set('cuentas-cena', JSON.stringify({ version: 1, guardado: 1, dinner: { personas: 'x' } }));
  expect(loadSession(s)).toBeNull();
});

test('storage que lanza no rompe nada', () => {
  const boom = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); }, removeItem: () => { throw new Error('x'); } };
  expect(loadSession(boom)).toBeNull();
  expect(() => saveSession(boom, createDinner('x'))).not.toThrow();
  expect(() => clearSession(boom)).not.toThrow();
  expect(loadSession(null)).toBeNull();
  expect(() => saveSession(null, createDinner('x'))).not.toThrow();
  expect(() => clearSession(null)).not.toThrow();
});
