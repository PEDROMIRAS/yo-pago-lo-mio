# Yo pago lo mío — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA en React que reparte la cuenta de una cena de grupo a partir de la carta del restaurante (JSON) y dice quién paga a quién.

**Architecture:** Toda la lógica vive en funciones puras e inmutables en `src/lib/` (dinero en céntimos, carta, operaciones sobre la cena, cálculos, guardado), testeadas con Vitest. La UI es un único `App` con cuatro pestañas (Gente, Carta, Resumen, Pagar) que llama a esas funciones a través del hook `useDinner`, que además persiste en `localStorage`. Las cartas son JSON en `public/restaurantes/`, se leen con `fetch` y el service worker las precachea para uso sin conexión. En v1 las cartas nuevas las transcribe Claude Code a JSON a partir de las fotos que pasa el usuario; el escaneo desde la app queda para v2 (`docs/superpowers/plans/2026-10-22-cuentas-cena-v2-escaneo.md`).

**Tech Stack:** Vite + React + TypeScript (las versiones que instale `create-vite`), Vitest, `vite-plugin-pwa`, `@vite-pwa/assets-generator` (iconos), GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-22-cuentas-cena-requisitos.md`

## Global Constraints

- Sin backend ni servicios externos; sin dependencias de runtime aparte de `react` y `react-dom`.
- Dinero siempre en **céntimos enteros** dentro de `src/`; solo el JSON de la carta usa euros con decimales.
- Textos de UI en español; formato de importes `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })`.
- Mobile-first: usable a 360 px de ancho sin scroll horizontal.
- Debe funcionar offline tras la primera visita, cartas incluidas.
- Clave de `localStorage`: `cuentas-cena`; versión del formato guardado: `1`.
- Los errores de validación de `src/lib/dinner.ts` son `Error` con mensaje en español listo para mostrar al usuario.

## Review Focus

1. **Lo puesto no suma el total** → Pagar muestra “Faltan X €” / “Sobran X €” y ninguna transferencia (test en Task 4: `payStatus`; comprobación manual en Task 8).
2. **Céntimos que no dividen** (10 € entre 3) → cuotas 3,34 / 3,33 / 3,33 y la suma de cuotas = total exacto, también en los bloques (tests en Task 1 y Task 4).
3. **Guardado corrupto o de otra versión, o `localStorage` que lanza** (modo privado, o cookies bloqueadas: ahí lanza solo con *leer* el global `localStorage`) → la app arranca limpia y no revienta (tests en Task 3; nadie toca el global salvo `browserStorage`).
4. **Sin cobertura en el restaurante** → tras una visita, la app y todas las cartas cargan en modo avión (comprobación manual en Task 9).
5. **Teclado español con coma** (`20,50`) en el campo “ha puesto” → se interpreta como 20,50 € (test en Task 1).

---

## File Structure

```
index.html                     entrada Vite
vite.config.ts                 base + PWA + Vitest
public/logo.svg                icono fuente (generador → PNGs)
public/restaurantes/index.json lista de restaurantes
public/restaurantes/padillas.json
src/main.tsx                   monta <App/>, registra SW
src/types.ts                   tipos de dominio
src/lib/money.ts               parseEuros, formatEuros, splitCents
src/lib/menu.ts                normalizeMenu, matchesQuery, loadMenu, loadRestaurants
src/lib/dinner.ts              operaciones puras sobre Dinner
src/lib/calc.ts                cuotas, totales, bloques, saldos, transferencias
src/lib/storage.ts             loadSession, saveSession, clearSession
src/useDinner.ts               estado React + persistencia + errores
src/App.tsx                    arranque (recuperar/elegir restaurante) + pestañas
src/components/PeopleTab.tsx
src/components/MenuTab.tsx
src/components/LineDialog.tsx  formulario cantidad + personas (crear/editar)
src/components/SummaryTab.tsx
src/components/PayTab.tsx
src/components/ModeToggle.tsx  selector Por consumo / A partes iguales
src/styles.css
.github/workflows/deploy.yml
README.md
```

Tipos compartidos (`src/types.ts`), usados por todas las tareas:

```ts
export type Persona = { id: string; nombre: string };
export type Linea = {
  id: string;
  producto: string;
  precio: number;      // céntimos por unidad (copiado de la carta al añadir)
  cantidad: number;    // entero >= 1
  personas: string[];  // ids, sin repetidos, al menos uno
};
export type Dinner = {
  restauranteId: string;
  personas: Persona[];
  lineas: Linea[];
  pagos: Record<string, number>; // personaId -> céntimos puestos
  modo: Modo;                    // cómo se reparte la cuenta
  nextId: number;                // contador para ids 'p1', 'l2'...
};
export type Modo = 'consumo' | 'igual'; // por lo que pidió cada uno | total entre todos
export type MenuItem = { categoria: string; nombre: string; precio: number }; // precio en céntimos
export type Menu = { nombre: string; carta: MenuItem[] };
export type RestauranteRef = { id: string; nombre: string };
```

---

### Task 1: Proyecto base + dinero

**Files:**
- Create: proyecto Vite (`package.json`, `index.html`, `tsconfig*.json`, `vite.config.ts`, `src/main.tsx`), `src/types.ts`, `src/lib/money.ts`
- Test: `src/lib/money.test.ts`

**Interfaces:**
- Produces: `parseEuros(text: string): number | null`, `formatEuros(cents: number): string`, `splitCents(total: number, n: number): number[]`; los tipos de `src/types.ts` (arriba).

- [x] **Step 1: Crear el proyecto**

```bash
npm create vite@latest . -- --template react-ts
npm install
npm install -D vitest
```

El repo ya existe y tiene `docs/`, `CLAUDE.md` y `.gitignore`. Si `create-vite` pregunta por la carpeta no vacía, elige **Ignore files and continue**. Si sobrescribe `.gitignore`, vuelve a añadirle `.env.local` y `dev-dist/`.

Borra el contenido de demo (`src/App.css`, `src/assets/`, el contador de `App.tsx`). Añade a `package.json` el script `"test": "vitest run"`. Crea `src/types.ts` con los tipos de arriba.

- [x] **Step 2: Escribir los tests que fallan**

```ts
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
```

- [x] **Step 3: Ejecutar y ver que falla**

Run: `npx vitest run src/lib/money.test.ts`
Expected: FAIL — no se puede resolver `./money`.

- [x] **Step 4: Implementar `src/lib/money.ts`**

`parseEuros`: quitar espacios y `€`, vacío → 0, validar con `/^\d+([.,]\d{1,2})?$/`, convertir con aritmética entera de las dos partes (no `parseFloat * 100`). `splitCents`: `base = Math.floor(total / n)`, los primeros `total % n` reciben `base + 1`.

- [x] **Step 5: Ejecutar y ver que pasa**

Run: `npx vitest run src/lib/money.test.ts`
Expected: PASS (4 tests)

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: proyecto Vite+React y utilidades de dinero"
```

