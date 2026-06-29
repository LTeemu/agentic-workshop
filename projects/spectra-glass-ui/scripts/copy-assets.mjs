import { cpSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const files = [
  { src: 'src/themes/glass.css', dest: 'dist/themes/glass.css' },
];

for (const { src, dest } of files) {
  const destDir = dirname(dest);
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }
  cpSync(resolve(root, src), resolve(root, dest));
  console.log(`✔ Copied ${src} → ${dest}`);
}
