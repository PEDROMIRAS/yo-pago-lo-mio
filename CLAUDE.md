# Yo pago lo mío

PWA en React (Vite + TypeScript, Tailwind v4, Motion, iconos Phosphor) para repartir la cuenta de una cena de grupo. Web estática en GitHub Pages, sin backend: <https://pedromiras.github.io/yo-pago-lo-mio/>

- Requisitos: `docs/superpowers/specs/2026-10-22-cuentas-cena-requisitos.md`
- Plan v1 (terminado): `docs/superpowers/plans/2026-10-22-cuentas-cena.md`
- Plan v2 (escanear cartas con Supabase + Claude Haiku 5.5): `docs/superpowers/plans/2026-10-22-cuentas-cena-v2-escaneo.md`.

Con cada cambio, actualiza en el mismo commit el `README.md` y la documentación que quede desfasada (este archivo incluido).

## Añadir un restaurante

El usuario pasa fotos o el texto de la carta. Transcríbela a `public/restaurantes/<id>.json` (id en minúsculas, sin tildes, con guiones) y añade `{ "id", "nombre" }` a `public/restaurantes/index.json`.

```json
{
  "nombre": "Merendero Padilla",
  "carta": [
    { "categoria": "Raciones", "nombre": "Morcilla", "precio": 6.5 },
    { "categoria": "Pizzas", "nombre": "Hawaiana", "precio": 12, "descripcion": "Tomate, jamón York, piña natural, queso, olivas", "mitad": true }
  ]
}
```

- Precio en euros, como número. Si un plato tiene varios tamaños, va un producto por tamaño: `"Morcilla (media)"`.
- `descripcion` es opcional: cópiala cuando la carta diga qué lleva el plato (ingredientes). Sale en la app bajo el nombre y el buscador también busca en ella.
- `"mitad": true` es opcional: ponlo en los platos que el restaurante deja pedir mitad y mitad (en L’Atelier, todas las pizzas menos Pizza de Ajo y Burrata). La app cobra la mitad más cara.
- Usa las categorías de la carta. Omite lo que no tenga precio fijo.
- Si un precio no se lee bien, pregunta en vez de inventarlo.
- Ejecuta `npm test`: un test comprueba que cada id de `index.json` tiene su fichero y que la carta carga.
- Añade el restaurante a la lista de "Restaurantes" del `README.md`.
