import { LitElement, html, css, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { smoothTransition } from '../styles/shared.js';

/**
 * Multi-column footer with copyright bar and social links slot.
 *
 * @cssprop [--sg-footer-bg=var(--sg-glass-bg)] - Footer background.
 * @cssprop [--sg-footer-blur=var(--sg-glass-blur)] - Footer backdrop blur.
 * @cssprop [--sg-footer-heading-color=var(--sg-text-primary)] - Column heading colour.
 * @cssprop [--sg-footer-link-color=var(--sg-text-secondary)] - Link colour.
 * @cssprop [--sg-footer-link-hover-color=var(--sg-text-primary)] - Link hover colour.
 * @cssprop [--sg-footer-copyright-color=var(--sg-text-tertiary)] - Copyright text colour.
 */
export class SgFooter extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
    }

    .footer {
      background: var(--sg-footer-bg, var(--sg-glass-bg, rgba(255, 255, 255, 0.08)));
      backdrop-filter: var(--sg-footer-blur, var(--sg-glass-blur, blur(20px)));
      -webkit-backdrop-filter: var(--sg-footer-blur, var(--sg-glass-blur, blur(20px)));
      border-top: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
    }

    .inner {
      max-width: var(--sg-max-width-lg, 1100px);
      margin: 0 auto;
      padding: 4rem var(--sg-section-gutter, 1.5rem) 0;
      box-sizing: border-box;
    }

    /* ─── Grid ─── */

    .grid {
      display: grid;
      grid-template-columns: repeat(var(--sg-footer-columns, 4), 1fr);
      gap: 2rem;
    }

    @media (max-width: 768px) {
      .grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 480px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }

    .column ::slotted(h3),
    .column ::slotted(h4) {
      color: var(--sg-footer-heading-color, var(--sg-text-primary, rgba(255, 255, 255, 0.9)));
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 1rem;
    }

    .column ::slotted(a),
    .column ::slotted(button) {
      display: block;
      color: var(--sg-footer-link-color, var(--sg-text-secondary, rgba(255, 255, 255, 0.6)));
      text-decoration: none;
      font-size: 0.9375rem;
      padding: 4px 0;
      ${smoothTransition}
    }

    .column ::slotted(a:hover),
    .column ::slotted(button:hover) {
      color: var(--sg-footer-link-hover-color, var(--sg-text-primary, rgba(255, 255, 255, 0.9)));
    }

    /* ─── Social ─── */

    .social {
      display: flex;
      gap: 12px;
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
    }

    .social ::slotted(a) {
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
      transition: color var(--sg-transition-fast, 150ms ease);
    }

    .social ::slotted(a:hover) {
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
    }

    /* ─── Copyright ─── */

    .copyright {
      text-align: center;
      padding: 2rem var(--sg-section-gutter, 1.5rem);
      color: var(--sg-footer-copyright-color, var(--sg-text-tertiary, rgba(255, 255, 255, 0.4)));
      font-size: 0.8125rem;
      border-top: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
    }

    .copyright ::slotted(*) {
      margin: 0;
    }
  `;

  /**
   * Number of footer link columns.
   * @default 4
   */
  @property({ type: Number })
  columns: 1 | 2 | 3 | 4 = 4;

  override render(): TemplateResult {
    const cols = Array.from({ length: this.columns }, (_, i) => i + 1);

    return html`
      <style>
        :host {
          --sg-footer-columns: ${this.columns};
        }
      </style>
      <footer class="footer">
        <div class="inner">
          <div class="grid">
            ${cols.map(
              (i) => html`
                <div class="column"><slot name="column-${i}"></slot></div>
              `
            )}
          </div>
          <div class="social"><slot name="social"></slot></div>
        </div>
        <div class="copyright"><slot name="copyright"></slot></div>
      </footer>
    `;
  }
}

customElements.define('sg-footer', SgFooter);

declare global {
  interface HTMLElementTagNameMap {
    'sg-footer': SgFooter;
  }
}