---

### Task 2: Carta y restaurantes

**Files:**
- Create: `src/lib/menu.ts`, `public/restaurantes/index.json`, `public/restaurantes/padillas.json`
- Test: `src/lib/menu.test.ts`

**Interfaces:**
- Consumes: `Menu`, `MenuItem`, `RestauranteRef`.
- Produces: `normalizeText(s: string): string` (minúsculas, sin tildes), `normalizeMenu(json: unknown): Menu` (lanza `Error` legible), `matchesQuery(item: MenuItem, query: string): boolean`, `loadRestaurants(): Promise<RestauranteRef[]>`, `loadMenu(id: string): Promise<Menu>`.

- [x] **Step 1: Escribir los tests que fallan**

```ts
import { expect, test } from 'vitest';
import { normalizeMenu, matchesQuery } from './menu';

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
```

`import.meta.glob` (de Vite, funciona en Vitest) en vez de `node:fs`, para no necesitar los tipos de Node en `tsconfig.app.json`.

- [x] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/lib/menu.test.ts`
Expected: FAIL — no se puede resolver `./menu`.

- [x] **Step 3: Implementar `src/lib/menu.ts`**

Precio a céntimos con `Math.round(precio * 100)`. Normalizar texto con `.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()`. `loadRestaurants`/`loadMenu` hacen `fetch(import.meta.env.BASE_URL + 'restaurantes/…json')`, lanzan `Error('No se pudo cargar la carta')` si `!res.ok`, y `loadMenu` pasa el resultado por `normalizeMenu`. Los fetch no se testean aquí.

- [x] **Step 4: Crear los JSON**

`public/restaurantes/index.json` y `public/restaurantes/padillas.json` ya existen con la carta real de Merendero Padilla (78 productos): no los toques. El último test del Step 1 comprueba que cargan, y como `npm test` corre en el despliegue, una carta nueva con una errata (precio como texto, id sin fichero) para el build en vez de fallar en la mesa.

- [x] **Step 5: Ejecutar y ver que pasa**

Run: `npx vitest run src/lib/menu.test.ts`
Expected: PASS (5 tests)

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: carga y búsqueda de cartas en JSON"
```

