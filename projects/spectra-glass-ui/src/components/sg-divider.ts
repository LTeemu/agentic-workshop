import { LitElement, html, css, unsafeCSS, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

const SPECTRAL_FALLBACK = unsafeCSS(`linear-gradient(90deg,
  transparent,
  rgba(212, 134, 159, 0.5),
  rgba(196, 160, 80, 0.5),
  rgba(127, 168, 141, 0.5),
  rgba(122, 128, 192, 0.5),
  transparent)`);

/**
 * A horizontal divider with optional centred label.
 *
 * @cssprop [--sg-divider-color=var(--sg-glass-border)] - Line colour (solid variant).
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
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
      min-height: 1px;
    }

    /* ─── Single continuous line (no label) ─── */
    .divider__line {
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      height: 1px;
      transform: translateY(-50%);
      pointer-events: none;
    }

    .divider--solid .divider__line {
      background: var(--sg-divider-color, var(--sg-glass-border, rgba(255, 255, 255, 0.12)));
    }

    .divider--glass .divider__line {
      background: var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      backdrop-filter: var(--sg-glass-blur-sm, blur(12px));
    }

    .divider--gradient .divider__line {
      background: var(
        --sg-divider-gradient,
        var(--sg-gradient-spectral, ${SPECTRAL_FALLBACK})
      );
    }

    /* ─── Flex spacers (default: no visual role) ─── */
    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
    }

    .divider--label-left::before {
      flex: 0 0 24px;
    }

    .divider--label-right::after {
      flex: 0 0 24px;
    }

    /* ─── With label: pseudo-elements become the visual line ─── */
    .divider--has-label::before,
    .divider--has-label::after {
      height: 1px;
    }

    .divider--solid.divider--has-label::before,
    .divider--solid.divider--has-label::after {
      background: var(--sg-divider-color, var(--sg-glass-border, rgba(255, 255, 255, 0.12)));
    }

    .divider--glass.divider--has-label::before,
    .divider--glass.divider--has-label::after {
      background: var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      backdrop-filter: var(--sg-glass-blur-sm, blur(12px));
    }

    /* Each side gets the full spectral gradient; CSS masks clip the
       transparent edge nearest the label so the line fades out before
       the label text — no background overlay needed. */
    .divider--gradient.divider--has-label::before {
      background: var(--sg-gradient-spectral, ${SPECTRAL_FALLBACK});
      -webkit-mask: linear-gradient(90deg, black 80%, transparent 95%);
      mask: linear-gradient(90deg, black 80%, transparent 95%);
    }

    .divider--gradient.divider--has-label::after {
      background: var(--sg-gradient-spectral, ${SPECTRAL_FALLBACK});
      -webkit-mask: linear-gradient(90deg, transparent 5%, black 20%);
      mask: linear-gradient(90deg, transparent 5%, black 20%);
    }

    /* ─── Label — clean text, no background overlay ─── */
    .label {
      color: var(--sg-divider-label-color, var(--sg-text-secondary, rgba(255, 255, 255, 0.6)));
      font-size: 0.8125rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      white-space: nowrap;
      flex-shrink: 0;
      margin: 0 12px;
    }
  `;

  /**
   * Visual variant.
   * @default 'gradient'
   */
  @property({ type: String })
  variant: 'solid' | 'glass' | 'gradient' = 'gradient';

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
      'divider--has-label': !!this.label,
      'divider--label-left': this.label && this.labelPosition === 'left',
      'divider--label-right': this.label && this.labelPosition === 'right',
    };

    const labelEl = this.label
      ? html`<span class="label">${this.label}</span>`
      : '';

    return html`
      <div class=${classMap(classes)}>
        ${!this.label ? html`<div class="divider__line"></div>` : ''}
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
