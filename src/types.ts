export type Persona = { id: string; nombre: string };
export type Linea = {
  id: string;
  producto: string;
  precio: number;      // céntimos por unidad (copiado de la carta al añadir)
  cantidad: number;    // entero >= 1
  personas: string[];  // ids, sin repetidos, al menos uno
  mitades?: [string, string]; // pizza mitad y mitad: los dos platos de la carta
};
export type Dinner = {
  restauranteId: string;
  personas: Persona[];
  lineas: Linea[];
  pagos: Record<string, number>; // personaId -> céntimos puestos
  modo: Modo;                    // cómo se reparte la cuenta
  nextId: number;                // contador para ids 'p1', 'l2'...
};
export type Modo = 'consumo' | 'igual'; // por lo que pidió cada uno | total entre todos
// precio en céntimos; descripcion: ingredientes o detalle, solo en los platos que la necesitan;
// mitad: se puede pedir mitad y mitad con otro plato que también la tenga
export type MenuItem = { categoria: string; nombre: string; precio: number; descripcion?: string; mitad?: boolean };
export type Menu = { nombre: string; carta: MenuItem[] };
export type RestauranteRef = { id: string; nombre: string };