---

### Task 3: Operaciones sobre la cena + guardado

**Files:**
- Create: `src/lib/dinner.ts`, `src/lib/storage.ts`
- Test: `src/lib/dinner.test.ts`, `src/lib/storage.test.ts`

**Interfaces:**
- Consumes: `Dinner`, `Persona`, `Linea`.
- Produces (todas puras, devuelven un `Dinner` nuevo sin mutar la entrada, lanzan `Error` en español):
  - `createDinner(restauranteId: string): Dinner` — `modo: 'consumo'`, `nextId: 1`.
  - `setModo(d: Dinner, modo: Modo): Dinner`
  - `addPerson(d: Dinner, nombre: string): Dinner` — recorta; vacío → “Escribe un nombre”; duplicado sin distinguir mayúsculas/tildes → “Ya hay alguien llamado X”.
  - `removePerson(d: Dinner, id: string): Dinner` — si está en alguna línea → “X está en algún pedido”; borra también su pago.
  - `addLine(d: Dinner, l: Omit<Linea, 'id'>): Dinner`
  - `updateLine(d: Dinner, id: string, patch: Partial<Pick<Linea, 'cantidad' | 'personas'>>): Dinner`
  - `removeLine(d: Dinner, id: string): Dinner`
  - `addPersonToLines(d: Dinner, lineIds: string[], personaId: string): Dinner` — añade al final de cada línea si no estaba.
  - `setPago(d: Dinner, personaId: string, cents: number): Dinner` — 0 borra la entrada.
  - Validación de línea compartida por add/update: cantidad entera ≥ 1 (“La cantidad tiene que ser 1 o más”), al menos una persona y todas existentes (“Elige al menos una persona”).
  - `browserStorage: Storage | null` — `localStorage`, o `null` si leerlo lanza (con las cookies bloqueadas, *acceder* al global ya lanza SecurityError, antes de cualquier `try` de las funciones). Es el único sitio que toca el global; el resto del código usa `browserStorage`.
  - `loadSession(storage: Pick<Storage, 'getItem'> | null): { dinner: Dinner; guardado: number } | null` — `null` como storage → `null`.
  - `saveSession(storage: Pick<Storage, 'setItem'> | null, dinner: Dinner, now?: number): void` — guarda `{ version: 1, guardado, dinner }` en la clave `cuentas-cena`; con `null` no hace nada.
  - `clearSession(storage: Pick<Storage, 'removeItem'> | null): void`

- [x] **Step 1: Escribir los tests que fallan (`dinner.test.ts`)**

```ts
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
```

- [x] **Step 2: Escribir los tests que fallan (`storage.test.ts`)**

