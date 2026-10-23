const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

/** Texto del usuario ("20,5", "7.05 €") a céntimos; null si no es un importe válido. */
export function parseEuros(text: string): number | null {
  const clean = text.replace(/[\s€]/g, '');
  if (clean === '') return 0;
  const m = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(clean);
  if (!m) return null;
  // aritmética entera: parseFloat('20.1') * 100 no siempre da 2010
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
}

export function formatEuros(cents: number): string {
  return euros.format(cents / 100);
}

/** Reparte `total` céntimos en `n` partes; el resto va céntimo a céntimo a las primeras. */
export function splitCents(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const rest = total % n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}
