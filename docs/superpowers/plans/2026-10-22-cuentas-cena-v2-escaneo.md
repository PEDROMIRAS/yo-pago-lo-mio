# Yo pago lo mío v2: escanear cartas (plan de implementación)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Escanear la carta de un restaurante con la cámara y tenerla en la app en un minuto.

**Architecture:** Una Supabase Edge Function (`leer-carta`) guarda la clave de la API y pasa las fotos a Claude Haiku 5.5, que devuelve la carta en JSON. La app la revisa con el usuario y la guarda en `localStorage`; desde ahí funciona igual que una carta del repo, también sin conexión.

**Tech Stack:** lo de v1, más Supabase Edge Functions (Deno), `npm:@anthropic-ai/sdk`, `npm:zod` y el modelo `claude-haiku-5-5`.

**Spec:** `docs/superpowers/specs/2026-10-22-cuentas-cena-requisitos.md` (sección “v2: escanear una carta”). **Requiere v1 terminada** (`docs/superpowers/plans/2026-10-22-cuentas-cena.md`): usa sus tipos, `parseEuros`, `normalizeMenu`, `loadMenu`, `loadRestaurants` y `App`.

## Global Constraints

- Todas las de v1 siguen vigentes, salvo que ahora hay un servicio externo: la función `leer-carta`, que solo usa el escaneo. Todo lo demás funciona sin ella.
- La app llama a la función con `fetch`, sin `supabase-js`.
- La clave de Anthropic vive solo en los secretos de Supabase (`ANTHROPIC_API_KEY`), nunca en el repo ni en el build. Los secretos los mete el usuario, no el agente.
- Modelo de IA: `claude-haiku-5-5` (el más barato; lo pidió el usuario). No cambiarlo sin preguntar.
- El coste va a la cuenta de la API del usuario (crédito de prepago); el código del grupo (`CODIGO_GRUPO`) impide que terceros lo gasten.

## Review Focus

1. **El escaneo falla** (sin conexión, código del grupo mal, foto ilegible) → mensaje claro en español, las fotos no se pierden y se puede reintentar (tests en Task 2 y Task 3).
2. **La IA devuelve un precio raro o un nombre vacío** → la revisión lo señala con el número de fila y no deja guardar (test en Task 1).
3. **Sin cobertura después de escanear** → la carta escaneada sigue cargando en modo avión (comprobación manual en Task 3).
4. **Una cena guardada apunta a una carta escaneada que se ha borrado** → mensaje “Esa carta escaneada ya no está en este móvil” en vez de una pantalla rota (test en Task 1).
5. **Fotos enormes desde la cámara** → se reducen a 1600 px antes de enviarse, y la función rechaza más de 8 MB (test en Task 2).

## File Structure

```
src/lib/customMenus.ts         cartas escaneadas guardadas en el móvil
src/lib/scan.ts                reducir fotos + llamar a leer-carta
src/components/ScanScreen.tsx  fotos → revisión → guardar
supabase/functions/leer-carta/index.ts      Edge Function (Deno)
supabase/functions/leer-carta/validate.ts   validación de la petición (pura)
supabase/functions/leer-carta/validate.test.ts
.env.example                   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

---

### Task 1: Cartas escaneadas guardadas en el móvil

**Files:**
- Create: `src/lib/customMenus.ts`
- Modify: `src/lib/menu.ts` (`loadRestaurants`, `loadMenu`)
- Test: `src/lib/customMenus.test.ts`

**Interfaces:**
- Consumes: `Menu`, `parseEuros`, `normalizeMenu`.
- Produces:
  - `type MenuRow = { categoria: string; nombre: string; precio: string }` (precio tal cual se escribe, `'8,50'`).
  - `menuFromRows(nombre: string, rows: MenuRow[]): Menu` — recorta los textos, categoría vacía → `'Otros'`, precio con `parseEuros`. Errores: “Pon un nombre al restaurante”, “La carta está vacía”, “Fila N: falta el nombre”, “Fila N: precio no válido” (N empieza en 1).
  - `menuToJson(menu: Menu): string` — JSON con 2 espacios en el formato del repo (precio en euros).
  - `loadCustomMenus(storage: Pick<Storage, 'getItem'>): Record<string, Menu>` — clave `cuentas-cartas`; `{}` si falta, está corrupto o el storage lanza.
  - `saveCustomMenu(storage: Pick<Storage, 'getItem' | 'setItem'>, menu: Menu, now?: number): string` — id `'propia-' + now`.
  - `deleteCustomMenu(storage: Pick<Storage, 'getItem' | 'setItem'>, id: string): void`
  - `menu.ts`: `loadRestaurants(storage = localStorage)` devuelve los de `index.json` seguidos de los escaneados (`{ id, nombre: menu.nombre + ' (escaneada)' }`); `loadMenu(id, storage = localStorage)` para ids `propia-…` lee de `loadCustomMenus` sin hacer fetch, y si no la encuentra lanza “Esa carta escaneada ya no está en este móvil”.

- [ ] **Step 1: Escribir los tests que fallan**

```ts
import { expect, test } from 'vitest';
import { menuFromRows, menuToJson, loadCustomMenus, saveCustomMenu, deleteCustomMenu } from './customMenus';
import { normalizeMenu, loadMenu } from './menu';

