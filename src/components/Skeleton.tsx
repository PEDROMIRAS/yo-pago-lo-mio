/** Filas de carga; `alto` es la clase de altura del contenido que sustituyen (p. ej. "h-15"). */
export function Skeleton({ filas, alto }: { filas: number; alto: string }) {
  return (
    <div className="grid gap-2.5" role="status" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className={`animate-pulse rounded-control bg-line ${alto}`} />
      ))}
    </div>
  );
}
