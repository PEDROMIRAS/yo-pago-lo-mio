/** Filas de carga con la misma altura que el contenido que sustituyen. */
export function Skeleton({ filas, alto }: { filas: number; alto: number }) {
  return (
    <div className="grid gap-2.5" role="status" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="animate-pulse rounded-control bg-line" style={{ height: alto }} />
      ))}
    </div>
  );
}
