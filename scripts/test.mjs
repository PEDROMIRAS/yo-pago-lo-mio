// Lanza Vitest desde la ruta canónica. En Windows, si la terminal abre el proyecto como `c:\…`
// en minúscula, Vitest se carga dos veces (c:/ y C:/) y todos los tests salen como "no tests".
// Sin fsModuleCache: guarda el import.meta.glob de las cartas y no ve un restaurante recién añadido.
import { realpathSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const cwd = realpathSync.native(process.cwd());
const vitest = join(cwd, 'node_modules/vitest/vitest.mjs');
const { status } = spawnSync(process.execPath, [vitest, 'run', '--fsModuleCache=false', ...process.argv.slice(2)], {
  cwd,
  stdio: 'inherit',
});
process.exit(status ?? 1);