const fake = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};
const cristales = { nombre: 'Los Cristales', carta: [{ categoria: 'Raciones', nombre: 'Croquetas', precio: 850 }] };

test('menuFromRows recorta, pone Otros y pasa a céntimos', () => {
  expect(menuFromRows(' Los Cristales ', [
    { categoria: 'Raciones', nombre: 'Croquetas', precio: '8,50' },
    { categoria: '', nombre: ' Caña ', precio: '2' },
  ])).toEqual({ nombre: 'Los Cristales', carta: [
    { categoria: 'Raciones', nombre: 'Croquetas', precio: 850 },
    { categoria: 'Otros', nombre: 'Caña', precio: 200 },
  ] });
});

test('menuFromRows da errores con número de fila', () => {
  const ok = { categoria: '', nombre: 'Caña', precio: '2' };
  expect(() => menuFromRows('', [ok])).toThrow(/nombre al restaurante/);
  expect(() => menuFromRows('X', [])).toThrow(/vacía/);
  expect(() => menuFromRows('X', [ok, { ...ok, precio: 'dos' }])).toThrow(/Fila 2.*precio/);
  expect(() => menuFromRows('X', [{ ...ok, nombre: '  ' }])).toThrow(/Fila 1.*nombre/);
});

test('menuToJson vuelve al formato del repo y normalizeMenu lo acepta', () => {
  const json = JSON.parse(menuToJson(cristales));
  expect(json).toEqual({ nombre: 'Los Cristales', carta: [{ categoria: 'Raciones', nombre: 'Croquetas', precio: 8.5 }] });
  expect(normalizeMenu(json)).toEqual(cristales);
});

test('guardar, listar, cargar y borrar cartas propias', async () => {
  const s = fake();
  const id = saveCustomMenu(s, cristales, 42);
  expect(id).toBe('propia-42');
  expect(loadCustomMenus(s)).toEqual({ 'propia-42': cristales });
  expect(await loadMenu('propia-42', s)).toEqual(cristales);
  deleteCustomMenu(s, id);
  expect(loadCustomMenus(s)).toEqual({});
  await expect(loadMenu('propia-42', s)).rejects.toThrow(/ya no está/);
});

