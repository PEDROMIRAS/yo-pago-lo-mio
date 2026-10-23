# Yo pago lo mío — Documento de requisitos

Fecha: 2026-10-22

## Problema

En una cena de grupo (p. ej. en Merendero Padilla) cada uno pide cosas distintas, hay
raciones compartidas entre unos pocos y la cuenta la pagan una o varias personas
con lo que lleven encima. Queremos una calculadora que diga cuánto le toca a cada
uno y quién tiene que pagar a quién para cuadrar.

## Restricciones

- **Web estática** hecha con **React** (Vite + TypeScript): sin servidor ni base de
  datos. El build se publica en **GitHub Pages** con una GitHub Action.
- **PWA instalable** que funciona **sin conexión** tras la primera visita (cartas
  incluidas), porque en el restaurante puede no haber cobertura.
- **v1 sin backend.** El escaneo de cartas (v2, al final) añadirá una sola Supabase
  Edge Function.
- Interfaz en **español**, pensada para **móvil** (se usa en la mesa).
- Importes en euros, formato español (`20,50 €`).

## Restaurantes y cartas

- Cada restaurante es un fichero `public/restaurantes/<id>.json` (se lee en tiempo
  de ejecución, no se compila dentro del código). La lista de restaurantes
  disponibles está en `public/restaurantes/index.json`:

  ```json
  [{ "id": "padillas", "nombre": "Merendero Padilla" }]
  ```

- Formato de carta, lo más simple posible (precio en euros, con decimales):

  ```json
  {
    "nombre": "Merendero Padilla",
    "carta": [
      { "categoria": "Raciones", "nombre": "Morcilla", "precio": 6.5 },
      { "categoria": "Bebidas",  "nombre": "Caña",     "precio": 2 }
    ]
  }
  ```

  `categoria` es opcional (por defecto `Otros`). Las variantes (media ración / ración)
  son productos distintos. `descripcion` también es opcional: los ingredientes del plato
  cuando la carta los da (añadido el 2026-10-23; se ven bajo el nombre y entran en la búsqueda).
  `"mitad": true` (opcional, 2026-10-23): el plato se puede pedir mitad y mitad con otro que
  también lo tenga; la línea se llama "½ A + ½ B" y cuesta lo que la mitad más cara.
- Para añadir un restaurante basta con crear su JSON y añadir una línea a `index.json`.
- **En v1 las cartas se añaden a mano:** el usuario pasa fotos de la carta a Claude
  Code, que las transcribe a `public/restaurantes/<id>.json` y añade la línea a
  `index.json`. Empieza con Merendero Padilla.

## Flujo

1. **Inicio**: si hay una cena guardada, preguntar *“¿Continuar la cena en Merendero
   Padilla o empezar una nueva?”*. Si no, elegir restaurante. Si la carta de la cena
   guardada no carga, se puede reintentar o empezar una nueva (nunca una pantalla sin
   salida).
2. **Gente**: añadir a las personas que cenan. Se puede añadir gente en cualquier
   momento. Una persona solo se puede borrar si no está en ningún pedido.
3. **Carta**: lista de la carta por categorías, con **buscador** (ignora mayúsculas
   y tildes; busca en nombre y categoría). Al pulsar un producto se abre un
   formulario:
   - **Cantidad** (entero ≥ 1).
   - **Personas** que lo comparten (casillas + botón “Todos”). Al menos una.
   - Aceptar → se añade una **línea de pedido**.
4. **Añadir desde una persona**: al tocar a una persona, la carta queda “a nombre de”
   esa persona: el formulario se abre con solo ella marcada y cantidad 1.
5. **Resumen**, dos vistas:
   - **Totales por producto**: `Morcilla ×10 · 65,00 €`, `Patatas ×1 · 4,00 €`…
     (agrega líneas del mismo producto).
   - **Bloques de reparto**: un bloque = un **grupo exacto de personas**, con todas
     las líneas que comparten. Ej.: *“Pedro + Paco: 3 morcillas, 1 patatas →
     23,50 € · 11,75 € cada uno”*. Desde un bloque se puede:
     - editar cualquier línea (cantidad y personas) o borrarla;
     - **añadir una persona al bloque** (se suma a todas sus líneas; el bloque pasa
       a ser el del nuevo grupo);
     - **añadir un producto al bloque** (formulario con las personas del bloque ya
       marcadas).
   - Total de la cuenta y lo que le toca a cada persona según el modo de reparto
     (ver abajo), con el desglose de lo suyo en modo *por consumo*.
6. **Pagar**: selector del modo de reparto arriba (*Por consumo* / *A partes
   iguales*). Para cada persona, lo que le toca y un campo “ha puesto” (acepta
   `20`, `20,5`, `20.50`).
   - Si lo puesto no suma el total → aviso *“Faltan X €”* / *“Sobran X €”* y no se
     muestran transferencias.
   - Si cuadra → lista de **transferencias** (*“Ana → Jesús 14,50 €”*), con pocas
     transferencias (estilo Tricount: cada deudor paga a los acreedores, como mucho
     n − 1 pagos).