```ts
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
```

- [x] **Step 3: Ejecutar y ver que fallan**

Run: `npx vitest run src/lib/dinner.test.ts src/lib/storage.test.ts`
Expected: FAIL — no se pueden resolver los módulos.

- [x] **Step 4: Implementar `src/lib/dinner.ts` y `src/lib/storage.ts`**

Ids: `'p' + nextId` para personas y `'l' + nextId` para líneas, incrementando `nextId` (empieza en 1). La comparación de nombres duplicados usa `normalizeText` de `menu.ts`. `loadSession` exige `version === 1`, `typeof dinner.restauranteId === 'string'`, `modo` en `'consumo' | 'igual'` y que `personas` y `lineas` sean arrays; cualquier otra cosa → `null`. Todo envuelto en `try/catch`. `browserStorage = (() => { try { return localStorage; } catch { return null; } })()`.

- [x] **Step 5: Ejecutar y ver que pasan**

Run: `npx vitest run src/lib/dinner.test.ts src/lib/storage.test.ts`
Expected: PASS (8 tests)

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: operaciones de la cena y guardado en localStorage"
```

---

### Task 4: Cálculos

**Files:**
- Create: `src/lib/calc.ts`
- Test: `src/lib/calc.test.ts`

**Interfaces:**
- Consumes: `Dinner`, `Linea`, `splitCents`, operaciones de `dinner.ts` (solo en tests).
- Produces:
  - `shares(d: Dinner): Record<string, number>` — cuota de cada persona, todas presentes. Depende de `d.modo`:
    - `'consumo'`: suma de `breakdown(d)[id]` (0 si no tiene líneas).
    - `'igual'`: `splitCents(total, d.personas.length)` en el orden de `d.personas`; sin personas → `{}`.
  - `breakdown(d: Dinner): Record<string, { linea: Linea; parte: number }[]>` — lo que ha consumido cada persona, **siempre por consumo** (no mira `modo`); todas las personas presentes, `[]` si no tiene líneas. Cada línea se reparte con `splitCents(precio * cantidad, personas.length)` en el orden de `linea.personas`.
  - `itemTotals(d: Dinner): { producto: string; cantidad: number; total: number }[]` — agrupa por nombre de producto, en orden de primera aparición.
  - `type Block = { personas: string[]; lineas: Linea[]; total: number; cuotas: Record<string, number> }`
  - `blocks(d: Dinner): Block[]` — agrupa líneas por el **conjunto** de personas (clave = ids ordenados según `d.personas`); `personas` en ese orden; `cuotas` = suma de los repartos por línea (así cuadra con `shares`); orden de primera aparición.
  - `payStatus(d: Dinner): { total: number; pagado: number; diferencia: number }` — `diferencia = pagado - total`.
  - `balances(d: Dinner): Record<string, number>` — `pagos[id] ?? 0` menos `shares(d)[id]` (respeta el modo).
  - `type Transfer = { de: string; a: string; importe: number }`
  - `settle(bal: Record<string, number>, orden: string[]): Transfer[]` — algoritmo abajo.

Algoritmo de `settle` (greedy, ≤ n−1 pagos): separar deudores (saldo < 0, como importe positivo) y acreedores (saldo > 0); ordenar cada lista por importe descendente, empate por posición en `orden`; con dos punteros, transferir `min(deuda, crédito)` del primer deudor al primer acreedor, restar, avanzar el que llegue a 0.

- [x] **Step 1: Escribir los tests que fallan**

```ts
import { expect, test } from 'vitest';
import { createDinner, addPerson, addLine, setPago, setModo } from './dinner';
import { shares, breakdown, itemTotals, blocks, payStatus, balances, settle } from './calc';

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
```

- [x] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/lib/calc.test.ts`
Expected: FAIL — no se puede resolver `./calc`.

- [x] **Step 3: Implementar `src/lib/calc.ts`** con las firmas y el algoritmo de arriba.

