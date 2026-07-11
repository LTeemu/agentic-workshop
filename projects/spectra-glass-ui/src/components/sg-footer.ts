import { LitElement, html, css, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { smoothTransition } from '../styles/shared.js';
import './sg-divider.js';

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
      position: relative;
      background: var(--sg-footer-bg, var(--sg-glass-bg, rgba(255, 255, 255, 0.08)));
      backdrop-filter: var(--sg-footer-blur, var(--sg-glass-blur, blur(20px)));
      -webkit-backdrop-filter: var(--sg-footer-blur, var(--sg-glass-blur, blur(20px)));
    }

    /* Spectral gradient accent line at the footer's leading edge */
    .footer::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: var(
        --sg-gradient-spectral,
        linear-gradient(90deg,
          rgba(212, 134, 159, 0.6),
          rgba(196, 160, 80, 0.6),
          rgba(127, 168, 141, 0.6),
          rgba(122, 128, 192, 0.6)
        )
      );
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
      gap: 2.5rem;
    }

    @media (max-width: 768px) {
      .grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 2rem;
      }
    }

    @media (max-width: 480px) {
      .grid {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }
    }

    .column ::slotted(h3),
    .column ::slotted(h4) {
      color: var(--sg-footer-heading-color, var(--sg-text-primary, rgba(255, 255, 255, 0.9)));
      font-size: 0.8125rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin: 0 0 1.25rem;
    }

    .column ::slotted(a),
    .column ::slotted(button) {
      display: block;
      position: relative;
      color: var(--sg-footer-link-color, var(--sg-text-secondary, rgba(255, 255, 255, 0.6)));
      text-decoration: none;
      font-size: 0.875rem;
      padding: 5px 0;
      width: fit-content;
      ${smoothTransition}
    }

    .column ::slotted(a:hover),
    .column ::slotted(button:hover) {
      color: var(--sg-footer-link-hover-color, var(--sg-text-primary, rgba(255, 255, 255, 0.9)));
      padding-left: 6px;
    }

    /* ─── Social ─── */

    .social {
      display: flex;
      gap: 10px;
      padding: 2rem 0 2.5rem 0;
    }

    .social ::slotted(a) {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
      border: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      background: var(--sg-glass-bg, rgba(255, 255, 255, 0.08));
      backdrop-filter: var(--sg-glass-blur-sm, blur(12px));
      -webkit-backdrop-filter: var(--sg-glass-blur-sm, blur(12px));
      transition:
        color var(--sg-transition-fast, 150ms ease),
        border-color var(--sg-transition-fast, 150ms ease),
        background var(--sg-transition-fast, 150ms ease),
        transform var(--sg-transition-fast, 150ms ease);
    }

    .social ::slotted(a:hover) {
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      border-color: var(--sg-glass-border-hover, rgba(255, 255, 255, 0.25));
      background: var(--sg-glass-bg-hover, rgba(255, 255, 255, 0.14));
      transform: translateY(-2px);
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
  columns: 1 | 2 | 3 | 4 | 5 | 6 = 4;

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
          <sg-divider variant="gradient" style="margin: 2.5rem 0 0;"></sg-divider>
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
