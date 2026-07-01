import { cpSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { resolve, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const srcDir = resolve(root, 'src/themes');
const destDir = resolve(root, 'dist/themes');

if (!existsSync(destDir)) {
  mkdirSync(destDir, { recursive: true });
}

for (const file of readdirSync(srcDir)) {
  if (extname(file) !== '.css') continue;
  cpSync(resolve(srcDir, file), resolve(destDir, file));
  console.log(`✔ Copied src/themes/${file} → dist/themes/${file}`);
}
