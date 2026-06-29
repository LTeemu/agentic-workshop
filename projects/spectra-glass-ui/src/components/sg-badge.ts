import { LitElement, html, css, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'spectral';
export type BadgeSize = 'sm' | 'md';

/**
 * A small badge/chip component using spectral color variants.
 *
 * @cssprop [--sg-badge-radius=var(--sg-radius-full, 9999px)] - Border radius.
 * @cssprop [--sg-badge-font-size-sm=0.6875rem] - Small font size.
 * @cssprop [--sg-badge-font-size-md=0.75rem] - Medium font size.
 */
export class SgBadge extends LitElement {
  static override styles = css`
    :host {
      display: inline-flex;
      position: relative;
      outline: none;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border-radius: var(--sg-badge-radius, var(--sg-radius-full, 9999px));
      font-weight: 600;
      line-height: 1;
      white-space: nowrap;
      transition:
        background var(--sg-transition-base, 250ms ease),
        box-shadow var(--sg-transition-base, 250ms ease);
    }

    /* ─── Sizes ─── */

    .badge--sm {
      padding: 3px 10px;
      font-size: var(--sg-badge-font-size-sm, 0.6875rem);
    }

    .badge--md {
      padding: 5px 14px;
      font-size: var(--sg-badge-font-size-md, 0.75rem);
    }

    /* ─── Variants ─── */

    .badge--default {
      background: var(--sg-glass-bg, rgba(255, 255, 255, 0.08));
      backdrop-filter: var(--sg-glass-blur, blur(20px));
      -webkit-backdrop-filter: var(--sg-glass-blur, blur(20px));
      border: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
    }

    .badge--success {
      background: color-mix(in srgb, var(--sg-spectral-sage, #7fa88d) 70%, transparent);
      color: #fff;
    }

    .badge--warning {
      background: color-mix(in srgb, var(--sg-spectral-gold, #c4a050) 70%, transparent);
      color: #1a1a1a;
    }

    .badge--error {
      background: color-mix(in srgb, var(--sg-spectral-rose, #d4869f) 70%, transparent);
      color: #fff;
    }

    .badge--info {
      background: color-mix(in srgb, var(--sg-spectral-teal, #6fa0b5) 70%, transparent);
      color: #fff;
    }

    .badge--spectral {
      background: var(
        --sg-gradient-spectral,
        linear-gradient(135deg, rgba(212, 134, 159, 0.5), rgba(196, 160, 80, 0.5), rgba(127, 168, 141, 0.5), rgba(122, 128, 192, 0.5))
      );
      color: #fff;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    }

    /* ─── Dot indicator ─── */

    .badge__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .badge--default .badge__dot {
      background: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
    }

    .badge--success .badge__dot {
      background: var(--sg-spectral-sage, #7fa88d);
    }

    .badge--warning .badge__dot {
      background: var(--sg-spectral-gold, #c4a050);
    }

    .badge--error .badge__dot {
      background: var(--sg-spectral-rose, #d4869f);
    }

    .badge--info .badge__dot {
      background: var(--sg-spectral-teal, #6fa0b5);
    }

    .badge--spectral .badge__dot {
      background: rgba(255, 255, 255, 0.7);
    }

    /* ─── Dismiss ─── */

    .badge__dismiss {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      border: none;
      background: transparent;
      color: inherit;
      cursor: pointer;
      opacity: 0.6;
      font-size: inherit;
      padding: 0;
      margin-left: 2px;
      border-radius: 50%;
      transition: opacity var(--sg-transition-fast, 150ms ease);
    }

    .badge__dismiss:hover {
      opacity: 1;
    }
  `;

  @property({ type: String, reflect: true })
  variant: BadgeVariant = 'default';

  @property({ type: String, reflect: true })
  size: BadgeSize = 'md';

  /**
   * When true, shows a dismiss (×) button and emits a `dismiss` event.
   */
  @property({ type: Boolean, reflect: true })
  removable: boolean = false;

  override render(): TemplateResult {
    const classes = classMap({
      badge: true,
      [`badge--${this.variant}`]: true,
      [`badge--${this.size}`]: true,
    });

    return html`
      <span class=${classes}>
        <span class="badge__dot"></span>
        <span><slot></slot></span>
        ${this.removable
          ? html`
              <button
                class="badge__dismiss"
                @click=${this.#handleDismiss}
                aria-label="Dismiss"
                part="dismiss-button"
              >
                ×
              </button>
            `
          : ''}
      </span>
    `;
  }

  #handleDismiss(e: MouseEvent): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('dismiss', { bubbles: true, composed: true })
    );
  }
}

customElements.define('sg-badge', SgBadge);

declare global {
  interface HTMLElementTagNameMap {
    'sg-badge': SgBadge;
  }
}
