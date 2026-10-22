# Yo pago lo mío

PWA en React (Vite + TypeScript) para repartir la cuenta de una cena de grupo. Web estática en GitHub Pages, sin backend.

- Requisitos: `docs/superpowers/specs/2026-10-22-cuentas-cena-requisitos.md`
- Plan v1: `docs/superpowers/plans/2026-10-22-cuentas-cena.md`
- Plan v2 (escanear cartas con Supabase + Claude Haiku 5.5): `docs/superpowers/plans/2026-10-22-cuentas-cena-v2-escaneo.md`. No empezarlo hasta que la v1 esté terminada.

## Añadir un restaurante

El usuario pasa fotos o el texto de la carta. Transcríbela a `public/restaurantes/<id>.json` (id en minúsculas, sin tildes, con guiones) y añade `{ "id", "nombre" }` a `public/restaurantes/index.json`.

```json
{ "nombre": "Los Padillas", "carta": [{ "categoria": "Raciones", "nombre": "Morcilla", "precio": 6.5 }] }
```

- Precio en euros, como número. Si un plato tiene varios tamaños, va un producto por tamaño: `"Morcilla (media)"`.
- Usa las categorías de la carta. Omite lo que no tenga precio fijo.
- Si un precio no se lee bien, pregunta en vez de inventarlo.
