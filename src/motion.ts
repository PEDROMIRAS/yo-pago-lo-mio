import type { Transition, Variants } from 'motion/react';

// Ritmo común de toda la app: muelles al entrar, salidas más cortas y acelerando.
export const spring: Transition = { type: 'spring', stiffness: 520, damping: 40, mass: 0.8 };
export const springSoft: Transition = { type: 'spring', stiffness: 300, damping: 32 };
export const exitFast: Transition = { duration: 0.14, ease: [0.4, 0, 1, 1] };

/**
 * Fila de una lista corta que entra en cascada: `custom` es su posición (35 ms por fila).
 * Cada fila declara initial/animate ella misma: si lo heredara del <ul>, un AnimatePresence
 * con initial={false} por encima la dejaría invisible en la primera carga.
 * No usar en la carta: son 78 filas.
 */
export const item: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, transition: { ...springSoft, delay: Math.min(i, 8) * 0.035 } }),
};

/** Salida de una fila borrada; las demás suben con `layout`. */
export const itemExit = { opacity: 0, x: -24, transition: exitFast };
