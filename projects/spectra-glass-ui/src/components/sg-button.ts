import { LitElement, html, css, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { focusRing, smoothTransition } from '../styles/shared.js';
import './sg-spinner.js';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * A glassmorphic button with spectral gradient interactions.
 *
 * - **primary**: Spectral gradient background with hover glow.
 * - **secondary**: Glass surface with spectral border on hover.
 * - **ghost**: Minimal, text appears on hover.
 *
 * @fires click - Native click event.
 *
 * @cssprop [--sg-button-radius=var(--sg-radius-md, 12px)] - Border radius.
 * @cssprop [--sg-button-primary-bg=var(--sg-gradient-spectral)] - Primary bg.
 */
export class SgButton extends LitElement {
  static override styles = css`
    :host {
      display: inline-block;
      position: relative;
      outline: none;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
    }

    ${focusRing}

    /* ═══ Shared button base ═══ */
    .btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: 1px solid transparent;
      border-radius: var(--sg-button-radius, var(--sg-radius-md, 12px));
      font-family: inherit;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      text-decoration: none;
      line-height: 1;
      -webkit-appearance: none;
      appearance: none;
      ${smoothTransition}
    }

    .btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      pointer-events: none;
    }

    .btn::-moz-focus-inner {
      border: 0;
    }

    /* ─── Sizes ─── */

    .btn--sm {
      padding: 6px 14px;
      font-size: 0.8125rem;
      height: 32px;
    }

    .btn--md {
      padding: 10px 20px;
      font-size: 0.875rem;
      height: 40px;
    }

    .btn--lg {
      padding: 14px 28px;
      font-size: 1rem;
      height: 48px;
    }

    /* ─── Variants ─── */

    .btn--primary {
      /* Dim spectral gradient (0.5 alpha) by default — matches badge aesthetic */
      background: var(
        --sg-button-primary-bg,
        var(
          --sg-gradient-spectral,
          linear-gradient(135deg, rgba(212, 134, 159, 0.5), rgba(196, 160, 80, 0.5), rgba(127, 168, 141, 0.5), rgba(122, 128, 192, 0.5))
        )
      );
      color: #fff;
      border-color: transparent;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    }

    .btn--primary:hover:not(:disabled) {
      filter: brightness(1.15);
      transform: translateY(-1px);
      box-shadow: var(
        --sg-button-glow-primary,
        0 0 6px rgba(218, 119, 242, 0.18),
        0 0 16px rgba(218, 119, 242, 0.25),
        0 0 28px rgba(77, 171, 247, 0.10)
      );
    }

    .btn--primary:active:not(:disabled) {
      filter: brightness(0.95);
      transform: scale(0.98);
    }

    .btn--secondary {
      background: var(--sg-glass-bg, rgba(255, 255, 255, 0.08));
      backdrop-filter: var(--sg-glass-blur, blur(20px));
      -webkit-backdrop-filter: var(--sg-glass-blur, blur(20px));
      border-color: var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
    }

    .btn--secondary:hover:not(:disabled) {
      border-color: var(--sg-glass-border-hover, rgba(255, 255, 255, 0.25));
      background: var(--sg-glass-bg-hover, rgba(255, 255, 255, 0.14));
      transform: translateY(-1px);
      box-shadow: var(
        --sg-button-glow-secondary,
        0 0 6px rgba(218, 119, 242, 0.05),
        0 0 16px rgba(218, 119, 242, 0.06),
        0 0 28px rgba(77, 171, 247, 0.03)
      );
    }

    .btn--secondary:active:not(:disabled) {
      background: var(--sg-glass-bg-active, rgba(255, 255, 255, 0.18));
    }

    .btn--ghost {
      background: transparent;
      border-color: transparent;
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
    }

    .btn--ghost:hover:not(:disabled) {
      background: var(--sg-glass-bg-hover, rgba(255, 255, 255, 0.14));
    }

    .btn--ghost:active:not(:disabled) {
      background: var(--sg-glass-bg-active, rgba(255, 255, 255, 0.18));
    }

    /* ─── Spectral gradient border ───
       ::after with mask sits above content, only visible at the 1px
       border edge — no size shift, works with all variants. */

    .btn--border {
      position: relative;
    }

    .btn--border::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      padding: 1px;
      --sg-spectral-fb: linear-gradient(
        135deg,
        rgba(212, 134, 159, 0.5),
        rgba(196, 160, 80, 0.5),
        rgba(127, 168, 141, 0.5),
        rgba(122, 128, 192, 0.5)
      );
      background: var(--sg-gradient-spectral, var(--sg-spectral-fb));
      -webkit-mask: linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask-composite: exclude;
      pointer-events: none;
      /* no z-index — ::after stacks above content by default */
    }

    /* ─── Pill / fully rounded ─── */

    .btn--pill {
      border-radius: 9999px;
    }

    /* ─── Block / full-width ─── */

    .btn--block {
      width: 100%;
    }

    /* ─── Loading ─── */

    .btn--loading {
      pointer-events: none;
      position: relative;
    }

    .btn--loading .btn__label {
      opacity: 0;
    }

    .btn__spinner {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `;

  @property({ type: String, reflect: true })
  variant: ButtonVariant = 'primary';

  @property({ type: String, reflect: true })
  size: ButtonSize = 'md';

  @property({ type: Boolean, reflect: true })
  disabled: boolean = false;

  @property({ type: Boolean, reflect: true })
  loading: boolean = false;

  /** When true, renders a 1.5px spectral gradient border around the button. */
  @property({ type: Boolean, reflect: true })
  border: boolean = false;

  /** When true, makes the button fully rounded (pill/circular shape). */
  @property({ type: Boolean, reflect: true })
  pill: boolean = false;

  /** When true, the button fills the full width of its container. */
  @property({ type: Boolean, reflect: true })
  block: boolean = false;

  @property({ type: String })
  type: 'button' | 'submit' | 'reset' = 'button';

  override render(): TemplateResult {
    const classes = classMap({
      btn: true,
      [`btn--${this.variant}`]: true,
      [`btn--${this.size}`]: true,
      'btn--loading': this.loading,
      'btn--border': this.border,
      'btn--pill': this.pill,
      'btn--block': this.block,
    });

    return html`
      <button
        class=${classes}
        type=${this.type}
        ?disabled=${this.disabled || this.loading}
        aria-busy=${ifDefined(this.loading ? 'true' : undefined)}
      >
        <span class="btn__label"><slot></slot></span>
        ${this.loading ? html`<span class="btn__spinner"><sg-spinner size="sm" variant="glass"></sg-spinner></span>` : ''}
      </button>
    `;
  }
}

customElements.define('sg-button', SgButton);

declare global {
  interface HTMLElementTagNameMap {
    'sg-button': SgButton;
  }
}
