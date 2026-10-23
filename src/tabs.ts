export const TAB_IDS = ['gente', 'carta', 'resumen', 'pagar'] as const;
export type Tab = (typeof TAB_IDS)[number];

/** Posición en la barra: decide hacia qué lado se desliza la pestaña nueva. */
export const ordenTab = (t: Tab) => TAB_IDS.indexOf(t);
