import { LitElement, html, css, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

export type SpinnerSize = 'sm' | 'md' | 'lg';
export type SpinnerVariant = 'spectral' | 'glass';

/**
 * An animated loading spinner with spectral gradient ring.
 *
 * @cssprop [--sg-spinner-speed=0.8s] - Rotation duration.
 * @cssprop [--sg-spinner-width-sm=16px] - Small diameter.
 * @cssprop [--sg-spinner-width-md=24px] - Medium diameter.
 * @cssprop [--sg-spinner-width-lg=40px] - Large diameter.
 */
export class SgSpinner extends LitElement {
  static override styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .spinner {
      border-radius: 50%;
      animation: sg-spin var(--sg-spinner-speed, 0.8s) linear infinite;
    }

    /* ─── Sizes ─── */

    .spinner--sm {
      width: var(--sg-spinner-width-sm, 16px);
      height: var(--sg-spinner-width-sm, 16px);
      border-width: 2px;
    }

    .spinner--md {
      width: var(--sg-spinner-width-md, 24px);
      height: var(--sg-spinner-width-md, 24px);
      border-width: 3px;
    }

    .spinner--lg {
      width: var(--sg-spinner-width-lg, 40px);
      height: var(--sg-spinner-width-lg, 40px);
      border-width: 4px;
    }

    /* ─── Variants ─── */

    .spinner--spectral {
      /* Conic gradient ring — matches the primary button's spectral palette */
      border: none;
      --sg-spinner-spectral-fb: conic-gradient(
        from 0deg,
        rgba(212, 134, 159, 0.5),
        rgba(196, 160, 80, 0.5),
        rgba(127, 168, 141, 0.5),
        rgba(122, 128, 192, 0.5),
        rgba(212, 134, 159, 0.5)
      );
      background: var(--sg-gradient-spectral, var(--sg-spinner-spectral-fb));
      -webkit-mask: linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask-composite: exclude;
    }

    .spinner--sm.spinner--spectral {
      padding: 2px;
    }

    .spinner--md.spinner--spectral {
      padding: 3px;
    }

    .spinner--lg.spinner--spectral {
      padding: 4px;
    }

    .spinner--glass {
      border-style: solid;
      border-color: var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      border-top-color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
    }

    @keyframes sg-spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;

  @property({ type: String, reflect: true })
  size: SpinnerSize = 'md';

  @property({ type: String, reflect: true })
  variant: SpinnerVariant = 'spectral';

  override render(): TemplateResult {
    const classes = classMap({
      spinner: true,
      [`spinner--${this.size}`]: true,
      [`spinner--${this.variant}`]: true,
    });

    return html`<span class=${classes} role="status" aria-label="Loading"></span>`;
  }
}

customElements.define('sg-spinner', SgSpinner);

declare global {
  interface HTMLElementTagNameMap {
    'sg-spinner': SgSpinner;
  }
}
