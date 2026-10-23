import { List, Receipt, Users, Wallet, type Icon } from '@phosphor-icons/react';

export type Tab = 'gente' | 'carta' | 'resumen' | 'pagar';

/** Las pestañas en el orden de la barra; el orden decide hacia qué lado se desliza la nueva. */
export const TABS: { id: Tab; label: string; icon: Icon }[] = [
  { id: 'gente', label: 'Gente', icon: Users },
  { id: 'carta', label: 'Carta', icon: List },
  { id: 'resumen', label: 'Resumen', icon: Receipt },
  { id: 'pagar', label: 'Pagar', icon: Wallet },
];

export const ordenTab = (t: Tab) => TABS.findIndex(x => x.id === t);
