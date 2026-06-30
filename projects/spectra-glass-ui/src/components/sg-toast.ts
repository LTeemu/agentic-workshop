import { LitElement, html, css, type TemplateResult } from 'lit';
import { property, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { glassSurface, smoothTransition } from '../styles/shared.js';
import './sg-icon.js';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

/** Maps toast variant → sg-icon name and accent border colour. */
const VARIANT_MAP: Record<ToastVariant, { icon: string; border: string }> = {
  info: {
    icon: 'info',
    border: 'var(--sg-spectral-teal, #6fa0b5)',
  },
  success: {
    icon: 'check-circle',
    border: 'var(--sg-spectral-sage, #7fa88d)',
  },
  warning: {
    icon: 'alert-triangle',
    border: 'var(--sg-spectral-gold, #c4a050)',
  },
  error: {
    icon: 'x-circle',
    border: 'var(--sg-spectral-rose, #d4869f)',
  },
};

/**
 * A glassmorphic toast notification.
 *
 * @slot - Message content.
 *
 * @fires close - Emitted when the toast is dismissed.
 *
 * @cssprop [--sg-toast-radius=var(--sg-radius-md, 12px)] - Border radius.
 */
export class SgToast extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 16px;
      border-radius: var(--sg-toast-radius, var(--sg-radius-md, 12px));
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      ${glassSurface}
      ${smoothTransition}
      box-shadow: var(--sg-glass-shadow, 0 4px 24px rgba(0, 0, 0, 0.12));
      border-left: 3px solid transparent;
      transform: translateX(0);
      opacity: 1;
    }

    .toast--open {
      animation: slideIn 250ms ease forwards;
    }

    .toast--closed {
      animation: slideOut 250ms ease forwards;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }

    .toast__icon {
      flex-shrink: 0;
      margin-top: 2px;
    }

    .toast__message {
      flex: 1;
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .toast__dismiss {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
      cursor: pointer;
      border-radius: var(--sg-radius-sm, 8px);
      font-size: 1rem;
      line-height: 1;
      padding: 0;
      transition: background var(--sg-transition-fast, 150ms ease);
    }

    .toast__dismiss:hover {
      background: var(--sg-glass-bg-hover, rgba(255, 255, 255, 0.14));
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
    }
  `;

  @property({ type: String, reflect: true })
  variant: ToastVariant = 'info';

  @property({ type: Number })
  duration: number = 4000;

  @property({ type: Boolean })
  dismissible: boolean = true;

  @property({ type: Boolean, reflect: true })
  open: boolean = false;

  @query('.toast')
  private _toastEl!: HTMLElement;

  private _dismissTimer: ReturnType<typeof setTimeout> | null = null;

  override render(): TemplateResult {
    const toastClasses = classMap({
      toast: true,
      'toast--open': this.open,
      'toast--closed': !this.open,
    });

    const variant = VARIANT_MAP[this.variant] ?? VARIANT_MAP.info;

    return html`
      <div
        class=${toastClasses}
        style="border-left-color: ${variant.border};"
        role="alert"
        aria-live="assertive"
      >
        <span class="toast__icon" aria-hidden="true">
          <sg-icon name=${variant.icon} size="sm"></sg-icon>
        </span>
        <span class="toast__message">
          <slot></slot>
        </span>
        ${this.dismissible
          ? html`
              <button
                class="toast__dismiss"
                @click=${this.#dismiss}
                aria-label="Dismiss notification"
              >
                &times;
              </button>
            `
          : ''}
      </div>
    `;
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('open') && this.open) {
      this.#startDismissTimer();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#clearDismissTimer();
  }

  #startDismissTimer(): void {
    this.#clearDismissTimer();
    if (this.duration > 0) {
      this._dismissTimer = setTimeout(() => this.#dismiss(), this.duration);
    }
  }

  #clearDismissTimer(): void {
    if (this._dismissTimer !== null) {
      clearTimeout(this._dismissTimer);
      this._dismissTimer = null;
    }
  }

  async #dismiss(): Promise<void> {
    this.#clearDismissTimer();
    this.open = false;
    await this.updateComplete;

    // Wait for the slideOut animation (250ms) to finish before firing close,
    // so the container sees a fully animated-out element and removes it cleanly.
    if (!this._toastEl) {
      this.#fireClose();
      return;
    }

    return new Promise<void>((resolve) => {
      const fallback = setTimeout(resolve, 500);
      this._toastEl!.addEventListener(
        'animationend',
        () => {
          clearTimeout(fallback);
          resolve();
        },
        { once: true },
      );
    }).then(() => this.#fireClose());
  }

  #fireClose(): void {
    this.dispatchEvent(
      new CustomEvent('close', { bubbles: true, composed: true }),
    );
  }
}

customElements.define('sg-toast', SgToast);

declare global {
  interface HTMLElementTagNameMap {
    'sg-toast': SgToast;
  }
}
