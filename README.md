# Yo pago lo mío

Calculadora para repartir la cuenta de una cena de grupo. Eliges el restaurante, apuntas quién está en la mesa y qué ha pedido cada uno (con raciones compartidas), y la app te dice cuánto le toca a cada persona y quién tiene que pagar a quién. También se puede pagar a partes iguales.

**En uso:** <https://pedromiras.github.io/yo-pago-lo-mio/>

Es una web estática (React + Vite + TypeScript, estilos con Tailwind y animaciones con Motion) que se instala en el móvil y funciona sin conexión después de la primera visita, cartas incluidas.

## Qué hace

- **Portada:** qué es la app, la cena guardada (para continuarla) y **Nueva cena**, que lleva a elegir restaurante.
- **Gente:** apuntas a quién hay en la mesa. Tocar un nombre lleva a la carta para añadirle platos.
- **Carta:** buscador (por nombre, categoría o ingrediente), saltos por categoría y, en cada plato, sus ingredientes si la carta los da. Al tocar un plato eliges cantidad y quién lo comparte; debajo, **Ya pedido** muestra los grupos que ya lo tienen para cambiar la cantidad o borrarlos.
- **Resumen:** lo que le toca a cada uno (por consumo o a partes iguales), lo compartido por cada grupo (editable) y lo pedido.
- **Pagar:** lo que ha puesto cada uno (o **Pagó todo**), lo que falta o sobra y quién paga a quién. **Compartir con el grupo** manda el resumen por el menú del móvil, y hay enlaces directos a WhatsApp y Telegram.
- **Deshacer:** borrar un plato o quitar a alguien se puede deshacer durante unos segundos.
- La cena se guarda en el navegador; si no deja guardar, la app lo avisa.

## Restaurantes

| Id | Restaurante |
| --- | --- |
| `padillas` | Merendero Padilla |
| `l-atelier` | L’Atelier (pizzas, con ingredientes) |

## Desarrollo

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # tests de la lógica (Vitest)
npm run build   # build de producción en dist/
```

La lógica (dinero en céntimos, cálculos, cartas, guardado) está en `src/lib/` con sus tests; la interfaz en `src/components/`.

## Añadir un restaurante

1. Crea `public/restaurantes/<id>.json` (id en minúsculas, sin tildes, con guiones):

   ```json
   {
     "nombre": "Merendero Padilla",
     "carta": [
       { "categoria": "Raciones", "nombre": "Morcilla", "precio": 6.5 },
       { "categoria": "Raciones", "nombre": "Morcilla (media)", "precio": 3.5 },
       { "categoria": "Pizzas", "nombre": "Hawaiana", "precio": 12, "descripcion": "Tomate, jamón York, piña natural, queso, olivas" }
     ]
   }
   ```

   Precio en euros, como número. Si un plato tiene varios tamaños, pon un producto por tamaño. `descripcion` es opcional: úsala para los ingredientes cuando la carta los dé.

2. Añade el restaurante a `public/restaurantes/index.json`:

   ```json
   [{ "id": "padillas", "nombre": "Merendero Padilla" }]
   ```

3. Ejecuta `npm test`: comprueba que cada restaurante de la lista tiene su fichero y que la carta es válida.

4. Añádelo a la tabla de **Restaurantes** de este README.

## Publicar

La app se publica en GitHub Pages con cada push a `main` (`.github/workflows/deploy.yml`, que antes pasa los tests). La primera vez hay que activar Pages en el repo: **Settings → Pages → Source: GitHub Actions**.

## Instalar en el móvil

Abre la web en el móvil y elige **Añadir a pantalla de inicio** (Safari: botón Compartir; Chrome: menú ⋮). Después funciona sin cobertura. Las versiones nuevas se cargan al volver a abrir la app.
