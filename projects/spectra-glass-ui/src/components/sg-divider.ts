import { LitElement, html, css, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

/**
 * A horizontal divider with optional centred label.
 *
 * @cssprop [--sg-divider-color=var(--sg-glass-border)] - Line colour.
 * @cssprop [--sg-divider-label-color=var(--sg-text-secondary)] - Label text colour.
 */
export class SgDivider extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
    }

    .divider {
      display: flex;
      align-items: center;
      width: 100%;
      gap: 16px;
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      height: 1px;
    }

    .divider--label-left::before {
      flex: 0 0 24px;
    }

    .divider--label-right::after {
      flex: 0 0 24px;
    }

    /* ─── Variants ─── */

    .divider--solid::before,
    .divider--solid::after {
      background: var(--sg-divider-color, var(--sg-glass-border, rgba(255, 255, 255, 0.12)));
    }

    .divider--glass::before,
    .divider--glass::after {
      background: var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      height: 1px;
      backdrop-filter: var(--sg-glass-blur-sm, blur(12px));
      border-radius: 1px;
    }

    .divider--gradient::before,
    .divider--gradient::after {
      background: var(
        --sg-divider-gradient,
        var(
          --sg-gradient-spectral,
          linear-gradient(
            90deg,
            transparent,
            rgba(212, 134, 159, 0.5),
            rgba(196, 160, 80, 0.5),
            rgba(127, 168, 141, 0.5),
            rgba(122, 128, 192, 0.5),
            transparent
          )
        )
      );
    }

    .label {
      color: var(--sg-divider-label-color, var(--sg-text-secondary, rgba(255, 255, 255, 0.6)));
      font-size: 0.8125rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      white-space: nowrap;
      flex-shrink: 0;
    }
  `;

  /**
   * Visual variant.
   * @default 'glass'
   */
  @property({ type: String })
  variant: 'solid' | 'glass' | 'gradient' = 'glass';

  /**
   * Optional label text shown in the centre (or left/right with `labelPosition`).
   */
  @property({ type: String })
  label: string = '';

  /**
   * Label position.
   * @default 'center'
   */
  @property({ type: String, attribute: 'label-position' })
  labelPosition: 'left' | 'center' | 'right' = 'center';

  override render(): TemplateResult {
    const classes = {
      divider: true,
      [`divider--${this.variant}`]: true,
      'divider--label-left': this.label && this.labelPosition === 'left',
      'divider--label-right': this.label && this.labelPosition === 'right',
    };

    const labelEl = this.label
      ? html`<span class="label">${this.label}</span>`
      : '';

    return html`
      <div class=${classMap(classes)}>
        ${this.label && this.labelPosition === 'left' ? labelEl : ''}
        ${this.label && this.labelPosition === 'center' ? labelEl : ''}
        ${this.label && this.labelPosition === 'right' ? labelEl : ''}
      </div>
    `;
  }
}

customElements.define('sg-divider', SgDivider);

declare global {
  interface HTMLElementTagNameMap {
    'sg-divider': SgDivider;
  }
}
