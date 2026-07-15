import { LitElement, html, css, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';

export type SkeletonVariant = 'text' | 'circle' | 'rect' | 'card';

export class SgSkeleton extends LitElement {
  static override styles = css`
    :host {
      display: block;
      box-sizing: border-box;
    }

    @keyframes sg-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .shimmer {
      background: linear-gradient(
        90deg,
        var(--sg-skeleton-base, rgba(255, 255, 255, 0.05)),
        var(--sg-skeleton-shine, rgba(255, 255, 255, 0.12)),
        var(--sg-skeleton-base, rgba(255, 255, 255, 0.05))
      );
      background-size: 200% 100%;
      animation: sg-shimmer 1.5s ease-in-out infinite;
    }

    .skeleton--text {
      display: flex;
      flex-direction: column;
    }

    .skeleton__line {
      height: 14px;
      border-radius: var(--sg-radius-sm, 8px);
      margin-bottom: 8px;
    }

    .skeleton__line:last-child {
      margin-bottom: 0;
    }

    .skeleton--circle {
      border-radius: 50%;
      width: var(--sg-skeleton-circle-size, 40px);
      height: var(--sg-skeleton-circle-size, 40px);
    }

    .skeleton--rect {
      width: var(--sg-skeleton-rect-width, 100%);
      height: var(--sg-skeleton-rect-height, 120px);
      border-radius: var(--sg-radius-sm, 8px);
    }

    .skeleton--card {
      border-radius: var(--sg-radius-lg, 20px);
      overflow: hidden;
    }

    .skeleton__header {
      height: 60px;
      background: linear-gradient(
        90deg,
        var(--sg-skeleton-base, rgba(255, 255, 255, 0.05)),
        var(--sg-skeleton-shine, rgba(255, 255, 255, 0.12)),
        var(--sg-skeleton-base, rgba(255, 255, 255, 0.05))
      );
      background-size: 200% 100%;
      animation: sg-shimmer 1.5s ease-in-out infinite;
    }

    .skeleton__body {
      padding: 16px;
      display: flex;
      flex-direction: column;
    }
  `;

  @property({ type: String, reflect: true })
  variant: SkeletonVariant = 'text';

  @property({ type: String, reflect: true })
  width: string = '';

  @property({ type: String, reflect: true })
  height: string = '';

  @property({ type: Number, reflect: true })
  lines: number = 3;

  @property({ type: String, reflect: true, attribute: 'last-line-width' })
  lastLineWidth: string = '60%';

  #lineWidths(): string[] {
    const n = this.lines;
    if (n <= 1) return [this.lastLineWidth];
    // Linearly interpolate from ~85% down to `last-line-width`
    // so each line is naturally shorter than the one above it.
    const start = 85;
    const end = Math.min(parseFloat(this.lastLineWidth) || 60, start - 5);
    const step = (start - end) / (n - 1);
    const widths: string[] = [];
    for (let i = 0; i < n - 1; i++) {
      const pct = Math.round(start - i * step);
      widths.push(`${pct}%`);
    }
    widths.push(this.lastLineWidth);
    return widths;
  }

  override render(): TemplateResult {
    const lineWidths = this.#lineWidths();

    const styleParts: string[] = [];
    if (this.width) styleParts.push(`width: ${this.width};`);
    if (this.height) {
      // Content-driven variants (text, card) use min-height so adding more
      // lines grows the container instead of being capped at a fixed height.
      // Fixed-shape variants (circle, rect) use fixed height since they have
      // no intrinsic content.
      const prop = this.variant === 'text' || this.variant === 'card'
        ? 'min-height'
        : 'height';
      styleParts.push(`${prop}: ${this.height};`);
    }
    const hostStyle = styleParts.join(' ');

    switch (this.variant) {
      case 'circle':
        return html`
          <div class="shimmer skeleton--circle" style=${hostStyle} role="status" aria-label="Loading"></div>
        `;

      case 'rect':
        return html`
          <div class="shimmer skeleton--rect" style=${hostStyle} role="status" aria-label="Loading"></div>
        `;

      case 'card':
        return html`
          <div class="skeleton--card" style=${hostStyle} role="status" aria-label="Loading">
            <div class="skeleton__header"></div>
            <div class="skeleton__body">
              ${lineWidths.map(
                (w) => html`
                  <div class="shimmer skeleton__line" style="width: ${w};"></div>
                `
              )}
            </div>
          </div>
        `;

      default:
        return html`
          <div class="skeleton--text" style=${hostStyle} role="status" aria-label="Loading">
            ${lineWidths.map(
              (w) => html`
                <div class="shimmer skeleton__line" style="width: ${w};"></div>
              `
            )}
          </div>
        `;
    }
  }
}

customElements.define('sg-skeleton', SgSkeleton);

declare global {
  interface HTMLElementTagNameMap {
    'sg-skeleton': SgSkeleton;
  }
}
