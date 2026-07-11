import { LitElement, html, css, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

export type ProgressVariant = 'default' | 'spectral';
export type ProgressSize = 'sm' | 'md' | 'lg';

export class SgProgress extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
    }

    .track {
      width: 100%;
      background: var(--sg-glass-bg, rgba(255, 255, 255, 0.08));
      border-radius: 9999px;
      overflow: hidden;
    }

    .track--sm {
      height: 4px;
    }

    .track--md {
      height: 8px;
    }

    .track--lg {
      height: 12px;
    }

    .fill {
      height: 100%;
      border-radius: 9999px;
      transition: width 250ms ease;
      will-change: transform;
    }

    .fill--default {
      background: var(--sg-color-info, #6fa0b5);
    }

    .fill--spectral {
      background: var(
        --sg-gradient-spectral,
        linear-gradient(
          135deg,
          rgba(212, 134, 159, 0.8),
          rgba(196, 160, 80, 0.8),
          rgba(127, 168, 141, 0.8),
          rgba(122, 128, 192, 0.8)
        )
      );
    }

    .fill--indeterminate {
      width: 40% !important;
      animation: sg-progress-indeterminate 1.5s ease-in-out infinite;
    }

    @keyframes sg-progress-indeterminate {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(350%);
      }
    }

    .label-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.8125rem;
      margin-bottom: 6px;
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
    }
  `;

  @property({ type: Number, reflect: true })
  value: number = 0;

  @property({ type: Number, reflect: true })
  max: number = 100;

  @property({ type: String, reflect: true })
  variant: ProgressVariant = 'spectral';

  @property({ type: String, reflect: true })
  size: ProgressSize = 'md';

  @property({ type: Boolean, reflect: true })
  indeterminate: boolean = false;

  @property({ type: String })
  label: string = '';

  @property({ type: Boolean, attribute: 'show-value' })
  showValue: boolean = false;

  get #progress(): number {
    if (this.max <= 0) return 0;
    return Math.min(1, Math.max(0, this.value / this.max));
  }

  override render(): TemplateResult {
    const pct = Math.round(this.#progress * 100);
    const width = this.indeterminate ? undefined : `${pct}%`;

    const trackClasses = classMap({
      track: true,
      [`track--${this.size}`]: true,
    });

    const fillClasses = classMap({
      fill: true,
      [`fill--${this.variant}`]: true,
      'fill--indeterminate': this.indeterminate,
    });

    return html`
      ${this.label || this.showValue
        ? html`
            <div class="label-row">
              <span>${this.label}</span>
              ${this.showValue ? html`<span>${pct}%</span>` : ''}
            </div>
          `
        : ''}
      <div
        class=${trackClasses}
        role="progressbar"
        aria-valuenow=${this.indeterminate ? '' : this.value}
        aria-valuemin="0"
        aria-valuemax=${this.max}
      >
        <div class=${fillClasses} style=${width ? `width: ${width}` : ''}></div>
      </div>
    `;
  }
}

customElements.define('sg-progress', SgProgress);

declare global {
  interface HTMLElementTagNameMap {
    'sg-progress': SgProgress;
  }
}
