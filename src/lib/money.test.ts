import { describe, expect, test } from 'vitest';
import { parseEuros, formatEuros, splitCents } from './money';

describe('parseEuros', () => {
  test('acepta coma, punto, símbolo y vacío', () => {
    expect(parseEuros('20')).toBe(2000);
    expect(parseEuros('20,5')).toBe(2050);
    expect(parseEuros('20.50')).toBe(2050);
    expect(parseEuros(' 7,05 €')).toBe(705);
    expect(parseEuros('')).toBe(0);
  });
  test('rechaza basura, negativos y más de 2 decimales', () => {
    expect(parseEuros('abc')).toBeNull();
    expect(parseEuros('-5')).toBeNull();
    expect(parseEuros('1,234')).toBeNull();
  });
});

test('formatEuros usa formato español', () => {
  expect(formatEuros(2050).replace(/\s/g, ' ')).toBe('20,50 €');
});

test('splitCents reparte el resto céntimo a céntimo desde el primero', () => {
  expect(splitCents(1000, 3)).toEqual([334, 333, 333]);
  expect(splitCents(900, 3)).toEqual([300, 300, 300]);
  expect(splitCents(1, 4)).toEqual([1, 0, 0, 0]);
});
