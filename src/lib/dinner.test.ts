import { expect, test } from 'vitest';
import { createDinner, addPerson, removePerson, addLine, updateLine, removeLine, addPersonToLines, setPago, setModo } from './dinner';

const base = () => addPerson(addPerson(createDinner('padillas'), 'Ana'), 'Bea'); // ids p1, p2

test('addPerson recorta, rechaza vacíos y duplicados, no muta', () => {
  const d0 = createDinner('padillas');
  const d1 = addPerson(d0, '  Jesús ');
  expect(d1.personas).toEqual([{ id: 'p1', nombre: 'Jesús' }]);
  expect(d0.personas).toEqual([]);
  expect(() => addPerson(d1, '   ')).toThrow(/nombre/);
  expect(() => addPerson(d1, 'jesus')).toThrow(/Ya hay/);
});

test('removePerson bloquea si está en un pedido y borra su pago', () => {
  let d = addLine(base(), { producto: 'Morcilla', precio: 650, cantidad: 1, personas: ['p1'] });
  expect(() => removePerson(d, 'p1')).toThrow(/Ana.*pedido/);
  d = removePerson(setPago(d, 'p2', 500), 'p2');
  expect(d.personas.map(p => p.nombre)).toEqual(['Ana']);
  expect(d.pagos).toEqual({});
});

test('addLine valida cantidad y personas', () => {
  const l = { producto: 'Morcilla', precio: 650, cantidad: 1, personas: ['p1'] };
  expect(() => addLine(base(), { ...l, cantidad: 0 })).toThrow(/cantidad/);
  expect(() => addLine(base(), { ...l, cantidad: 1.5 })).toThrow(/cantidad/);
  expect(() => addLine(base(), { ...l, personas: [] })).toThrow(/persona/);
  expect(() => addLine(base(), { ...l, personas: ['p99'] })).toThrow(/persona/);
  expect(addLine(base(), l).lineas[0]).toEqual({ id: 'l3', ...l });
});

test('updateLine, removeLine y addPersonToLines', () => {
  let d = addLine(base(), { producto: 'Patatas', precio: 400, cantidad: 1, personas: ['p1'] });
  d = updateLine(d, 'l3', { cantidad: 2 });
  expect(d.lineas[0].cantidad).toBe(2);
  d = addPersonToLines(addPersonToLines(d, ['l3'], 'p2'), ['l3'], 'p2');
  expect(d.lineas[0].personas).toEqual(['p1', 'p2']);
  expect(() => updateLine(d, 'l3', { personas: [] })).toThrow(/persona/);
  expect(removeLine(d, 'l3').lineas).toEqual([]);
});

test('modo por defecto consumo; setModo lo cambia sin tocar pedido ni pagos', () => {
  const d = setPago(addLine(base(), { producto: 'Caña', precio: 200, cantidad: 2, personas: ['p1'] }), 'p1', 400);
  expect(d.modo).toBe('consumo');
  const e = setModo(d, 'igual');
  expect(e.modo).toBe('igual');
  expect(e.lineas).toEqual(d.lineas);
  expect(e.pagos).toEqual(d.pagos);
});
