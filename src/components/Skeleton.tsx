/** Filas de carga con la misma altura que el contenido que sustituyen. */
export function Skeleton({ filas, alto }: { filas: number; alto: number }) {
  return (
    <div className="skeleton" role="status" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} style={{ height: alto }} />
      ))}
    </div>
  );
}