## Modos de reparto

La cena tiene un **modo de reparto** que se puede cambiar en cualquier momento
(desde Resumen o Pagar) y se guarda con la cena:

- **Por consumo** (por defecto): cada uno paga lo que ha pedido. Un plato puesto
  solo a una persona va entero a esa persona; uno compartido se reparte entre
  quienes lo comparten. En el Resumen, cada persona ve el **desglose** de lo suyo
  (*“Ana: 3 × Morcilla (½) 9,75 €, Caña 2,00 € → debes 11,75 €”*).
- **A partes iguales**: el total de la cuenta se divide entre **todos** los
  comensales, sin mirar quién pidió qué.

Cambiar de modo no toca el pedido ni lo que ha puesto cada uno: solo recalcula
cuotas y transferencias.

## Reglas de cálculo

- Todo el dinero se calcula en **céntimos enteros** (nada de floats).
- Total de una línea = precio × cantidad. En modo *por consumo* se reparte **a
  partes iguales** entre sus personas. En modo *a partes iguales* se reparte el
  total de la cuenta entre todos los comensales, con la misma regla de céntimos.
- Si no divide exacto, el resto se reparte céntimo a céntimo empezando por la
  primera persona de la línea (10 € entre 3 → 3,34 + 3,33 + 3,33). La suma de las
  cuotas es **siempre** el total exacto. Decisión consciente: si muchas líneas no
  dividen exacto, el primero de esas líneas puede pagar unos céntimos más en total
  (un céntimo por línea como mucho). Se acepta a cambio de una regla simple.
- Cuota de una persona (por consumo) = suma de sus partes en todas las líneas.
  Alguien sin líneas tiene cuota 0. (A partes iguales, todos pagan lo mismo,
  también quien no tiene líneas.)
- Saldo = lo que ha puesto − su cuota. Saldo > 0: le deben; < 0: debe.

## Guardado

- Una única cena guardada en `localStorage`; cada cambio la sobrescribe.
- Sobrevive a recargar la página y a cerrar el navegador.
- Si lo guardado está corrupto o es de otra versión → se ignora y se empieza limpio.
- Si `localStorage` no está disponible, la app funciona igual (sin guardar). Incluye
  navegadores con las cookies bloqueadas, donde solo con leer `localStorage` ya salta
  un error.
- “Nueva cena” (con confirmación) borra lo guardado.

## Fuera de alcance (v1)

Productos fuera de carta, propina, historial de cenas, repartos con pesos (p. ej.
“Ana paga el doble”), mezclar modos en una misma cena,
compartir/editar la misma cena desde varios móviles, varios idiomas, y el escaneo
de cartas (abajo).

## v2: escanear una carta

Plan: `docs/superpowers/plans/2026-10-22-cuentas-cena-v2-escaneo.md`.

Objetivo: llegar a un restaurante que no está en la app y tener su carta en un
minuto.

1. En la pantalla de elegir restaurante, botón **“Escanear carta”**. Se hacen o se
   eligen de 1 a 4 fotos (una por página).
2. El móvil reduce las fotos (lado mayor 1600 px, JPEG) y las manda a una
   **Supabase Edge Function** (`leer-carta`) que guarda la clave de la API y pide a
   **Claude Haiku 5.5** (el modelo más barato) la carta en el formato JSON de arriba.
3. **Pantalla de revisión** obligatoria: nombre del restaurante y tabla editable
   (categoría, producto, precio) para corregir, borrar o añadir filas.
4. **Guardar y usar**: la carta se guarda **solo en ese móvil** (`localStorage`),
   aparece en la lista de restaurantes marcada como “escaneada” y arranca la cena
   con ella. Funciona sin conexión a partir de ahí.
5. **Descargar JSON**: baja la carta en el formato del repo, para subirla a
   `public/restaurantes/` y que la tenga todo el mundo.

Reglas:
- Coste: se cobra al crédito de la API de Anthropic de quien ponga la clave (unos
  0,2 céntimos por carta). Recomendable un tope sin recarga automática.
- Escanear necesita conexión; sin ella, mensaje claro y se sigue con las cartas que
  ya hay.
- La función exige un **código del grupo** (se pide la primera vez y se recuerda en
  el móvil) para que nadie ajeno gaste créditos. Tiene que ser aleatorio y de 12
  caracteres o más: la dirección de la función es pública y no hay límite de intentos.
- Varios tamaños de un plato (media / entera) → un producto por tamaño.
- Si la foto no se puede leer, se avisa y se puede repetir; nunca se guarda una carta
  sin pasar por la revisión.