- [x] **Step 4: Ejecutar toda la suite**

Run: `npm test`
Expected: PASS — todos los tests de `src/lib/` (28).

- [x] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: cálculo de cuotas, bloques y transferencias"
```

---

### Task 5: Arranque, estado y pestaña Gente

**Files:**
- Create: `src/useDinner.ts`, `src/components/PeopleTab.tsx`, `src/styles.css`, `.claude/launch.json`
- Modify: `src/App.tsx`, `src/main.tsx`

**Interfaces:**
- Consumes: todo `src/lib/`.
- Produces:
  - `useDinner(): { dinner: Dinner | null; menu: Menu | null; error: string | null; act: (fn: (d: Dinner) => Dinner) => boolean; start: (restauranteId: string) => Promise<void>; resume: (d: Dinner) => Promise<void>; reset: () => void; clearError: () => void }`
    - `act` aplica `fn` al estado actual; si lanza, guarda `e.message` en `error`, no cambia nada y devuelve `false`; si no, actualiza, llama a `saveSession(browserStorage, …)` y devuelve `true`. Devuelve un booleano porque `error` es estado de React y no se ve actualizado hasta el siguiente render: quien llama a `act` (p. ej. `LineDialog`) necesita saber en el mismo momento si ha ido bien.
    - `start` crea la cena y carga su carta; `resume` carga la carta de una cena guardada; `reset` hace `clearSession` y vuelve a `dinner = null`.
  - `App` controla `tab: 'gente' | 'carta' | 'resumen' | 'pagar'` y `activePersona: string | null` (para “añadir desde la persona”, la usa Task 6).
  - `PeopleTab({ dinner, act, onPick }: { dinner: Dinner; act: …; onPick: (personaId: string) => void })`

- [ ] **Step 1: Implementar el arranque en `App.tsx`**

Al montar: `loadSession(browserStorage)`. Si hay sesión → pantalla “¿Continuar la cena en {nombre del restaurante} ({n} personas, guardada a las HH:MM) o empezar una nueva?” con botones **Continuar** (`resume`) y **Nueva cena** (`reset`). Si no → lista de `loadRestaurants()`; tocar uno → `start(id)`. Si falla la carga de carta → mensaje del error y botones **Reintentar** y **Nueva cena** (`reset`): si la cena guardada apunta a una carta que ya no existe (id cambiado o borrado), reintentar falla siempre y sin **Nueva cena** no habría salida.

Con cena activa: cabecera con el nombre del restaurante, el total (`payStatus(dinner).total`) y un botón **Nueva cena** (pide `confirm('¿Borrar esta cena y empezar otra?')`). Barra inferior fija con las 4 pestañas. `error` se muestra como aviso que se cierra al tocarlo.

- [ ] **Step 2: Implementar `PeopleTab`**

Input + botón **Añadir** (también con Enter) → `act(d => addPerson(d, nombre))` y vaciar el input solo si no hubo error. Lista de personas, cada una con su cuota (`shares`) y un botón ✕ → `act(d => removePerson(d, id))`. Tocar el nombre → `onPick(id)`, que en `App` pone `activePersona` y cambia a la pestaña Carta.

- [ ] **Step 3: Estilos base en `src/styles.css`**

Mobile-first, una columna, zonas táctiles ≥ 44 px, barra de pestañas fija abajo, contenido con `padding-bottom` para que no lo tape.

- [ ] **Step 4: Verificar en el navegador**

Crea `.claude/launch.json` con una configuración `dev` (`npm run dev`, puerto 5173) y arráncala. Comprueba, a 375 px de ancho:
- Sin sesión aparece la lista de restaurantes con “Merendero Padilla”; al tocarlo se abre la pestaña Gente.
- Añadir “Ana”, “Bea”; añadir “ana” muestra “Ya hay alguien llamado ana”; añadir vacío muestra “Escribe un nombre”.
- Recargar la página → aparece “¿Continuar la cena…?” con 2 personas; **Continuar** las recupera.
- **Nueva cena** → confirmación → vuelve a la lista de restaurantes.
- En DevTools → Application → Local Storage, cambiar el `restauranteId` guardado a `no-existe` y recargar → **Continuar** muestra el error con **Reintentar** y **Nueva cena**; **Nueva cena** vuelve a la lista.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: arranque con recuperación de cena y pestaña Gente"
```

