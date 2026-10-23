import type { Dinner, Linea } from '../types';
import { formatEuros, splitCents } from './money';

export type Block = { personas: string[]; lineas: Linea[]; total: number; cuotas: Record<string, number> };
type Transfer = { de: string; a: string; importe: number };

const lineTotal = (l: Linea) => l.precio * l.cantidad;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Parte de cada persona en una línea; los céntimos sobrantes van a las primeras de `linea.personas`. */
function lineParts(l: Linea): [string, number][] {
  const partes = splitCents(lineTotal(l), l.personas.length);
  return l.personas.map((id, i) => [id, partes[i]]);
}

export function breakdown(d: Dinner): Record<string, { linea: Linea; parte: number }[]> {
  const b: Record<string, { linea: Linea; parte: number }[]> = Object.fromEntries(d.personas.map(p => [p.id, []]));
  for (const linea of d.lineas) {
    for (const [id, parte] of lineParts(linea)) b[id]?.push({ linea, parte });
  }
  return b;
}

export function shares(d: Dinner): Record<string, number> {
  if (d.modo === 'igual') {
    const cuotas = splitCents(payStatus(d).total, d.personas.length);
    return Object.fromEntries(d.personas.map((p, i) => [p.id, cuotas[i]]));
  }
  return Object.fromEntries(Object.entries(breakdown(d)).map(([id, xs]) => [id, sum(xs.map(x => x.parte))]));
}

export function itemTotals(d: Dinner): { producto: string; cantidad: number; total: number }[] {
  const m = new Map<string, { producto: string; cantidad: number; total: number }>();
  for (const l of d.lineas) {
    const it = m.get(l.producto) ?? { producto: l.producto, cantidad: 0, total: 0 };
    m.set(l.producto, { ...it, cantidad: it.cantidad + l.cantidad, total: it.total + lineTotal(l) });
  }
  return [...m.values()];
}

export function blocks(d: Dinner): Block[] {
  const orden = new Map(d.personas.map((p, i) => [p.id, i]));
  const m = new Map<string, Block>();
  for (const l of d.lineas) {
    const personas = [...l.personas].sort((a, b) => (orden.get(a) ?? 0) - (orden.get(b) ?? 0));
    const key = personas.join(',');
    const b = m.get(key) ?? { personas, lineas: [], total: 0, cuotas: Object.fromEntries(personas.map(id => [id, 0])) };
    for (const [id, parte] of lineParts(l)) b.cuotas[id] += parte;
    m.set(key, { ...b, lineas: [...b.lineas, l], total: b.total + lineTotal(l) });
  }
  return [...m.values()];
}

export function payStatus(d: Dinner): { total: number; pagado: number; diferencia: number } {
  const total = sum(d.lineas.map(lineTotal));
  const pagado = sum(Object.values(d.pagos));
  return { total, pagado, diferencia: pagado - total };
}

export function balances(d: Dinner): Record<string, number> {
  const s = shares(d);
  return Object.fromEntries(d.personas.map(p => [p.id, (d.pagos[p.id] ?? 0) - (s[p.id] ?? 0)]));
}

/** Greedy: el que más debe paga al que más tiene que recibir; como mucho n-1 transferencias. */
export function settle(bal: Record<string, number>, orden: string[]): Transfer[] {
  // sort es estable, así que el empate queda por posición en `orden`
  const byAmount = (xs: { id: string; importe: number }[]) => xs.sort((a, b) => b.importe - a.importe);
  const deudores = byAmount(orden.filter(id => (bal[id] ?? 0) < 0).map(id => ({ id, importe: -bal[id] })));
  const acreedores = byAmount(orden.filter(id => (bal[id] ?? 0) > 0).map(id => ({ id, importe: bal[id] })));
  const out: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < deudores.length && j < acreedores.length) {
    const importe = Math.min(deudores[i].importe, acreedores[j].importe);
    out.push({ de: deudores[i].id, a: acreedores[j].id, importe });
    deudores[i].importe -= importe;
    acreedores[j].importe -= importe;
    if (deudores[i].importe === 0) i++;
    if (acreedores[j].importe === 0) j++;
  }
  return out;
}

/** Resumen para mandar al grupo; tiene sentido cuando lo puesto cuadra con el total (diferencia 0). */
export function textoCuentas(d: Dinner, restaurante: string): string {
  const nombre = (id: string) => d.personas.find(p => p.id === id)?.nombre ?? '?';
  const modo = d.modo === 'igual' ? 'a partes iguales' : 'por consumo';
  const pagos = settle(balances(d), d.personas.map(p => p.id));
  return [
    `Cena en ${restaurante}: ${formatEuros(payStatus(d).total)} ${modo}`,
    ...(pagos.length
      ? pagos.map(t => `${nombre(t.de)} paga a ${nombre(t.a)} ${formatEuros(t.importe)}`)
      : ['Cuentas cuadradas, nadie debe nada']),
  ].join('\n');
}
