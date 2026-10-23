# Yo pago lo mío

Calculadora para repartir la cuenta de una cena de grupo. Eliges el restaurante, apuntas quién está en la mesa y qué ha pedido cada uno (con raciones compartidas), y la app te dice cuánto le toca a cada persona y quién tiene que pagar a quién. También se puede pagar a partes iguales.

Es una web estática (React + Vite) que se instala en el móvil y funciona sin conexión después de la primera visita, cartas incluidas.

## Desarrollo

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # tests de la lógica (Vitest)
npm run build   # build de producción en dist/
```

## Añadir un restaurante

1. Crea `public/restaurantes/<id>.json` (id en minúsculas, sin tildes, con guiones):

   ```json
   {
     "nombre": "Merendero Padilla",
     "carta": [
       { "categoria": "Raciones", "nombre": "Morcilla", "precio": 6.5 },
       { "categoria": "Raciones", "nombre": "Morcilla (media)", "precio": 3.5 }
     ]
   }
   ```

   Precio en euros, como número. Si un plato tiene varios tamaños, pon un producto por tamaño.

2. Añade el restaurante a `public/restaurantes/index.json`:

   ```json
   [{ "id": "padillas", "nombre": "Merendero Padilla" }]
   ```

3. Ejecuta `npm test`: comprueba que cada restaurante de la lista tiene su fichero y que la carta es válida.

## Publicar

La app se publica en GitHub Pages con cada push a `main` (`.github/workflows/deploy.yml`, que antes pasa los tests). La primera vez hay que activar Pages en el repo: **Settings → Pages → Source: GitHub Actions**.

## Instalar en el móvil

Abre la web en el móvil y elige **Añadir a pantalla de inicio** (Safari: botón Compartir; Chrome: menú ⋮). Después funciona sin cobertura.