---

### Task 6: Pestaña Carta + formulario de línea

**Files:**
- Create: `src/components/MenuTab.tsx`, `src/components/LineDialog.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useDinner().act`, `matchesQuery`, `addLine`, `updateLine`, `formatEuros`, `activePersona` de `App`.
- Produces:
  - `LineDialog(props: { open: boolean; titulo: string; personas: Persona[]; inicial: { cantidad: number; personas: string[] }; onAccept: (v: { cantidad: number; personas: string[] }) => void; onClose: () => void })` — usa `<dialog>` nativo (`showModal()` en un efecto). Stepper − / número / + (mínimo 1), una casilla por persona, botón **Todos** que marca/desmarca todo, **Aceptar** y **Cancelar**. No valida: los errores llegan de `dinner.ts` vía `act`. Quien lo usa cierra el diálogo solo si `act` devuelve `true` (`onAccept={v => { if (act(d => addLine(d, …))) cerrar(); }}`); no se puede mirar `error` justo después, porque aún vale lo de antes del render. Lo reutilizan Task 6 y Task 7.
  - `MenuTab({ dinner, menu, act, activePersona, onClearPersona })`

- [ ] **Step 1: Implementar `LineDialog`** con las props de arriba.

- [ ] **Step 2: Implementar `MenuTab`**

Buscador arriba (filtra con `matchesQuery`); productos agrupados por `categoria` en el orden del JSON, con nombre y precio. Si `activePersona` está puesto, una franja “Añadiendo para **Ana** ✕” (✕ → `onClearPersona`). Tocar un producto abre `LineDialog` con `inicial = { cantidad: 1, personas: activePersona ? [activePersona] : [] }`; **Aceptar** → `act(d => addLine(d, { producto: item.nombre, precio: item.precio, cantidad, personas }))`. Sin personas en la cena, la pestaña muestra “Añade primero a la gente” con un botón que lleva a Gente.

- [ ] **Step 3: Verificar en el navegador**

- Buscar “ALBONDIGAS” encuentra Albóndigas en salsa, y “postres” muestra los 14 postres.
- Morcillas → cantidad 3 → marcar Ana y Bea → Aceptar → la cabecera muestra un total de 4,80 €.
- Aceptar sin marcar a nadie → aviso “Elige al menos una persona” y el diálogo sigue abierto.
- En Gente, tocar “Ana” → Carta con “Añadiendo para Ana”; Caña → el diálogo sale con solo Ana marcada y cantidad 1.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: carta con buscador y formulario de reparto"
```

---

### Task 7: Pestaña Resumen

**Files:**
- Create: `src/components/SummaryTab.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `itemTotals`, `blocks`, `shares`, `breakdown`, `payStatus`, `LineDialog`, `updateLine`, `removeLine`, `addPersonToLines`, `addLine`, `setModo`, `formatEuros`.
- Produces:
  - `ModeToggle({ modo, onChange }: { modo: Modo; onChange: (m: Modo) => void })` en `src/components/ModeToggle.tsx` — dos botones tipo segmento, “Por consumo” / “A partes iguales”, con `aria-pressed`. Lo usan Task 7 y Task 8 con `onChange={m => act(d => setModo(d, m))}`.
  - `SummaryTab({ dinner, menu, act })`

- [ ] **Step 1: Implementar `SummaryTab`**

