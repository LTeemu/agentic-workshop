import type { StorybookConfig } from '@storybook/web-components-vite';
import { Plugin } from 'vite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Derive a display name from a theme filename e.g. sg-theme-spectra-default.css → "Spectra Default". */
function themeNameFromFile(filename: string): string {
  return filename
    .replace(/^sg-theme-/, '')
    .replace(/\.css$/, '')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Parse --sg-* properties from a CSS :root block. */
function parseRootProperties(content: string): Record<string, string> {
  const properties: Record<string, string> = {};
  const rootMatch = content.match(/:root\s*\{([^}]+)\}/);
  if (!rootMatch) return properties;
  const propRegex = /(--sg-[\w-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = propRegex.exec(rootMatch[1]!)) !== null) {
    properties[m[1]!] = m[2]!.trim();
  }
  return properties;
}

/** Vite plugin that saves/loads theme CSS files from the Theme Builder. */
function themePlugin(): Plugin {
  const THEMES_DIR = path.resolve(__dirname, '..', 'src', 'themes');

  return {
    name: 'theme-plugin',
    configureServer(server) {
      // ── GET /api/themes — list all available theme files ──
      server.middlewares.use('/api/themes', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        try {
          const files = fs.readdirSync(THEMES_DIR).filter(f => f.startsWith('sg-theme-') && f.endsWith('.css')).sort();
          const themes: Array<{ name: string; properties: Record<string, string> }> = [];
          for (const file of files) {
            const content = fs.readFileSync(path.join(THEMES_DIR, file), 'utf-8');
            const properties = parseRootProperties(content);
            if (Object.keys(properties).length > 0) {
              themes.push({ name: themeNameFromFile(file), properties });
            }
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ themes }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(err) }));
        }
      });

      // ── POST /api/save-theme — save a theme to a CSS file ──
      server.middlewares.use('/api/save-theme', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

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

            const slug = name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'untitled';
            const filename = `sg-theme-${slug}.css`;
            const filepath = path.join(THEMES_DIR, filename);

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
    config.plugins?.push(themePlugin());
    return config;
  },
};

export default config;
