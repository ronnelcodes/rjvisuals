import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const output = join(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(output);
for (const entry of await readdir(root, { withFileTypes: true })) {
  if ((entry.isDirectory() && entry.name === 'assets') ||
      (entry.isFile() && /\.(html|css|js)$/.test(entry.name))) {
    await cp(join(root, entry.name), join(output, entry.name), { recursive: true });
  }
}
