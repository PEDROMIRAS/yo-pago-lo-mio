import { expect, test } from 'vitest';
import { createDinner, addPerson, addLine, setPago, setModo } from './dinner';
import { shares, breakdown, itemTotals, blocks, payStatus, balances, settle, textoCuentas } from './calc';

// Ana p1, Bea p2, Carlos p3, Dani p4
const cena = () => {
  let d = createDinner('padillas');
  for (const n of ['Ana', 'Bea', 'Carlos', 'Dani']) d = addPerson(d, n);
  d = addLine(d, { producto: 'Morcilla', precio: 650, cantidad: 3, personas: ['p1', 'p2'] });
  d = addLine(d, { producto: 'Patatas', precio: 400, cantidad: 1, personas: ['p2', 'p1'] });
  d = addLine(d, { producto: 'Caña', precio: 200, cantidad: 4, personas: ['p1', 'p2', 'p3', 'p4'] });
  d = addLine(d, { producto: 'Ensalada', precio: 900, cantidad: 1, personas: ['p3'] });
  return d;
};

test('shares por consumo suma partes por persona', () => {
  expect(shares(cena())).toEqual({ p1: 1375, p2: 1375, p3: 1100, p4: 200 });
});

test('shares a partes iguales divide el total entre todos', () => {
  expect(shares(setModo(cena(), 'igual'))).toEqual({ p1: 1013, p2: 1013, p3: 1012, p4: 1012 });
  expect(shares(setModo(createDinner('x'), 'igual'))).toEqual({});
});

test('breakdown desglosa lo de cada uno aunque el modo sea igual', () => {
  const b = breakdown(setModo(cena(), 'igual'));
  expect(b.p1.map(x => [x.linea.producto, x.parte])).toEqual([['Morcilla', 975], ['Patatas', 200], ['Caña', 200]]);
  expect(b.p4.map(x => [x.linea.producto, x.parte])).toEqual([['Caña', 200]]);
});

test('balances y settle respetan el modo', () => {
  const d = setModo(setPago(cena(), 'p1', 4050), 'igual');
  expect(settle(balances(d), ['p1', 'p2', 'p3', 'p4'])).toEqual([
    { de: 'p2', a: 'p1', importe: 1013 },
    { de: 'p3', a: 'p1', importe: 1012 },
    { de: 'p4', a: 'p1', importe: 1012 },
  ]);
});

test('itemTotals agrega por producto', () => {
  const d = addLine(cena(), { producto: 'Morcilla', precio: 650, cantidad: 1, personas: ['p4'] });
  expect(itemTotals(d)[0]).toEqual({ producto: 'Morcilla', cantidad: 4, total: 2600 });
  expect(itemTotals(d).map(i => i.producto)).toEqual(['Morcilla', 'Patatas', 'Caña', 'Ensalada']);
});

test('blocks agrupa por conjunto de personas, sin importar el orden', () => {
  const b = blocks(cena());
  expect(b.map(x => [x.personas, x.lineas.map(l => l.producto), x.total])).toEqual([
    [['p1', 'p2'], ['Morcilla', 'Patatas'], 2350],
    [['p1', 'p2', 'p3', 'p4'], ['Caña'], 800],
    [['p3'], ['Ensalada'], 900],
  ]);
  expect(b[0].cuotas).toEqual({ p1: 1175, p2: 1175 });
});

test('los céntimos sobrantes cuadran en shares y en blocks', () => {
  let d = createDinner('x');
  for (const n of ['A', 'B', 'C']) d = addPerson(d, n);
  d = addLine(d, { producto: 'Tabla', precio: 1000, cantidad: 1, personas: ['p1', 'p2', 'p3'] });
  expect(shares(d)).toEqual({ p1: 334, p2: 333, p3: 333 });
  expect(Object.values(blocks(d)[0].cuotas).reduce((a, b) => a + b)).toBe(1000);
});

test('payStatus detecta faltas y sobras', () => {
  expect(payStatus(cena())).toEqual({ total: 4050, pagado: 0, diferencia: -4050 });
  expect(payStatus(setPago(cena(), 'p1', 5000)).diferencia).toBe(950);
});

test('settle: paga uno todo', () => {
  const d = setPago(cena(), 'p1', 4050);
  expect(settle(balances(d), ['p1', 'p2', 'p3', 'p4'])).toEqual([
    { de: 'p2', a: 'p1', importe: 1375 },
    { de: 'p3', a: 'p1', importe: 1100 },
    { de: 'p4', a: 'p1', importe: 200 },
  ]);
});

test('settle: pagan dos', () => {
  const d = setPago(setPago(cena(), 'p1', 2000), 'p3', 2050);
  expect(settle(balances(d), ['p1', 'p2', 'p3', 'p4'])).toEqual([
    { de: 'p2', a: 'p3', importe: 950 },
    { de: 'p2', a: 'p1', importe: 425 },
    { de: 'p4', a: 'p1', importe: 200 },
  ]);
});

test('persona sin pedidos que puso dinero recibe la devolución', () => {
  let d = addPerson(cena(), 'Eva');
  const eva = d.personas.at(-1)!.id;
  d = setPago(setPago(d, 'p1', 4000), eva, 50);
  expect(shares(d)[eva]).toBe(0);
  expect(balances(d)[eva]).toBe(50);
});

test('textoCuentas resume la cena para compartirla', () => {
  const d = setPago(setPago(cena(), 'p1', 2000), 'p3', 2050);
  expect(textoCuentas(d, 'Merendero Padilla').replace(/\s/g, ' ')).toBe(
    ['Cena en Merendero Padilla: 40,50 € por consumo', 'Bea paga a Carlos 9,50 €', 'Bea paga a Ana 4,25 €', 'Dani paga a Ana 2,00 €'].join(' '),
  );
  const igual = setModo(setPago(cena(), 'p1', 4050), 'igual');
  expect(textoCuentas(igual, 'X').split('\n')[0].replace(/\s/g, ' ')).toBe('Cena en X: 40,50 € a partes iguales');
});

test('textoCuentas sin nada que pagar entre ellos', () => {
  let d = createDinner('x');
  d = addPerson(d, 'Ana');
  d = addLine(d, { producto: 'Caña', precio: 200, cantidad: 1, personas: ['p1'] });
  d = setPago(d, 'p1', 200);
  expect(textoCuentas(d, 'X').split('\n')[1]).toBe('Cuentas cuadradas, nadie debe nada');
});
