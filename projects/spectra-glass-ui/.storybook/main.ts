import type { StorybookConfig } from '@storybook/web-components-vite';
import { Plugin } from 'vite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Vite plugin that saves theme CSS files from the Theme Builder. */
function saveThemePlugin(): Plugin {
  const THEMES_DIR = path.resolve(__dirname, '..', 'src', 'themes');

  return {
    name: 'save-theme',
    configureServer(server) {
      server.middlewares.use('/api/save-theme', async (req, res) => {
        // Only accept POST
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        // Read JSON body
        let body = '';
        req.on('data', (chunk: string) => { body += chunk; });
        req.on('end', () => {
          try {
            const { name, properties } = JSON.parse(body);
            if (!name || !properties) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing name or properties' }));
              return;
            }

            // Sanitize name → filename
            const slug = name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'untitled';
            const filename = `sg-theme-${slug}.css`;
            const filepath = path.join(THEMES_DIR, filename);

            // Generate CSS
            const lines: string[] = [':root {'];
            for (const [key, value] of Object.entries(properties)) {
              if (key.startsWith('--sg-')) {
                lines.push(`  ${key}: ${value};`);
              }
            }
            lines.push('}', '');

            fs.writeFileSync(filepath, lines.join('\n'), 'utf-8');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, file: filename }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(err) }));
          }
        });
      });
    },
  };
}

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
  addons: ['@storybook/addon-links', '@storybook/addon-docs'],
  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },
  async viteFinal(config) {
    config.plugins?.push(saveThemePlugin());
    return config;
  },
};

export default config;
