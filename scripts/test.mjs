// Lanza Vitest desde la ruta canónica. En Windows, si la terminal abre el proyecto como `c:\…`
// en minúscula, Vitest se carga dos veces (c:/ y C:/) y todos los tests salen como "no tests".
import { realpathSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const cwd = realpathSync.native(process.cwd());
const { status } = spawnSync(process.execPath, [join(cwd, 'node_modules/vitest/vitest.mjs'), 'run', ...process.argv.slice(2)], {
  cwd,
  stdio: 'inherit',
});
process.exit(status ?? 1);