Tres secciones:
1. **Lo pedido**: `itemTotals` → “Morcilla ×3 · 19,50 €”.
2. **Bloques**: por cada `Block`, cabecera “Ana + Bea · 23,50 € · 11,75 € cada uno” (si las cuotas del bloque difieren, “11,75–11,76 € cada uno”), y sus líneas (“3 × Morcilla · 19,50 €”). Por línea: **Editar** (`LineDialog` con su cantidad y personas → `updateLine`) y **Borrar** (`removeLine`). Por bloque: **+ Persona** (un `<select>` con las personas que no están en el bloque → `addPersonToLines(d, block.lineas.map(l => l.id), id)`) y **+ Producto** (un `<select>` con la carta → `LineDialog` con las personas del bloque ya marcadas → `addLine`).
3. **Por persona**: `ModeToggle` arriba. Por cada persona, su nombre y lo que debe (`shares`).
   - En modo `consumo`, debajo su desglose con `breakdown`: “3 × Morcilla (entre 2) · 9,75 €”; “(entre N)” solo si la línea es compartida. Si no tiene nada, “No ha pedido nada”.
   - En modo `igual`, el texto “Total {total} entre {n} personas” y la misma cuota para todos, sin desglose.
   - Al final, el total de la cuenta.

Sin líneas: “Aún no habéis pedido nada”.

- [ ] **Step 2: Verificar en el navegador**

Con Ana, Bea, Carlos: Morcillas ×3 (Ana, Bea), Patatas chips ×1 (Bea, Ana), Ensalada ×1 (Carlos); total 11,10 €.
- Hay 2 bloques: “Ana + Bea” con Morcillas y Patatas chips en el mismo bloque, y “Carlos”.
- **+ Persona** → Carlos en el bloque Ana + Bea → pasa a ser “Ana + Bea + Carlos”, con las mismas líneas.
- **Editar** las morcillas a cantidad 4 → se actualizan el total del bloque, “Lo pedido” y el total de la cabecera.
- Borrar a Ana en Gente → aviso “Ana está en algún pedido”.
- Antes de los cambios anteriores, en “Por persona” y en modo Por consumo: Ana 3,45 €, Bea 3,45 €, Carlos 4,20 €, y Ana ve “3 × Morcillas (entre 2) · 2,40 €” y “1 × Patatas chips (entre 2) · 1,05 €”. Cambiar a A partes iguales → los tres deben 3,70 €; recargar → sigue en A partes iguales.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: resumen por producto, bloques de reparto y personas"
```

---

### Task 8: Pestaña Pagar

**Files:**
- Create: `src/components/PayTab.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `parseEuros`, `formatEuros`, `setPago`, `setModo`, `ModeToggle`, `payStatus`, `balances`, `settle`, `shares`.
- Produces: `PayTab({ dinner, act })`

- [ ] **Step 1: Implementar `PayTab`**

`ModeToggle` arriba (el mismo modo que en Resumen). Por persona: nombre, “le toca X €” (`shares`, ya según el modo) y un `<input inputMode="decimal">` “ha puesto”. El texto se guarda en estado local del componente mientras se escribe; en `onBlur` se pasa por `parseEuros`: `null` → borde rojo y “Importe no válido” sin tocar la cena; si no, `act(d => setPago(d, id, cents))`. Debajo, con `payStatus`:
- `diferencia < 0` → “Faltan {formatEuros(-diferencia)}”.
- `diferencia > 0` → “Sobran {formatEuros(diferencia)}”.
- `diferencia === 0` y `total > 0` → lista de `settle(balances(d), d.personas.map(p => p.id))` como “Bea → Ana · 13,75 €”. Si sale vacía, “Cuentas cuadradas, nadie debe nada”.

- [ ] **Step 2: Verificar en el navegador**

