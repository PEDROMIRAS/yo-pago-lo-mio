export type Persona = { id: string; nombre: string };
export type Linea = {
  id: string;
  producto: string;
  precio: number;      // céntimos por unidad (copiado de la carta al añadir)
  cantidad: number;    // entero >= 1
  personas: string[];  // ids, sin repetidos, al menos uno
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
export type MenuItem = { categoria: string; nombre: string; precio: number }; // precio en céntimos
export type Menu = { nombre: string; carta: MenuItem[] };
export type RestauranteRef = { id: string; nombre: string };
