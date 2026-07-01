import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

// ─── Import all components for the preview gallery ───
import '../components/sg-button.js';
import '../components/sg-card.js';
import '../components/sg-badge.js';
import '../components/sg-input.js';
import '../components/sg-toggle.js';
import '../components/sg-checkbox.js';
import '../components/sg-radio.js';
import '../components/sg-radio-group.js';
import '../components/sg-spinner.js';
import '../components/sg-progress.js';
import '../components/sg-divider.js';
import '../components/sg-avatar.js';
import '../components/sg-accordion.js';
import '../components/sg-icon.js';

// ─── Types ───

type PropertyType = 'hex' | 'rgba' | 'length' | 'blur' | 'duration' | 'text' | 'shadow';

interface PropertyDef {
  name: string;
  label: string;
  category: string;
  type: PropertyType;
  default: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  readonly?: boolean;
}

interface ThemePresets {
  [name: string]: Record<string, string>;
}

// ─── Property Registry ───

const PROPERTY_DEFS: PropertyDef[] = [
  // Glass Surfaces
  { name: '--sg-glass-bg',             label: 'Glass BG',        category: 'Glass Surfaces', type: 'rgba', default: 'rgba(255, 255, 255, 0.08)' },
  { name: '--sg-glass-bg-hover',       label: 'Glass BG Hover',  category: 'Glass Surfaces', type: 'rgba', default: 'rgba(255, 255, 255, 0.14)' },
  { name: '--sg-glass-bg-active',      label: 'Glass BG Active', category: 'Glass Surfaces', type: 'rgba', default: 'rgba(255, 255, 255, 0.18)' },
  { name: '--sg-glass-border',         label: 'Glass Border',    category: 'Glass Surfaces', type: 'rgba', default: 'rgba(255, 255, 255, 0.12)' },
  { name: '--sg-glass-border-hover',   label: 'Border Hover',    category: 'Glass Surfaces', type: 'rgba', default: 'rgba(255, 255, 255, 0.25)' },
  { name: '--sg-glass-border-strong',  label: 'Border Strong',   category: 'Glass Surfaces', type: 'rgba', default: 'rgba(255, 255, 255, 0.35)' },
  { name: '--sg-glass-shadow',         label: 'Shadow',          category: 'Glass Surfaces', type: 'shadow', default: '0 4px 24px rgba(0,0,0,0.12)' },
  { name: '--sg-glass-shadow-lg',      label: 'Shadow LG',       category: 'Glass Surfaces', type: 'shadow', default: '0 8px 48px rgba(0,0,0,0.18)' },
  { name: '--sg-glass-blur',           label: 'Blur',            category: 'Glass Surfaces', type: 'blur', default: 'blur(20px)', min: 0, max: 60, unit: 'px' },
  { name: '--sg-glass-blur-sm',        label: 'Blur SM',         category: 'Glass Surfaces', type: 'blur', default: 'blur(12px)', min: 0, max: 60, unit: 'px' },

  // Spectral Colors
  { name: '--sg-spectral-color1',   label: 'Color 1',        category: 'Spectral Colors', type: 'hex', default: '#d4869f' },
  { name: '--sg-spectral-color2',   label: 'Color 2',        category: 'Spectral Colors', type: 'hex', default: '#d4956a' },
  { name: '--sg-spectral-color3',   label: 'Color 3',        category: 'Spectral Colors', type: 'hex', default: '#c4a050' },
  { name: '--sg-spectral-color4',   label: 'Color 4',        category: 'Spectral Colors', type: 'hex', default: '#7fa88d' },
  { name: '--sg-spectral-color5',   label: 'Color 5',        category: 'Spectral Colors', type: 'hex', default: '#6fa0b5' },
  { name: '--sg-spectral-color6',   label: 'Color 6',        category: 'Spectral Colors', type: 'hex', default: '#7a80c0' },
  { name: '--sg-spectral-color7',   label: 'Color 7',        category: 'Spectral Colors', type: 'hex', default: '#9a7ab5' },

  // Typography
  { name: '--sg-text-primary',   label: 'Text Primary',   category: 'Typography', type: 'rgba', default: 'rgba(255, 255, 255, 0.9)' },
  { name: '--sg-text-secondary', label: 'Text Secondary', category: 'Typography', type: 'rgba', default: 'rgba(255, 255, 255, 0.6)' },
  { name: '--sg-text-tertiary',  label: 'Text Tertiary',  category: 'Typography', type: 'rgba', default: 'rgba(255, 255, 255, 0.4)' },
  { name: '--sg-font-family',    label: 'Font Family',    category: 'Typography', type: 'text', default: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },

  // Spacing & Radii
  { name: '--sg-radius-xs',   label: 'Radius XS',  category: 'Spacing & Radii', type: 'length', default: '4px',   min: 0, max: 24,  unit: 'px' },
  { name: '--sg-radius-sm',   label: 'Radius SM',  category: 'Spacing & Radii', type: 'length', default: '8px',   min: 0, max: 32,  unit: 'px' },
  { name: '--sg-radius-md',   label: 'Radius MD',  category: 'Spacing & Radii', type: 'length', default: '12px',  min: 0, max: 40,  unit: 'px' },
  { name: '--sg-radius-lg',   label: 'Radius LG',  category: 'Spacing & Radii', type: 'length', default: '20px',  min: 0, max: 48,  unit: 'px' },
  { name: '--sg-radius-xl',   label: 'Radius XL',  category: 'Spacing & Radii', type: 'length', default: '28px',  min: 0, max: 60,  unit: 'px' },
  { name: '--sg-radius-full', label: 'Radius Full', category: 'Spacing & Radii', type: 'length', default: '9999px', min: 0, max: 100, unit: 'px' },

  // Motion
  { name: '--sg-transition-fast',  label: 'Fast',  category: 'Motion', type: 'duration', default: '150ms', min: 0, max: 1000, unit: 'ms' },
  { name: '--sg-transition-base',  label: 'Base',  category: 'Motion', type: 'duration', default: '250ms', min: 0, max: 1000, unit: 'ms' },
  { name: '--sg-transition-slow',  label: 'Slow',  category: 'Motion', type: 'duration', default: '400ms', min: 0, max: 2000, unit: 'ms' },
];

// ─── Gradient Definitions (linked to spectral colors) ───

interface GradientStop {
  varName: string;  // spectral color variable, e.g. '--sg-spectral-color1'
  alpha: number;
}

interface GradientDef {
  name: string;
  label: string;
  stops: GradientStop[];
}

const GRADIENT_DEFS: GradientDef[] = [
  {
    name: '--sg-gradient-spectral',
    label: 'Spectral',
    stops: [
      { varName: '--sg-spectral-color1', alpha: 0.5 },
      { varName: '--sg-spectral-color3', alpha: 0.5 },
      { varName: '--sg-spectral-color4', alpha: 0.5 },
      { varName: '--sg-spectral-color6', alpha: 0.5 },
    ],
  },
  {
    name: '--sg-gradient-spectral-warm',
    label: 'Spectral Warm',
    stops: [
      { varName: '--sg-spectral-color1', alpha: 0.5 },
      { varName: '--sg-spectral-color2', alpha: 0.5 },
      { varName: '--sg-spectral-color3', alpha: 0.5 },
    ],
  },
  {
    name: '--sg-gradient-spectral-cool',
    label: 'Spectral Cool',
    stops: [
      { varName: '--sg-spectral-color4', alpha: 0.5 },
      { varName: '--sg-spectral-color5', alpha: 0.5 },
      { varName: '--sg-spectral-color6', alpha: 0.5 },
    ],
  },
  {
    name: '--sg-gradient-spectral-strong',
    label: 'Spectral Strong',
    stops: [
      { varName: '--sg-spectral-color1', alpha: 0.75 },
      { varName: '--sg-spectral-color3', alpha: 0.75 },
      { varName: '--sg-spectral-color4', alpha: 0.75 },
      { varName: '--sg-spectral-color6', alpha: 0.75 },
    ],
  },
];

