import { LitElement, html, css, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { glassSurface, smoothTransition } from '../styles/shared.js';

/**
 * A glassmorphic modal dialog with backdrop blur.
 *
 * @slot - Body content.
 * @slot footer - Action buttons (optional).
 *
 * @fires close - Emitted when the dialog is dismissed.
 *
 * @cssprop [--sg-dialog-radius=var(--sg-radius-lg, 20px)] - Dialog border radius.
 * @cssprop [--sg-dialog-max-width=480px] - Dialog max width.
 * @cssprop [--sg-dialog-padding=24px] - Dialog padding.
 */
export class SgDialog extends LitElement {
  static override styles = css`
    :host {
      display: contents;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
    }

    /* ═══ Backdrop ═══ */

    .backdrop {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 1000;
      opacity: 0;
      transition: opacity var(--sg-transition-base, 250ms ease);
    }

    .backdrop--open {
      opacity: 1;
    }

    /* ═══ Dialog panel ═══ */

    .dialog {
      position: relative;
      width: 100%;
      max-width: var(--sg-dialog-max-width, 480px);
      max-height: 85vh;
      margin: 16px;
      display: flex;
      flex-direction: column;
      border-radius: var(--sg-dialog-radius, var(--sg-radius-lg, 20px));
      padding: var(--sg-dialog-padding, 24px);
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      ${glassSurface}
      box-shadow: var(--sg-glass-shadow-lg, 0 8px 48px rgba(0, 0, 0, 0.18));
      overflow-y: auto;
      transform: scale(0.95) translateY(8px);
      transition:
        transform var(--sg-transition-base, 250ms ease),
        opacity var(--sg-transition-base, 250ms ease);
    }

    .backdrop--open .dialog {
      transform: scale(1) translateY(0);
    }

    /* ═══ Header ═══ */

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid
        var(--sg-glass-border, rgba(255, 255, 255, 0.12));
    }

    .header__title {
      font-size: 1.125rem;
      font-weight: 700;
      margin: 0;
    }

    .header__close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
      cursor: pointer;
      border-radius: var(--sg-radius-sm, 8px);
      font-size: 1.25rem;
      line-height: 1;
      transition: background var(--sg-transition-fast, 150ms ease);
    }

    .header__close:hover {
      background: var(--sg-glass-bg-hover, rgba(255, 255, 255, 0.14));
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
    }

    /* ═══ Body ═══ */

    .body {
      flex: 1;
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
    }

    /* ═══ Footer ═══ */

    .footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid
        var(--sg-glass-border, rgba(255, 255, 255, 0.12));
    }
  `;

  @property({ type: Boolean, reflect: true })
  open: boolean = false;

  @property({ type: Boolean, reflect: true })
  closable: boolean = true;

  @property({ type: Boolean, attribute: 'backdrop-dismiss' })
  backdropDismiss: boolean = true;

  @property({ type: String })
  override title: string = '';

  override render(): TemplateResult {
    const backdropClasses = classMap({
      backdrop: true,
      'backdrop--open': this.open,
    });

    const dialogClasses = classMap({
      dialog: true,
    });

    return html`
      <div
        class=${backdropClasses}
        ?hidden=${!this.open}
        @click=${this.#handleBackdropClick}
        @keydown=${this.#handleKeydown}
        role="presentation"
      >
        <div
          class=${dialogClasses}
          role="dialog"
          aria-modal=${this.open ? 'true' : 'false'}
          aria-label=${this.title || undefined}
          @click=${(e: MouseEvent) => e.stopPropagation()}
        >
          <!-- Header -->
          <div class="header">
            <h2 class="header__title">${this.title}</h2>
            ${this.closable
              ? html`
                  <button
                    class="header__close"
                    @click=${this.#close}
                    aria-label="Close dialog"
                  >
                    &times;
                  </button>
                `
              : ''}
          </div>

          <!-- Body -->
          <div class="body">
            <slot></slot>
          </div>

          <!-- Footer -->
          <div class="footer" ?hidden=${!this.#hasFooterSlotted()}>
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    `;
  }

  #handleBackdropClick(): void {
    if (this.backdropDismiss && this.open) {
      this.#close();
    }
  }

  #handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.open) {
      this.#close();
    }
  }

  #close(): void {
    this.open = false;
    this.dispatchEvent(
      new CustomEvent('close', { bubbles: true, composed: true })
    );
  }

  #hasFooterSlotted(): boolean {
    const slot = this.shadowRoot?.querySelector(
      'slot[name="footer"]'
    ) as HTMLSlotElement | null;
    return (slot?.assignedNodes().length ?? 0) > 0;
  }
}

customElements.define('sg-dialog', SgDialog);

declare global {
  interface HTMLElementTagNameMap {
    'sg-dialog': SgDialog;
  }
}
