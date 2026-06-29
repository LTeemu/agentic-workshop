import { LitElement, html, css, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

/**
 * Feather-style SVG icons used internally and available for consumers.
 */
const ICONS: Record<string, string> = {
  menu: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,

  close: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,

  'chevron-down': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,

  'chevron-up': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`,

  'chevron-left': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,

  'chevron-right': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,

  check: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,

  'external-link': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
};

/** Size-to-pixel mapping for sg-icon. */
const SIZE_MAP: Record<string, string> = {
  sm: '16px',
  md: '24px',
  lg: '32px',
};

/**
 * A simple SVG icon wrapper. Use `name` for built-in icons, or slot
 * a custom SVG for ad‑hoc icons.
 *
 * @cssprop [--sg-icon-color=currentColor] - Icon colour (inherits text colour by default).
 */
export class SgIcon extends LitElement {
  static override styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: var(--sg-icon-size, 24px);
      height: var(--sg-icon-size, 24px);
      color: var(--sg-icon-color, currentColor);
    }

    svg {
      width: 100%;
      height: 100%;
      display: block;
    }

    ::slotted(svg) {
      width: 100%;
      height: 100%;
      display: block;
    }
  `;

  /**
   * Built-in icon name. See ICONS map for available names.
   * If omitted, renders the default slot (for custom SVGs).
   */
  @property({ type: String })
  name: string = '';

  /**
   * Icon size.
   * @default 'md'
   */
  @property({ type: String })
  size: 'sm' | 'md' | 'lg' = 'md';

  override render(): TemplateResult {
    const sizePx = SIZE_MAP[this.size] ?? '24px';
    const svg = this.name ? ICONS[this.name] : null;

    return html`
      <style>
        :host {
          --sg-icon-size: ${sizePx};
        }
      </style>
      ${svg ? unsafeHTML(svg) : html`<slot></slot>`}
    `;
  }
}

customElements.define('sg-icon', SgIcon);

declare global {
  interface HTMLElementTagNameMap {
    'sg-icon': SgIcon;
  }
}