/** Built-in spectral variable names (never changes). */
const BUILTIN_SPECTRAL_VARS = PROPERTY_DEFS
  .filter(d => d.category === 'Spectral Colors')
  .map(d => d.name);

const CATEGORIES = ['Glass Surfaces', 'Spectral Colors', 'Gradients', 'Typography', 'Spacing & Radii', 'Motion'];
const STORAGE_KEY = 'sg-theme-builder-presets';
const ACTIVE_KEY = 'sg-theme-builder-active';
const LABELS_KEY = 'sg-theme-builder-labels';

function loadThemeLabels(): Record<string, Record<string, string>> {
  try { return JSON.parse(localStorage.getItem(LABELS_KEY) || '{}'); } catch { return {}; }
}

function saveThemeLabels(labels: Record<string, Record<string, string>>): void {
  localStorage.setItem(LABELS_KEY, JSON.stringify(labels));
}

// ─── Helpers ───

interface RGBA { r: number; g: number; b: number; a: number; }

function parseRGBA(value: string): RGBA | null {
  const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return null;
  return { r: +m[1]!, g: +m[2]!, b: +m[3]!, a: m[4] !== undefined ? +m[4]! : 1 };
}

function formatRGBA(r: number, g: number, b: number, a: number): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
  if (!m) return null;
  return { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16) };
}

function extractNumericValue(value: string): number {
  const m = value.match(/([\d.]+)/);
  return m ? parseFloat(m[1]!) : 0;
}

function extractBlurPx(value: string): number {
  const m = value.match(/blur\(([\d.]+)px\)/);
  return m ? parseFloat(m[1]!) : 0;
}

function extractGradientAngle(value: string): number {
  const m = value.match(/(\d+)deg/);
  return m ? parseFloat(m[1]!) : 135;
}