Con la cena del Task 7 (antes de editar), total 11,10 €:
- Ana pone `5` → “Faltan 6,10 €” y ninguna transferencia.
- Carlos pone `6,10` → aparecen “Bea → Carlos · 1,90 €” y “Bea → Ana · 1,55 €”.
- Escribir `abc` → “Importe no válido” y el estado anterior se mantiene.
- Cambiar a A partes iguales → “le toca” pasa a 3,70 € para los tres y las transferencias se recalculan; los importes puestos no cambian.
- Recargar → **Continuar** → los importes y el modo siguen ahí.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: pantalla de pago con transferencias"
```

---

### Task 9: PWA, despliegue y README

**Files:**
- Create: `public/logo.svg`, iconos generados en `public/`, `.github/workflows/deploy.yml`, `README.md`
- Modify: `vite.config.ts`, `src/main.tsx`, `index.html`, `package.json`

**Interfaces:**
- Consumes: el build completo.
- Produces: la app instalable y publicada.

- [ ] **Step 1: Iconos**

Crea `public/logo.svg` (un icono simple, p. ej. un plato o un ticket sobre fondo de color) y genera los PNG:

```bash
npm install -D vite-plugin-pwa @vite-pwa/assets-generator
npx pwa-assets-generator --preset minimal-2023 public/logo.svg
```

- [ ] **Step 2: Configurar `vite.config.ts`**

- `base: process.env.BASE_PATH ?? '/'`.
- `VitePWA({ registerType: 'autoUpdate', manifest: { name: 'Yo pago lo mío', short_name: 'Pago lo mío', lang: 'es', display: 'standalone', theme_color, background_color, icons: [192, 512 y maskable generados] }, workbox: { globPatterns: ['**/*.{js,css,html,svg,png,json}'] } })` — `json` en el patrón para que las cartas queden precacheadas.
- **No** añadas un bloque `test` a `vite.config.ts`: `node` ya es el entorno por defecto de Vitest, y la clave `test` no existe en el tipo de configuración de Vite, así que `tsc -b` (que corre en `npm run build`) falla.
- En `src/main.tsx`: `import { registerSW } from 'virtual:pwa-register'; registerSW({ immediate: true });`. Para que `tsc` encuentre ese módulo, añade `/// <reference types="vite-plugin-pwa/client" />` en `src/vite-env.d.ts` (o `"vite-plugin-pwa/client"` en `types` de `tsconfig.app.json`, según lo que haya generado `create-vite`).

- [ ] **Step 3: Verificar offline**

Run: `npm run build && npx vite preview --port 4173`
Expected: build sin errores. En el navegador: cargar `http://localhost:4173`, comprobar en DevTools → Application que el service worker está activo y que `restaurantes/padillas.json` está en la caché; activar Offline y recargar → la app abre, se puede empezar una cena en Merendero Padilla y la carta aparece.

- [ ] **Step 4: Workflow de GitHub Pages**

`.github/workflows/deploy.yml`: en push a `main`, `actions/checkout@v4`, `actions/setup-node@v4` (node 22, cache npm), `npm ci`, `npm test`, `npm run build` con `BASE_PATH: /${{ github.event.repository.name }}/`, `actions/upload-pages-artifact@v3` con `path: dist`, y un job `deploy` con un paso `id: deployment` que usa `actions/deploy-pages@v4` (`permissions: pages: write, id-token: write`, `environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }`). Antes de escribirlo, comprueba en la plantilla oficial de GitHub Pages para estáticos cuáles son las versiones mayores actuales de estas actions y usa esas.

- [ ] **Step 5: README**

En español, cortito: qué es; `npm install`, `npm run dev`, `npm test`; **cómo añadir un restaurante** (crear `public/restaurantes/<id>.json` con el formato y añadir una línea a `index.json`); cómo publicar (subir a GitHub → Settings → Pages → Source: GitHub Actions); cómo instalarla en el móvil (“Añadir a pantalla de inicio”). Si la carta de Merendero Padilla sigue siendo de ejemplo, avisarlo aquí.

- [ ] **Step 6: Suite completa y commit**

Run: `npm test && npm run build`
Expected: todos los tests en PASS y el build sin errores.

```bash
git add -A
git commit -m "feat: PWA offline y despliegue en GitHub Pages"
```