test('loadCustomMenus ignora basura y storage que lanza', () => {
  const s = fake();
  s.m.set('cuentas-cartas', '{nope');
  expect(loadCustomMenus(s)).toEqual({});
  expect(loadCustomMenus({ getItem: () => { throw new Error('x'); } })).toEqual({});
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/lib/customMenus.test.ts`
Expected: FAIL — no se puede resolver `./customMenus`.

- [ ] **Step 3: Implementar `src/lib/customMenus.ts` y adaptar `loadRestaurants`/`loadMenu` en `src/lib/menu.ts`** con las firmas de arriba. Los usos actuales (`loadRestaurants()`, `loadMenu(id)`) siguen funcionando gracias al valor por defecto.

- [ ] **Step 4: Ejecutar toda la suite**

Run: `npm test`
Expected: PASS (32 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: cartas escaneadas guardadas en el móvil"
```

---

### Task 2: Edge Function `leer-carta`

**Files:**
- Create: `supabase/config.toml` (con `supabase init`), `supabase/functions/leer-carta/index.ts`, `supabase/functions/leer-carta/validate.ts`, `supabase/functions/leer-carta/deno.json`
- Test: `supabase/functions/leer-carta/validate.test.ts`

**Interfaces:**
- Produces el contrato HTTP que consume Task 3:
  - `POST {SUPABASE_URL}/functions/v1/leer-carta` con cabeceras `Authorization: Bearer <anon key>`, `x-codigo: <código del grupo>`, `Content-Type: application/json` y body `{ "imagenes": ["<base64 JPEG sin prefijo data:>", …] }`.
  - `200` → `{ "nombre": string, "carta": [{ "categoria": string, "nombre": string, "precio": number /* euros */ }] }`
  - `400` / `401` / `422` / `502` → `{ "error": "<mensaje en español>" }`
  - CORS en todas las respuestas: `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Headers: authorization, content-type, x-codigo`, `Access-Control-Allow-Methods: POST, OPTIONS`; `OPTIONS` → `204`.
- `validate.ts`: `class HttpError extends Error { status: number }` y `validateRequest(body: unknown, codigo: string | null, codigoEsperado: string): string[]`. Código distinto → `401` “Código del grupo incorrecto”. `imagenes` que no sea un array de 1 a 4 strings no vacíos → `400` “Manda entre 1 y 4 fotos”. Suma de longitudes > 8 000 000 → `400` “Las fotos pesan demasiado”.

- [ ] **Step 1: Escribir los tests que fallan**

```ts
import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { HttpError, validateRequest } from './validate.ts';

Deno.test('código incorrecto → 401', () => {
  const e = assertThrows(() => validateRequest({ imagenes: ['a'] }, 'mal', 'bien'), HttpError);
  assertEquals(e.status, 401);
});

Deno.test('0, 5 o no-strings → 400', () => {
  for (const imagenes of [[], ['a', 'b', 'c', 'd', 'e'], [1], ['']]) {
    const e = assertThrows(() => validateRequest({ imagenes }, 'bien', 'bien'), HttpError);
    assertEquals(e.status, 400);
  }
  assertEquals(assertThrows(() => validateRequest(null, 'bien', 'bien'), HttpError).status, 400);
});

Deno.test('más de 8 MB → 400', () => {
  const e = assertThrows(() => validateRequest({ imagenes: ['x'.repeat(8_000_001)] }, 'bien', 'bien'), HttpError);
  assertEquals(e.message, 'Las fotos pesan demasiado');
});

Deno.test('petición buena devuelve las fotos', () => {
  assertEquals(validateRequest({ imagenes: ['a', 'b'] }, 'bien', 'bien'), ['a', 'b']);
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

```bash
npx supabase init
npx supabase functions new leer-carta
deno test supabase/functions/leer-carta/
```

Expected: FAIL — no se puede resolver `./validate.ts`.

- [ ] **Step 3: Implementar `validate.ts`** con las reglas de arriba.

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `deno test supabase/functions/leer-carta/`
Expected: PASS (4 tests)

- [ ] **Step 5: Implementar `index.ts`**

`deno.json` con imports fijados a la versión actual: `"@anthropic-ai/sdk": "npm:@anthropic-ai/sdk@<x.y.z>"`, `"zod": "npm:zod@<x.y.z>"`. `Deno.serve`: si es `OPTIONS` → 204 con CORS; parsear el JSON (si falla → 400 “Petición no válida”); `validateRequest(body, req.headers.get('x-codigo'), Deno.env.get('CODIGO_GRUPO')!)`. Luego:

```ts
const CartaSchema = z.object({
  nombre: z.string(),
  carta: z.array(z.object({ categoria: z.string(), nombre: z.string(), precio: z.number() })),
});

const res = await new Anthropic({ timeout: 120_000 }).messages.parse({ // lee ANTHROPIC_API_KEY
  model: 'claude-haiku-5-5',
  max_tokens: 16000,
  output_config: { effort: 'low', format: zodOutputFormat(CartaSchema) },
  system: PROMPT,
  messages: [{ role: 'user', content: [
    ...imagenes.map(data => ({ type: 'image' as const, source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data } })),
    { type: 'text', text: 'Transcribe esta carta.' },
  ] }],
});
```

`PROMPT`, copiado tal cual:

> Transcribes cartas de restaurantes españoles a partir de fotos (pueden ser varias páginas de la misma carta). Incluye todos los productos que tengan precio, con el nombre tal y como aparece. Usa como categoría el apartado de la carta en el que está (Raciones, Bocadillos, Bebidas…); si no hay apartados, pon "Otros". El precio va en euros como número (6,50 € → 6.5). Si un producto tiene varios precios por tamaño (tapa, media, ración…), crea un producto por tamaño con el tamaño entre paréntesis, por ejemplo "Morcilla (media)". Omite los productos sin precio fijo ("según mercado"). En "nombre" pon el nombre del restaurante si aparece en la carta; si no, déjalo vacío.

Respuestas: `stop_reason === 'refusal'`, `parsed_output` nulo o `carta` vacía → 422 “No he podido leer la carta, prueba con otra foto”; `stop_reason === 'max_tokens'` → 422 “La carta es muy larga, prueba con menos fotos a la vez”; un `Anthropic.APIError` → `console.error` y 502 “El servicio de lectura ha fallado, prueba otra vez”; si no, 200 con `parsed_output`. Haiku 5.5 no tiene fallback en el servidor, así que el rechazo se trata como foto ilegible. `effort: 'low'` porque es transcribir; súbelo a `'medium'` solo si en la comprobación del Step 7 se deja productos.

- [ ] **Step 6: Desplegar**

Hace falta un proyecto de Supabase del usuario (pregúntale cuál, o que cree uno). El usuario mete él mismo los secretos (no los escribas tú):

```bash
npx supabase secrets set ANTHROPIC_API_KEY=... CODIGO_GRUPO=...
```

Después, `npx supabase functions deploy leer-carta` (o `deploy_edge_function` del MCP de Supabase).

- [ ] **Step 7: Verificar con una foto real**

Con una foto de una carta (`carta.jpg`):

```bash
node -e "const fs=require('fs');fs.writeFileSync('body.json',JSON.stringify({imagenes:[fs.readFileSync(process.argv[1]).toString('base64')]}))" carta.jpg
```

```bash
curl -s -X POST "$SUPABASE_URL/functions/v1/leer-carta" -H "Authorization: Bearer $SUPABASE_ANON_KEY" -H "x-codigo: $CODIGO" -H "Content-Type: application/json" --data @body.json
```

Expected: `{"nombre":…,"carta":[…]}` con los productos de la foto y precios correctos a ojo. Con `x-codigo: mal` → `401` y `{"error":"Código del grupo incorrecto"}`. Borra `body.json` después.

- [ ] **Step 8: Commit**

```bash
git add supabase
git commit -m "feat: función leer-carta con Claude Haiku 5.5"
```

---

### Task 3: Pantalla de escaneo

**Files:**
- Create: `src/lib/scan.ts`, `src/components/ScanScreen.tsx`, `.env.example`
- Modify: `src/App.tsx`, `.gitignore` (añadir `.env.local`)
- Test: `src/lib/scan.test.ts`

**Interfaces:**
- Consumes: contrato HTTP de Task 2; `menuFromRows`, `menuToJson`, `saveCustomMenu`, `deleteCustomMenu`, `loadCustomMenus` (Task 1); `formatEuros`.
- Produces:
  - `type ScannedMenu = { nombre: string; carta: { categoria: string; nombre: string; precio: number }[] }` (precio en euros, tal cual llega).
  - `resizeImage(file: File, maxSide?: number): Promise<string>` — por defecto 1600 px; `createImageBitmap` + canvas + `toBlob('image/jpeg', 0.8)`; devuelve base64 sin prefijo. Solo navegador, sin test.
  - `scanMenu(imagenes: string[], codigo: string, fetchFn?: typeof fetch): Promise<ScannedMenu>` — URL `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/leer-carta`, cabecera `Authorization: Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`. Errores: `fetchFn` lanza → “Sin conexión: escanear necesita internet”; `401` → “Código del grupo incorrecto”; otro `!ok` → el `error` del body, o “No se pudo leer la carta”.
  - `ScanScreen({ onDone, onCancel }: { onDone: (menuId: string) => void; onCancel: () => void })`
  - El código del grupo se guarda en `localStorage` con la clave `cuentas-codigo`.

- [ ] **Step 1: Escribir los tests que fallan**

```ts
import { expect, test, vi } from 'vitest';
import { scanMenu } from './scan';

const carta = { nombre: 'X', carta: [{ categoria: 'Raciones', nombre: 'Croquetas', precio: 8.5 }] };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

test('scanMenu manda fotos y código y devuelve la carta', async () => {
  const f = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => json(carta));
  expect(await scanMenu(['abc'], '1234', f)).toEqual(carta);
  const init = f.mock.calls[0][1]!;
  expect((init.headers as Record<string, string>)['x-codigo']).toBe('1234');
  expect(JSON.parse(init.body as string)).toEqual({ imagenes: ['abc'] });
});