function buildGradient(grad: GradientDef, angle: number, spectralValues: Record<string, string>, positions?: number[]): string {
  const stops = grad.stops.map((s, i) => {
    const color = spectralValues[s.varName] ?? '#000';
    const rgb = hexToRgb(color);
    const rgba = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},${s.alpha})` : `rgba(128,128,128,${s.alpha})`;
    const pos = positions?.[i];
    return pos !== undefined ? `${rgba} ${pos}%` : rgba;
  });
  return `linear-gradient(${angle}deg, ${stops.join(', ')})`;
}

/** Try to match an rgba string back to a spectral color variable. */
function matchRgbaToSpectralVar(rgbaStr: string, spectralValues: Record<string, string>): string | null {
  const parsed = parseRGBA(rgbaStr);
  if (!parsed) return null;
  for (const [varName, hex] of Object.entries(spectralValues)) {
    if (!varName.startsWith('--sg-spectral-')) continue;
    const rgb = hexToRgb(hex);
    if (rgb && rgb.r === parsed.r && rgb.g === parsed.g && rgb.b === parsed.b) return varName;
  }
  return null;
}

/** Reconstruct gradient stops + positions from a CSS gradient value by matching colors to spectral vars. */
function parseGradientStops(value: string, spectralValues: Record<string, string>, defaultStops: GradientStop[]): { stops: GradientStop[]; positions: number[] } {
  // Extract all rgba(...) parts with optional positions
  const regex = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)(?:\s+(\d+)%)?/g;
  const stops: GradientStop[] = [];
  const positions: number[] = [];
  let match;
  while ((match = regex.exec(value)) !== null) {
    const r = +match[1]!, g = +match[2]!, b = +match[3]!, a = +match[4]!;
    const rgbaStr = `rgba(${r},${g},${b},${a})`;
    const varName = matchRgbaToSpectralVar(rgbaStr, spectralValues) ?? `--sg-spectral-${r}_${g}_${b}`;
    stops.push({ varName, alpha: a });
    positions.push(match[5] !== undefined ? +match[5]! : -1);
  }
  // If we couldn't parse any stops, use defaults
  if (stops.length === 0) {
    return { stops: [...defaultStops], positions: defaultGradientPositions(defaultStops) };
  }
  // Fill in missing positions
  const filled = positions.map((p, i) => p >= 0 ? p : (stops.length > 1 ? Math.round((i / (stops.length - 1)) * 100) : 0));
  return { stops, positions: filled };
}

function defaultGradientPositions(stops: GradientStop[]): number[] {
  return stops.map((_, i) => (stops.length > 1 ? Math.round((i / (stops.length - 1)) * 100) : 0));
}

// ─── Theme Presets Manager ───

function loadPresets(): ThemePresets {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function savePresets(presets: ThemePresets): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

function loadActiveTheme(): string {
  return localStorage.getItem(ACTIVE_KEY) || 'Spectra Default';
}

function saveActiveTheme(name: string): void {
  localStorage.setItem(ACTIVE_KEY, name);
}

function propertiesToCSS(properties: Record<string, string>): string {
  const lines: string[] = [':root {'];
  for (const [name, value] of Object.entries(properties)) {
    if (name.startsWith('--sg-')) {
      lines.push(`  ${name}: ${value};`);
    }
  }
  lines.push('}');
  return lines.join('\n');
}

// ─── Component ───

/**
 * Interactive theme customizer for Spectra Glass UI.
 *
 * Provides real-time controls for all `--sg-*` CSS custom properties,
 * a live component preview gallery, multi-theme preset management,
 * and CSS export.
 *
 * @cssprop [--tb-sidebar-width=340px] - Sidebar width.
 */
export class SgThemeBuilder extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      width: 100%;
      height: 100%;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #e0e0e0;
      background: #12121a;
      overflow: hidden;
      --tb-sidebar-width: 340px;
    }

    /* ─── Layout ─── */

    .builder {
      display: flex;
      width: 100%;
      height: 100%;
    }

    .sidebar {
      width: var(--tb-sidebar-width, 340px);
      min-width: var(--tb-sidebar-width, 340px);
      height: 100%;
      display: flex;
      flex-direction: column;
      background: rgba(20, 20, 30, 0.95);
      border-right: 1px solid rgba(255, 255, 255, 0.06);
      overflow: hidden;
    }

    .preview {
      flex: 1;
      height: 100%;
      overflow-y: auto;
      padding: 24px;
      box-sizing: border-box;
    }

    /* ─── Toolbar ─── */

    .toolbar {
      padding: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      flex-shrink: 0;
    }

    .toolbar__title {
      font-size: 1rem;
      font-weight: 700;
      margin: 0 0 12px;
      letter-spacing: -0.01em;
      color: #fff;
    }

    .toolbar__row {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .toolbar__row select {
      flex: 1;
      min-width: 0;
      padding: 6px 28px 6px 8px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.06);
      color: #e0e0e0;
      font-size: 0.8125rem;
      font-family: inherit;
      cursor: pointer;
      outline: none;
      appearance: none;
      -webkit-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='1.5'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
    }
    .toolbar__row select:focus-visible {
      border-color: rgba(255, 255, 255, 0.3);
    }
    .toolbar__row select:hover {
      border-color: rgba(255, 255, 255, 0.2);
    }
    .toolbar__row select option {
      background: #1e1e2e;
      color: #e0e0e0;
    }

    .tb-btn {
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.06);
      color: #ccc;
      font-size: 0.75rem;
      font-family: inherit;
      cursor: pointer;
      white-space: nowrap;
      transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
    }
    .tb-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.25);
      color: #fff;
    }
    .tb-btn--primary {
      background: linear-gradient(135deg, rgba(212,134,159,0.4), rgba(196,160,80,0.4));
      border-color: rgba(255, 255, 255, 0.15);
      color: #fff;
    }
    .tb-btn--primary:hover {
      background: linear-gradient(135deg, rgba(212,134,159,0.6), rgba(196,160,80,0.6));
    }
    .tb-btn--copy {
      background: linear-gradient(135deg, rgba(127,168,141,0.4), rgba(111,160,181,0.4));
      border-color: rgba(255, 255, 255, 0.15);
    }
    .tb-btn--copy:hover {
      background: linear-gradient(135deg, rgba(127,168,141,0.6), rgba(111,160,181,0.6));
    }
    .tb-btn--source {
      background: linear-gradient(135deg, rgba(122,128,192,0.4), rgba(154,122,181,0.4));
      border-color: rgba(255, 255, 255, 0.15);
    }
    .tb-btn--source:hover {
      background: linear-gradient(135deg, rgba(122,128,192,0.6), rgba(154,122,181,0.6));
    }
    .tb-btn--delete {
      flex-shrink: 0;
      width: 30px;
      padding: 0;
      border-color: rgba(200, 80, 80, 0.3);
      color: rgba(255, 150, 150, 0.5);
      font-size: 0.75rem;
    }
    .tb-btn--delete:hover {
      background: rgba(200, 50, 50, 0.3);
      border-color: rgba(200, 80, 80, 0.5);
      color: #ff8888;
    }
    .tb-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* ─── Sidebar scrollable area ─── */

    .controls {
      flex: 1;
      overflow-y: auto;
      padding: 8px 0;
    }
    .controls::-webkit-scrollbar {
      width: 4px;
    }
    .controls::-webkit-scrollbar-track {
      background: transparent;
    }
    .controls::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.12);
      border-radius: 2px;
    }

    /* ─── Category section ─── */

    .category {
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    .category__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      cursor: pointer;
      user-select: none;
      transition: background 150ms ease;
    }
    .category__header:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    .category__title {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: rgba(255, 255, 255, 0.5);
      margin: 0;
    }

    .category__chevron {
      font-size: 0.625rem;
      color: rgba(255, 255, 255, 0.3);
      transition: transform 200ms ease;
    }
    .category__chevron--open {
      transform: rotate(180deg);
    }

    .category__body {
      padding: 0 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .category__body--closed {
      display: none;
    }

    /* ─── Property control ─── */

    .control {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .control__label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.55);
    }
    .control__label code {
      font-size: 0.6875rem;
      color: rgba(255, 255, 255, 0.35);
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
    }

    .control__value {
      font-size: 0.6875rem;
      color: rgba(255, 255, 255, 0.4);
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: right;
    }

    .control__input-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* ─── Range slider ─── */

    .control__range {
      flex: 1;
      -webkit-appearance: none;
      appearance: none;
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.12);
      outline: none;
      cursor: pointer;
    }
    .control__range::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #c4a050;
      border: 2px solid rgba(255, 255, 255, 0.2);
      cursor: pointer;
      transition: border-color 150ms ease;
    }
    .control__range::-webkit-slider-thumb:hover {
      border-color: rgba(255, 255, 255, 0.5);
    }
    .control__range::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #c4a050;
      border: 2px solid rgba(255, 255, 255, 0.2);
      cursor: pointer;
    }
    .control__range-value {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.6);
      min-width: 44px;
      text-align: right;
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
    }

    /* ─── Color swatch + picker ─── */

    .control__swatch-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .control__swatch {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      flex-shrink: 0;
      cursor: pointer;
      position: relative;
      overflow: hidden;
    }
    .control__swatch::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(45deg, rgba(255,255,255,0.08) 25%, transparent 25%),
        linear-gradient(-45deg, rgba(255,255,255,0.08) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.08) 75%),
        linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.08) 75%);
      background-size: 8px 8px;
      background-position: 0 0, 0 4px, 4px -4px, -4px 0;
      pointer-events: none;
    }
    .control__swatch-fill {
      position: absolute;
      inset: 0;
      border-radius: 5px;
    }

    .control__color-picker {
      flex: 1;
      -webkit-appearance: none;
      appearance: none;
      width: 36px;
      height: 28px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      padding: 0;
      cursor: pointer;
      background: none;
    }
    .control__color-picker::-webkit-color-swatch-wrapper {
      padding: 2px;
    }
    .control__color-picker::-webkit-color-swatch {
      border: none;
      border-radius: 4px;
    }
    .control__color-picker::-moz-color-swatch {
      border: none;
      border-radius: 4px;
    }

    .control__alpha-slider {
      flex: 1;
      -webkit-appearance: none;
      appearance: none;
      height: 4px;
      border-radius: 2px;
      background: linear-gradient(to right, transparent, var(--_alpha-end, #fff));
      outline: none;
      cursor: pointer;
    }
    .control__alpha-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #c4a050;
      border: 2px solid rgba(255, 255, 255, 0.2);
      cursor: pointer;
    }
    .control__alpha-slider::-moz-range-thumb {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #c4a050;
      border: 2px solid rgba(255, 255, 255, 0.2);
    }

    .control__alpha-label {
      font-size: 0.6875rem;
      color: rgba(255, 255, 255, 0.5);
      min-width: 36px;
      text-align: right;
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
    }

    /* ─── Text input ─── */

    .control__text {
      flex: 1;
      padding: 5px 8px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.04);
      color: #e0e0e0;
      font-size: 0.75rem;
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
      outline: none;
    }
    .control__text:focus {
      border-color: rgba(255, 255, 255, 0.3);
    }

    /* ─── Gradient swatch (read-only) ─── */

    .control__gradient {
      height: 32px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    /* ─── Gradient bar with draggable knobs ─── */

    .gradient-bar-wrap {
      position: relative;
      margin-bottom: 4px;
    }

    .gradient-bar {
      position: relative;
      height: 28px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      cursor: pointer;
      overflow: visible;
    }

    .gradient-knob {
      position: absolute;
      top: 50%;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2.5px solid rgba(255, 255, 255, 0.5);
      transform: translate(-50%, -50%);
      cursor: grab;
      z-index: 2;
      box-shadow: 0 1px 6px rgba(0, 0, 0, 0.3);
      transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;
      touch-action: none;
    }
    .gradient-knob:hover {
      border-color: rgba(255, 255, 255, 0.85);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.45);
      transform: translate(-50%, -50%) scale(1.15);
      z-index: 3;
    }
    .gradient-knob--dragging {
      border-color: #fff;
      box-shadow: 0 2px 16px rgba(0, 0, 0, 0.5);
      transform: translate(-50%, -50%) scale(1.25);
      z-index: 4;
      cursor: grabbing;
    }

    .gradient-knob__remove {
      position: absolute;
      top: -7px;
      right: -7px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: none;
      background: rgba(0, 0, 0, 0.6);
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.5rem;
      line-height: 1;
      cursor: pointer;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .gradient-knob:hover .gradient-knob__remove {
      display: flex;
    }
    .gradient-knob__remove:hover {
      background: rgba(200, 50, 50, 0.8);
      color: #fff;
    }

    .gradient-knob__label {
      position: absolute;
      top: calc(100% + 4px);
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.5625rem;
      color: rgba(255, 255, 255, 0.35);
      white-space: nowrap;
      pointer-events: none;
    }

    .gradient-add-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 5px;
      border: 1px dashed rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.03);
      color: rgba(255, 255, 255, 0.4);
      font-size: 0.6875rem;
      font-family: inherit;
      cursor: pointer;
      transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
      margin-top: 2px;
    }
    .gradient-add-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.3);
      color: rgba(255, 255, 255, 0.7);
    }

    .gradient-add-picker {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      padding: 6px 0 2px;
    }
    .gradient-add-picker__swatch {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      border: 1.5px solid rgba(255, 255, 255, 0.15);
      cursor: pointer;
      transition: border-color 120ms ease, transform 120ms ease;
    }
    .gradient-add-picker__swatch:hover {
      border-color: rgba(255, 255, 255, 0.5);
      transform: scale(1.15);
    }
    .gradient-add-picker__swatch--used {
      opacity: 0.35;
      pointer-events: none;
    }

    /* ─── Compact spectral color row ─── */

    .spectral-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 3px 0;
    }
    .spectral-row__swatch {
      position: relative;
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      border-radius: 4px;
      border: 1.5px solid rgba(255, 255, 255, 0.15);
      cursor: pointer;
      transition: border-color 120ms ease, transform 120ms ease;
    }
    .spectral-row__swatch:hover {
      border-color: rgba(255, 255, 255, 0.4);
      transform: scale(1.1);
    }
    .spectral-row__hex {
      font-size: 0.625rem;
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
      color: rgba(255, 255, 255, 0.35);
      min-width: 58px;
    }
    .spectral-row__name {
      flex: 1;
      min-width: 0;
      font-size: 0.625rem;
      color: rgba(255, 255, 255, 0.3);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: pointer;
    }
    .spectral-row__name:hover {
      color: rgba(255, 255, 255, 0.5);
    }
    .spectral-row__edit {
      flex: 1;
      min-width: 0;
      padding: 1px 4px;
      border-radius: 3px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.06);
      color: #e0e0e0;
      font-size: 0.625rem;
      font-family: inherit;
      outline: none;
    }

    /* ─── Shadow preview (read-only-ish) ─── */

    .control__shadow {
      flex: 1;
      padding: 5px 8px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.04);
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.6875rem;
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
      outline: none;
    }
    .control__shadow:focus {
      border-color: rgba(255, 255, 255, 0.3);
      color: #e0e0e0;
    }

    /* ─── Preview Gallery ─── */

    .preview__title {
      font-size: 0.8125rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 0 0 20px;
    }

    .preview__grid {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .preview__row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }

    .preview__row-label {
      font-size: 0.6875rem;
      color: rgba(255, 255, 255, 0.3);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      min-width: 80px;
      flex-shrink: 0;
    }

    .preview__card {
      width: 220px;
    }

    .preview__section {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid rgba(255, 255, 255, 0.04);
    }

    .preview__section-title {
      font-size: 0.6875rem;
      color: rgba(255, 255, 255, 0.25);
      margin: 0 0 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* ─── Toast notification ─── */

    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 20px;
      border-radius: 10px;
      background: rgba(30, 30, 50, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #e0e0e0;
      font-size: 0.8125rem;
      z-index: 9999;
      pointer-events: none;
      animation: toastIn 250ms ease forwards;
    }

    @keyframes toastIn {
      from { opacity: 0; transform: translateX(-50%) translateY(12px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
  `;

  // ─── Reactive state ───

  @state() private _activeTheme: string = 'Spectra Default';
  @state() private _presets: ThemePresets = {};
  @state() private _properties: Record<string, string> = {};
  @state() private _collapsed: Record<string, boolean> = {};
  @state() private _toastMsg: string = '';
  @state() private _gradientAngles: Record<string, number> = {};
  /** Per-gradient dynamic stops (may differ from GRADIENT_DEFS after add/remove). */
  @state() private _gradientStops: Record<string, GradientStop[]> = {};
  /** Per-gradient, per-stop positions (0–100). */
  @state() private _gradientPositions: Record<string, number[]> = {};
  /** Gradient name currently showing the color picker for adding stops. */
  @state() private _isAdding: string | null = null;
  /** Gradient name + stop index currently being dragged. */
  private _dragging: { gradName: string; index: number; knob: HTMLElement } | null = null;
  /** Theme class name currently on <html>. */
  private _currentThemeClass: string = '';

  private _saveTimer: ReturnType<typeof setTimeout> | null = null;
  private _toastTimer: ReturnType<typeof setTimeout> | null = null;

  /** Per-theme custom labels for spectral colors: themeName → varName → label. */
  private _allLabels: Record<string, Record<string, string>> = {};
  /** Custom labels for the active theme (varName → label). */
  @state() private _spectralLabels: Record<string, string> = {};
  /** Var name currently being renamed via inline edit. */
  @state() private _editingLabel: string | null = null;

  // ─── Lifecycle ───

  override connectedCallback(): void {
    super.connectedCallback();
    this._presets = loadPresets();
    this._activeTheme = loadActiveTheme();
    this._allLabels = loadThemeLabels();
    this._spectralLabels = this._allLabels[this._activeTheme] || {};
    this._properties = this._getDefaultProperties();

    // Apply saved preset if it exists and isn't default
    if (this._activeTheme !== 'Spectra Default' && this._presets[this._activeTheme]) {
      this._properties = { ...this._presets[this._activeTheme]! };
    }

    this._swapThemeClass();
    // Init gradient state from current computed values
    this._initGradients();

    // All categories start open by default
  }

  private _getDefaultProperties(): Record<string, string> {
    const props: Record<string, string> = {};
    for (const def of PROPERTY_DEFS) {
      props[def.name] = def.default;
    }
    return props;
  }

  private get _themeClassName(): string {
    const name = this._activeTheme.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return `sg-theme-${name || 'default'}`;
  }

  private _swapThemeClass(): void {
    if (this._currentThemeClass) {
      document.documentElement.classList.remove(this._currentThemeClass);
    }
    this._currentThemeClass = this._themeClassName;
    document.documentElement.classList.add(this._currentThemeClass);
  }

  private _ensureStyleElement(): HTMLStyleElement {
    let el = document.getElementById('sg-active-theme') as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = 'sg-active-theme';
      document.head.appendChild(el);
    }
    return el;
  }

  private _rebuildStylesheet(): void {
    const el = this._ensureStyleElement();
    const className = this._currentThemeClass || this._themeClassName;
    const lines: string[] = [];
    lines.push(`.${className} {`);
    for (const [name, value] of Object.entries(this._properties)) {
      if (name.startsWith('--sg-')) {
        lines.push(`  ${name}: ${value};`);
      }
    }
    lines.push('}');
    el.textContent = lines.join('\n');
  }

  private _initGradients(): void {
    const angles: Record<string, number> = {};
    const stopsAll: Record<string, GradientStop[]> = {};
    const positions: Record<string, number[]> = {};
    for (const grad of GRADIENT_DEFS) {
      const val = this._properties[grad.name];
      angles[grad.name] = val ? extractGradientAngle(val) : 135;
      // Parse dynamic stops+positions from CSS value or fallback to defaults
      const parsed = val
        ? parseGradientStops(val, this._properties, grad.stops)
        : { stops: [...grad.stops.map(s => ({ ...s }))], positions: defaultGradientPositions(grad.stops) };
      stopsAll[grad.name] = parsed.stops;
      positions[grad.name] = parsed.positions;
    }
    this._gradientAngles = angles;
    this._gradientStops = stopsAll;
    this._gradientPositions = positions;

    // Rebuild gradients from spectral colors (ensures they exist)
    this._rebuildGradients();
  }

  // ─── Public API ───

  /** Add or overwrite a preset. */
  addPreset(name: string, properties?: Record<string, string>): void {
    const presets = { ...this._presets };
    presets[name] = properties ? { ...properties } : { ...this._properties };
    this._presets = presets;
    savePresets(presets);
    this.requestUpdate();
  }

  /** Delete a preset programmatically. */
  deletePreset(name: string): void {
    if (name === 'Spectra Default') return;
    const presets = { ...this._presets };
    delete presets[name];
    this._presets = presets;
    savePresets(presets);
    if (this._activeTheme === name) {
      this.selectTheme('Spectra Default');
    }
    this.requestUpdate();
  }

  /** Switch to a theme preset. */
  selectTheme(name: string): void {
    this._activeTheme = name;
    saveActiveTheme(name);
    this._spectralLabels = this._allLabels[name] || {};
    this._swapThemeClass();
    if (name === 'Spectra Default') {
      this._properties = this._getDefaultProperties();
    } else if (this._presets[name]) {
      this._properties = { ...this._presets[name] };
    }

    this._initGradients();
  }

  // ─── Event handlers ───

  private _handleThemeChange(e: Event): void {
    const name = (e.target as HTMLSelectElement).value;
    this.selectTheme(name);
  }

  private _handleAddNew(): void {
    const name = prompt('New theme name:', 'Untitled Theme');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    // Save current properties as the new preset
    this.addPreset(trimmed);
    this.selectTheme(trimmed);
    this._showToast(`Created "${trimmed}"`);
  }

  private _handleDeleteTheme(): void {
    const name = this._activeTheme;
    if (name === 'Spectra Default') return;
    if (!confirm(`Delete theme "${name}"? This cannot be undone.`)) return;
    this.deletePreset(name);
    this._showToast(`Deleted "${name}"`);
  }

  private _handleReset(): void {
    if (!confirm('Reset all properties to defaults?')) return;
    this._properties = this._getDefaultProperties();
    this._initGradients();
    this._showToast('Reset to defaults');
  }

  private _handleCopyCSS(): void {
    const css = propertiesToCSS(this._properties);
    navigator.clipboard.writeText(css).then(
      () => this._showToast('CSS copied to clipboard'),
      () => this._showToast('Failed to copy'),
    );
  }

  private async _handleSaveToSource(): Promise<void> {
    try {
      const res = await fetch('/api/save-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this._activeTheme,
          properties: this._properties,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        this._showToast(`Saved to source: ${data.file}`);
      } else {
        this._showToast(`Error: ${data.error}`);
      }
    } catch {
      this._showToast('Failed to save — is Storybook running?');
    }
  }

  private _showToast(msg: string): void {
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastMsg = msg;
    this._toastTimer = setTimeout(() => { this._toastMsg = ''; }, 2000);
  }

  private _toggleCategory(cat: string): void {
    this._collapsed = { ...this._collapsed, [cat]: !this._collapsed[cat] };
  }

  // ─── Property change handlers ───

  private _onHexChange(def: PropertyDef, e: Event): void {
    const value = (e.target as HTMLInputElement).value;
    this._setProperty(def.name, value);
  }

  private _onRGBAColorChange(def: PropertyDef, e: Event): void {
    const hex = (e.target as HTMLInputElement).value;
    const current = this._properties[def.name] ?? def.default;
    const rgba = parseRGBA(current);
    const rgb = hexToRgb(hex);
    if (!rgba || !rgb) return;
    const alpha = rgba.a;
    const value = formatRGBA(rgb.r, rgb.g, rgb.b, alpha);
    this._setProperty(def.name, value);
  }

  private _onRGBAAlphaChange(def: PropertyDef, e: Event): void {
    const alpha = parseFloat((e.target as HTMLInputElement).value);
    const current = this._properties[def.name] ?? def.default;
    const rgba = parseRGBA(current);
    if (!rgba) return;
    const value = formatRGBA(rgba.r, rgba.g, rgba.b, Math.round(alpha * 100) / 100);
    this._setProperty(def.name, value);
  }

  private _onSliderChange(def: PropertyDef, e: Event): void {
    const num = parseFloat((e.target as HTMLInputElement).value);
    let value: string;
    switch (def.type) {
      case 'blur':
        value = `blur(${num}${def.unit || 'px'})`;
        break;
      case 'duration':
        value = `${num}${def.unit || 'ms'}`;
        break;
      case 'length':
        value = `${num}${def.unit || 'px'}`;
        break;
      default:
        value = String(num);
    }
    this._setProperty(def.name, value);
  }

  private _onTextChange(def: PropertyDef, e: Event): void {
    const value = (e.target as HTMLInputElement).value;
    this._setProperty(def.name, value);
  }

  private _setProperty(name: string, value: string): void {
    this._properties = { ...this._properties, [name]: value };

    // Spectral color change → rebuild all linked gradients
    if (name.startsWith('--sg-spectral-')) {
      this._rebuildGradients();
    } else {
      this._rebuildStylesheet();
    }

    this._debounceSave();
  }

  private _onGradientAngleChange(defName: string, e: Event): void {
    const angle = parseFloat((e.target as HTMLInputElement).value);
    this._gradientAngles = { ...this._gradientAngles, [defName]: angle };
    this._rebuildGradients();
  }

  // ─── Gradient bar drag ───

  private _onBarPointerDown(defName: string, index: number, e: PointerEvent): void {
    // Ignore if clicking the remove button
    if ((e.target as HTMLElement).closest('.gradient-knob__remove')) return;
    const knob = (e.target as HTMLElement).closest('.gradient-knob') as HTMLElement | null;
    if (!knob) return;
    this._dragging = { gradName: defName, index, knob };
    knob.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => this._onBarPointerMove(defName, ev);
    const onUp = (ev: PointerEvent) => this._onBarPointerUp(defName, ev);
    this._onKnobPointerMove = onMove;
    this._onKnobPointerUp = onUp;
    knob.addEventListener('pointermove' as any, onMove);
    knob.addEventListener('pointerup' as any, onUp);
    knob.addEventListener('pointercancel' as any, onUp);

    this.requestUpdate();
  }

  private _onBarPointerMove(defName: string, e: PointerEvent): void {
    if (!this._dragging || this._dragging.gradName !== defName) return;
    const bar = this.shadowRoot!.querySelector(`[data-bar="${defName}"]`);
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let pct = Math.round((x / rect.width) * 100);
    pct = Math.max(0, Math.min(100, pct));

    const i = this._dragging.index;
    const positions = [...(this._gradientPositions[defName] ?? [])];
    // Clamp: prevent passing neighboring knobs
    const left = i > 0 ? positions[i - 1]! + 1 : 0;
    const right = i < positions.length - 1 ? positions[i + 1]! - 1 : 100;
    pct = Math.max(left, Math.min(right, pct));
    positions[i] = pct;
    this._gradientPositions = { ...this._gradientPositions, [defName]: positions };
    this._rebuildGradients();
  }

  private _onBarPointerUp(_defName: string, _e: PointerEvent): void {
    const drag = this._dragging;
    if (!drag) return;
    if (this._onKnobPointerMove && this._onKnobPointerUp) {
      drag.knob.removeEventListener('pointermove' as any, this._onKnobPointerMove);
      drag.knob.removeEventListener('pointerup' as any, this._onKnobPointerUp);
      drag.knob.removeEventListener('pointercancel' as any, this._onKnobPointerUp);
    }
    this._onKnobPointerMove = null;
    this._onKnobPointerUp = null;
    this._dragging = null;
    this.requestUpdate();
  }

  // Stored references for cleanup
  private _onKnobPointerMove: ((e: PointerEvent) => void) | null = null;
  private _onKnobPointerUp: ((e: PointerEvent) => void) | null = null;

  // ─── Add / remove stops ───

  private _toggleAddPicker(defName: string): void {
    this._isAdding = this._isAdding === defName ? null : defName;
  }

  private _addStop(defName: string, spectralVar: string): void {
    const stops = [...(this._gradientStops[defName] ?? [])];
    const positions = [...(this._gradientPositions[defName] ?? [])];
    // Insert in the middle
    const insertAt = stops.length > 0 ? Math.floor(stops.length / 2) : 0;
    stops.splice(insertAt, 0, { varName: spectralVar, alpha: 1 });
    // Assign position midway between neighbors
    const posBefore = insertAt > 0 ? positions[insertAt - 1]! : 0;
    const posAfter = insertAt < positions.length ? positions[insertAt]! : 100;
    const mid = (posBefore + posAfter) / 2;
    positions.splice(insertAt, 0, Math.round(isNaN(mid) ? 50 : mid));

    this._gradientStops = { ...this._gradientStops, [defName]: stops };
    this._gradientPositions = { ...this._gradientPositions, [defName]: positions };
    this._isAdding = null;
    this._rebuildGradients();
  }

  private _removeStop(defName: string, index: number): void {
    const stops = [...(this._gradientStops[defName] ?? [])];
    const positions = [...(this._gradientPositions[defName] ?? [])];
    if (stops.length <= 2) return; // minimum 2 stops
    stops.splice(index, 1);
    positions.splice(index, 1);
    this._gradientStops = { ...this._gradientStops, [defName]: stops };
    this._gradientPositions = { ...this._gradientPositions, [defName]: positions };
    this._rebuildGradients();
  }

  private _onGradientStopColorChange(stopVar: string, e: Event): void {
    const hex = (e.target as HTMLInputElement).value;
    this._setProperty(stopVar, hex);
  }

  // ─── All spectral variable names ───

  /** All spectral variable names (built-in only — custom colors removed). */
  private _getSpectralVars(): string[] {
    return BUILTIN_SPECTRAL_VARS;
  }

  private _renderSpectralColorRow(varName: string, defaultLabel: string, hex: string): TemplateResult {
    const label = this._spectralLabels[varName] || defaultLabel;
    const isEditing = this._editingLabel === varName;
    return html`
      <div class="spectral-row">
        <label class="spectral-row__swatch" style="background:${hex}" title="Click to pick color">
          <input type="color" .value=${hex} @input=${(e: Event) => this._onGradientStopColorChange(varName, e)} style="position:absolute;opacity:0;width:0;height:0;pointer-events:none" />
        </label>
        <span class="spectral-row__hex">${hex}</span>
        ${isEditing ? html`
          <input
            class="spectral-row__edit"
            type="text"
            .value=${label}
            @blur=${(e: Event) => this._finishEditingLabel(varName, (e.target as HTMLInputElement).value)}
            @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter') this._finishEditingLabel(varName, (e.target as HTMLInputElement).value); if (e.key === 'Escape') this._editingLabel = null; }}
            autofocus
            maxlength="30"
          />
        ` : html`
          <span class="spectral-row__name" title="${varName}" @click=${() => this._startEditingLabel(varName)}>${label}</span>
        `}
      </div>
    `;
  }

  private _startEditingLabel(varName: string): void {
    this._editingLabel = varName;
  }

  private _finishEditingLabel(varName: string, newLabel: string): void {
    const trimmed = newLabel.trim();
    if (trimmed) {
      this._spectralLabels = { ...this._spectralLabels, [varName]: trimmed };
      this._allLabels[this._activeTheme] = this._spectralLabels;
      saveThemeLabels(this._allLabels);
    }
    this._editingLabel = null;
  }

  private _rebuildGradients(): void {
    for (const grad of GRADIENT_DEFS) {
      const angle = this._gradientAngles[grad.name] ?? 135;
      const stops = this._gradientStops[grad.name] ?? grad.stops;
      const positions = this._gradientPositions[grad.name];
      const value = buildGradient({ name: grad.name, label: grad.label, stops }, angle, this._properties, positions);
      this._properties = { ...this._properties, [grad.name]: value };
    }
    this._rebuildStylesheet();
  }

  private _debounceSave(): void {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      if (this._activeTheme !== 'Spectra Default') {
        this.addPreset(this._activeTheme);
      }
    }, 500);
  }

  // ─── Render helpers ───

  private _renderControl(def: PropertyDef): TemplateResult {
    const value = this._properties[def.name] ?? def.default;

    if (def.type === 'hex') {
      return this._renderHexControl(def, value);
    }
    if (def.type === 'rgba') {
      return this._renderRGBAControl(def, value);
    }
    if (def.type === 'length' || def.type === 'duration' || def.type === 'blur') {
      return this._renderSliderControl(def, value);
    }
    if (def.type === 'text') {
      return this._renderTextControl(def, value);
    }
    if (def.type === 'shadow') {
      return this._renderShadowControl(def, value);
    }
    return html``;
  }

  private _renderHexControl(def: PropertyDef, value: string): TemplateResult {
    return html`
      <div class="control">
        <div class="control__label">
          <span>${def.label}</span>
          <code>${def.name}</code>
        </div>
        <div class="control__swatch-row">
          <span class="control__swatch">
            <span class="control__swatch-fill" style="background:${value}"></span>
          </span>
          <input
            class="control__color-picker"
            type="color"
            .value=${value}
            @input=${(e: Event) => this._onHexChange(def, e)}
          />
          <span class="control__value">${value}</span>
        </div>
      </div>
    `;
  }

  private _renderRGBAControl(def: PropertyDef, value: string): TemplateResult {
    const rgba = parseRGBA(value);
    const hex = rgba ? rgbToHex(rgba.r, rgba.g, rgba.b) : '#ffffff';
    const alpha = rgba?.a ?? 1;
    const alphaPct = Math.round(alpha * 100);

    return html`
      <div class="control">
        <div class="control__label">
          <span>${def.label}</span>
          <code>${def.name}</code>
        </div>
        <div class="control__swatch-row">
          <span class="control__swatch">
            <span class="control__swatch-fill" style="background:${value}"></span>
          </span>
          <input
            class="control__color-picker"
            type="color"
            .value=${hex}
            @input=${(e: Event) => this._onRGBAColorChange(def, e)}
          />
          <input
            class="control__alpha-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            .value=${alpha}
            @input=${(e: Event) => this._onRGBAAlphaChange(def, e)}
            style="--_alpha-end: ${hex}"
          />
          <span class="control__alpha-label">${alphaPct}%</span>
        </div>
      </div>
    `;
  }

  private _renderSliderControl(def: PropertyDef, value: string): TemplateResult {
    const num = def.type === 'blur' ? extractBlurPx(value) : extractNumericValue(value);
    const min = def.min ?? 0;
    const max = def.max ?? 100;
    const step = def.step ?? 1;
    const displayUnit = def.type === 'duration' ? 'ms' : 'px';

    return html`
      <div class="control">
        <div class="control__label">
          <span>${def.label}</span>
          <code>${def.name}</code>
        </div>
        <div class="control__input-row">
          <input
            class="control__range"
            type="range"
            min=${min}
            max=${max}
            step=${step}
            .value=${num}
            @input=${(e: Event) => this._onSliderChange(def, e)}
          />
          <span class="control__range-value">${num}${displayUnit}</span>
        </div>
      </div>
    `;
  }

  private _renderTextControl(def: PropertyDef, value: string): TemplateResult {
    return html`
      <div class="control">
        <div class="control__label">
          <span>${def.label}</span>
          <code>${def.name}</code>
        </div>
        <input
          class="control__text"
          type="text"
          .value=${value}
          @input=${(e: Event) => this._onTextChange(def, e)}
        />
      </div>
    `;
  }

  private _renderShadowControl(def: PropertyDef, value: string): TemplateResult {
    return html`
      <div class="control">
        <div class="control__label">
          <span>${def.label}</span>
          <code>${def.name}</code>
        </div>
        <input
          class="control__shadow"
          type="text"
          .value=${value}
          @input=${(e: Event) => this._onTextChange(def, e)}
        />
      </div>
    `;
  }

  private _renderGradientsCategory(): TemplateResult {
    const isOpen = !this._collapsed['Gradients'];
    const chevronClass = classMap({
      'category__chevron': true,
      'category__chevron--open': isOpen,
    });
    const bodyClass = classMap({
      'category__body': true,
      'category__body--closed': !isOpen,
    });

    return html`
      <div class="category">
        <div class="category__header" @click=${() => this._toggleCategory('Gradients')}>
          <h4 class="category__title">Gradients</h4>
          <span class=${chevronClass}>▼</span>
        </div>
        <div class=${bodyClass}>
          ${GRADIENT_DEFS.map(grad => this._renderGradient(grad))}
        </div>
      </div>
    `;
  }

  private _renderGradient(grad: GradientDef): TemplateResult {
    const value = this._properties[grad.name] ?? '';
    const angle = this._gradientAngles[grad.name] ?? 135;
    const stops = this._gradientStops[grad.name] ?? grad.stops;
    const positions = this._gradientPositions[grad.name] ?? defaultGradientPositions(stops);
    const showPicker = this._isAdding === grad.name;

    // Build list of already-used spectral vars for this gradient
    const usedVars = new Set(stops.map(s => s.varName));

    // Available spectral colors for the "add" picker
    const availableSpectral = this._getSpectralVars().filter(v => !usedVars.has(v));

    // Knob labels with % position
    const renderedKnobs = stops.map((stop, i) => {
      const color = this._properties[stop.varName] ?? '#888';
      const pos = positions[i] ?? 0;
      const pct = Math.round(stop.alpha * 100);
      const isDragging = this._dragging?.gradName === grad.name && this._dragging?.index === i;
      const knobClass = classMap({
        'gradient-knob': true,
        'gradient-knob--dragging': isDragging,
      });
      return html`
        <div
          class=${knobClass}
          style="left:${pos}%;background:${color}"
          data-knob="${grad.name}-${i}"
          @pointerdown=${(e: PointerEvent) => this._onBarPointerDown(grad.name, i, e)}
          title="${stop.varName} (${pct}%)"
          role="slider"
          tabindex="0"
          aria-label="Color stop ${i + 1} at ${pos}%"
          aria-valuenow=${pos}
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <button
            class="gradient-knob__remove"
            @click=${(e: Event) => { e.stopPropagation(); this._removeStop(grad.name, i); }}
            title="Remove stop"
            aria-label="Remove color stop ${i + 1}"
          >✕</button>
          <span class="gradient-knob__label">${pos}%</span>
        </div>
      `;
    });

    // Color picker for "add" mode
    const addPicker = showPicker && availableSpectral.length > 0 ? html`
      <div class="gradient-add-picker">
        ${availableSpectral.map(v => {
          const c = this._properties[v] ?? '#888';
          return html`
            <span
              class="gradient-add-picker__swatch"
              style="background:${c}"
              @click=${() => this._addStop(grad.name, v)}
              title="${v}"
            ></span>
          `;
        })}
      </div>
    ` : null;

    return html`
      <div class="control">
        <div class="control__label">
          <span>${grad.label}</span>
          <code>${grad.name}</code>
        </div>
        <!-- Gradient bar with knobs -->
        <div class="gradient-bar-wrap">
          <div
            class="gradient-bar"
            style="background:${value}"
            data-bar="${grad.name}"
          >
            ${renderedKnobs}
          </div>
        </div>
        <!-- Angle slider -->
        <div class="control__input-row" style="margin-bottom:6px">
          <input
            class="control__range"
            type="range"
            min="0"
            max="360"
            step="1"
            .value=${angle}
            @input=${(e: Event) => this._onGradientAngleChange(grad.name, e)}
          />
          <span class="control__range-value">${angle}°</span>
        </div>
        <!-- Color stops as clickable chips -->
        <div style="display:flex;flex-wrap:wrap;gap:3px;margin:2px 0">
          ${stops.map((stop, i) => {
            const color = this._properties[stop.varName] ?? '#888';
            const pos = positions[i] ?? 0;
            const pct = Math.round(stop.alpha * 100);
            return html`
              <label style="position:relative;cursor:pointer;display:inline-flex;align-items:center;gap:3px;padding:1px 5px 1px 3px;border-radius:4px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);font-size:0.625rem">
                <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${color};border:1px solid rgba(255,255,255,0.2)"></span>
                <span style="color:rgba(255,255,255,0.5)">${stop.varName.replace('--sg-spectral-', '')} ${pct}%</span>
                <span style="color:rgba(255,255,255,0.3)">${pos}%</span>
                <input
                  type="color"
                  .value=${color}
                  @input=${(e: Event) => this._onGradientStopColorChange(stop.varName, e)}
                  style="position:absolute;opacity:0;width:0;height:0;pointer-events:none"
                />
              </label>
            `;
          })}
        </div>
        <!-- Add stop button -->
        <div style="display:flex;gap:4px;align-items:center">
          <button class="gradient-add-btn" @click=${() => this._toggleAddPicker(grad.name)}>
            ${showPicker ? '− Cancel' : '+ Add Color'}
          </button>
          ${addPicker}
        </div>
      </div>
    `;
  }

  private _renderSpectralColorsCategory(): TemplateResult {
    const cat = 'Spectral Colors';
    const defs = PROPERTY_DEFS.filter(d => d.category === cat);
    const isOpen = !this._collapsed[cat];
    const chevronClass = classMap({
      'category__chevron': true,
      'category__chevron--open': isOpen,
    });
    const bodyClass = classMap({
      'category__body': true,
      'category__body--closed': !isOpen,
    });

    return html`
      <div class="category">
        <div class="category__header" @click=${() => this._toggleCategory(cat)}>
          <h4 class="category__title">Spectral Colors</h4>
          <span class=${chevronClass}>▼</span>
        </div>
        <div class=${bodyClass}>
          ${defs.map(d => this._renderSpectralColorRow(d.name, d.label, this._properties[d.name] ?? d.default))}
        </div>
      </div>
    `;
  }

  private _renderCategory(cat: string): TemplateResult {
    const defs = PROPERTY_DEFS.filter(d => d.category === cat);
    const isOpen = !this._collapsed[cat];
    const chevronClass = classMap({
      'category__chevron': true,
      'category__chevron--open': isOpen,
    });
    const bodyClass = classMap({
      'category__body': true,
      'category__body--closed': !isOpen,
    });

    return html`
      <div class="category">
        <div class="category__header" @click=${() => this._toggleCategory(cat)}>
          <h4 class="category__title">${cat}</h4>
          <span class=${chevronClass}>▼</span>
        </div>
        <div class=${bodyClass}>
          ${defs.map(d => this._renderControl(d))}
        </div>
      </div>
    `;
  }

  // ─── Preview Gallery ───

  private _renderPreview(): TemplateResult {
    return html`
      <div class="preview__grid">
        <!-- Buttons -->
        <div class="preview__section">
          <h5 class="preview__section-title">Buttons</h5>
          <div class="preview__row">
            <sg-button variant="primary">Primary</sg-button>
            <sg-button variant="secondary">Secondary</sg-button>
            <sg-button variant="ghost">Ghost</sg-button>
            <sg-button variant="primary" loading>Loading</sg-button>
            <sg-button variant="secondary" disabled>Disabled</sg-button>
          </div>
        </div>

        <!-- Cards -->
        <div class="preview__section">
          <h5 class="preview__section-title">Cards</h5>
          <div class="preview__row">
            <div class="preview__card">
              <sg-card variant="elevated">
                <div slot="header">Elevated Card</div>
                Glass surface with shadow and hover glow.
                <div slot="footer"><sg-button variant="ghost" size="sm">Action</sg-button></div>
              </sg-card>
            </div>
            <div class="preview__card">
              <sg-card variant="outlined" accent>
                <div slot="header">Outlined + Accent</div>
                Transparent with accent border.
                <div slot="footer"><sg-button variant="ghost" size="sm">Action</sg-button></div>
              </sg-card>
            </div>
            <div class="preview__card">
              <sg-card variant="ghost">
                <div slot="header">Ghost Card</div>
                Minimal, visible on hover.
              </sg-card>
            </div>
          </div>
        </div>

        <!-- Form Controls -->
        <div class="preview__section">
          <h5 class="preview__section-title">Form Controls</h5>
          <div class="preview__row">
            <sg-input placeholder="Input text..." style="width:180px"></sg-input>
            <sg-toggle>Toggle me</sg-toggle>
            <sg-checkbox>Check me</sg-checkbox>
            <sg-radio-group name="demo-radio" value="a">
              <sg-radio value="a">Option A</sg-radio>
              <sg-radio value="b">Option B</sg-radio>
            </sg-radio-group>
          </div>
        </div>

        <!-- Badges & Avatars -->
        <div class="preview__section">
          <h5 class="preview__section-title">Badges & Avatars</h5>
          <div class="preview__row">
            <sg-badge variant="default">Default</sg-badge>
            <sg-badge variant="success">Success</sg-badge>
            <sg-badge variant="warning">Warning</sg-badge>
            <sg-badge variant="error">Error</sg-badge>
            <sg-badge variant="info">Info</sg-badge>
            <sg-badge variant="spectral">Spectral</sg-badge>
            <sg-avatar initials="JD" size="md"></sg-avatar>
            <sg-avatar initials="AB" status="online" size="md"></sg-avatar>
          </div>
        </div>

        <!-- Spinner & Progress -->
        <div class="preview__section">
          <h5 class="preview__section-title">Spinner & Progress</h5>
          <div class="preview__row">
            <sg-spinner size="sm"></sg-spinner>
            <sg-spinner size="md"></sg-spinner>
            <sg-spinner size="lg"></sg-spinner>
            <sg-progress value="65" style="width:200px"></sg-progress>
            <sg-progress variant="spectral" value="40" style="width:200px"></sg-progress>
          </div>
        </div>

        <!-- Accordion -->
        <div class="preview__section">
          <h5 class="preview__section-title">Accordion</h5>
          <sg-accordion style="max-width:400px">
            <sg-accordion-item heading="Section One" open>
              Content for section one. Glass-styled expandable panel.
            </sg-accordion-item>
            <sg-accordion-item heading="Section Two">
              Content for section two.
            </sg-accordion-item>
          </sg-accordion>
        </div>
      </div>
    `;
  }

  // ─── Main render ───

  override render(): TemplateResult {
    const themeNames = ['Spectra Default', ...Object.keys(this._presets).filter(n => n !== 'Spectra Default').sort()];

    return html`
      <div class="builder">
        <!-- Sidebar -->
        <aside class="sidebar">
          <div class="toolbar">
            <h2 class="toolbar__title">Theme Builder</h2>
            <div class="toolbar__row">
              <select @change=${this._handleThemeChange} style="flex:1">
                ${themeNames.map(name => html`
                  <option value=${name} ?selected=${name === this._activeTheme}>
                    ${name === this._activeTheme ? '✦ ' : ''}${name}
                  </option>
                `)}
              </select>
              ${this._activeTheme !== 'Spectra Default' ? html`
                <button class="tb-btn tb-btn--delete" @click=${this._handleDeleteTheme} title="Delete &quot;${this._activeTheme}&quot;">✕</button>
              ` : nothing}
            </div>
            <div class="toolbar__row" style="margin-top:8px">
              <button class="tb-btn" @click=${this._handleAddNew}>Add New</button>
              <button class="tb-btn" @click=${this._handleReset}>Reset</button>
               <button class="tb-btn tb-btn--copy" @click=${this._handleCopyCSS}>Copy CSS</button>
               <button class="tb-btn tb-btn--source" @click=${this._handleSaveToSource}>Save to Source</button>
            </div>
          </div>

          <div class="controls">
            ${CATEGORIES.map(cat => {
              if (cat === 'Gradients') return this._renderGradientsCategory();
              if (cat === 'Spectral Colors') return this._renderSpectralColorsCategory();
              return this._renderCategory(cat);
            })}
          </div>
        </aside>

        <!-- Preview -->
        <main class="preview">
          <h3 class="preview__title">Live Preview</h3>
          ${this._renderPreview()}
        </main>
      </div>

      <!-- Toast -->
      ${this._toastMsg ? html`<div class="toast">${this._toastMsg}</div>` : ''}
    `;
  }
}

customElements.define('sg-theme-builder', SgThemeBuilder);

declare global {
  interface HTMLElementTagNameMap {
    'sg-theme-builder': SgThemeBuilder;
  }
}