test('scanMenu traduce los errores', async () => {
  await expect(scanMenu(['a'], 'x', async () => { throw new TypeError('Failed to fetch'); })).rejects.toThrow(/Sin conexión/);
  await expect(scanMenu(['a'], 'x', async () => json({}, 401))).rejects.toThrow(/Código del grupo/);
  await expect(scanMenu(['a'], 'x', async () => json({ error: 'No he podido leer la carta' }, 422))).rejects.toThrow(/No he podido leer/);
  await expect(scanMenu(['a'], 'x', async () => new Response('boom', { status: 500 }))).rejects.toThrow(/No se pudo leer/);
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/lib/scan.test.ts`
Expected: FAIL — no se puede resolver `./scan`.

- [ ] **Step 3: Implementar `src/lib/scan.ts`** con las firmas de arriba. Crea `.env.example` con `VITE_SUPABASE_URL=` y `VITE_SUPABASE_ANON_KEY=`; los valores reales van en `.env.local` (ignorado por git).

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npm test`
Expected: PASS (34 tests).

- [ ] **Step 5: Implementar `ScanScreen` y engancharla en `App`**

En la lista de restaurantes de `App`: botón **📷 Escanear carta** → `ScanScreen`; las cartas escaneadas llevan un ✕ (`confirm`, luego `deleteCustomMenu`). `ScanScreen` tiene dos fases:
1. **Fotos**: campo “Código del grupo” si no hay ninguno guardado. `<input type="file" accept="image/*" capture="environment" multiple>`, hasta 4 fotos, con miniaturas y ✕. **Leer carta** → `resizeImage` en cada foto → “Leyendo la carta…” → `scanMenu`. Si falla, se muestra el mensaje y las fotos se quedan; un error de código borra `cuentas-codigo` y vuelve a pedirlo.
2. **Revisión**: input con el nombre del restaurante y una tabla editable (categoría, producto, precio como texto `'8,50'`), con ✕ por fila y **+ Añadir fila**. **Guardar y usar** → `menuFromRows` (si lanza, se muestra el mensaje con la fila) → `saveCustomMenu` → `onDone(id)`, y `App` hace `start(id)`. **Descargar JSON** → `menuToJson(menuFromRows(…))` en un `Blob`, descargado como `<nombre-en-minúsculas-con-guiones>.json`. **Volver** regresa a las fotos.

- [ ] **Step 6: Verificar en el navegador** (con `.env.local` apuntando a la función de Task 2)

- Escanear una foto de una carta → aparece la revisión con los productos.
- Poner `abc` en un precio → **Guardar y usar** muestra “Fila N: precio no válido”; corregirlo → arranca la cena con esa carta y la pestaña Carta la muestra.
- Volver a la lista de restaurantes: aparece “{nombre} (escaneada)”.
- Activar Offline en DevTools y recargar → la carta escaneada sigue disponible.
- Con Offline, intentar escanear → “Sin conexión: escanear necesita internet” y las fotos siguen ahí.
- **Descargar JSON** → copiar el fichero a `public/restaurantes/`, añadirlo a `index.json` y comprobar que carga como restaurante normal (y después deshacer ese cambio de prueba).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: escanear carta con revisión antes de guardar"
```


---

### Task 4: Despliegue y README con el escaneo

**Files:**
- Modify: `.github/workflows/deploy.yml`, `README.md`

- [ ] **Step 1:** En el paso `npm run build` del workflow, añade `VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}` y `VITE_SUPABASE_ANON_KEY: ${{ vars.VITE_SUPABASE_ANON_KEY }}` (variables del repo; la anon key es pública por diseño).
- [ ] **Step 2:** En el README, añade cómo montar el escaneo: proyecto de Supabase, `supabase secrets set ANTHROPIC_API_KEY=… CODIGO_GRUPO=…`, `supabase functions deploy leer-carta`, las dos variables del repo, que usa Claude Haiku 5.5 y que se cobra al crédito de la API de quien ponga la clave (recomendar un tope sin recarga automática). Explica también cómo subir al repo una carta escaneada con **Descargar JSON**.
- [ ] **Step 3:** Run: `npm test && npm run build`. Expected: todo en PASS y el build sin errores.
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: despliegue con escaneo de cartas"
```
