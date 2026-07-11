import { LitElement, html, css, render, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';

/**
 * A glassmorphic modal dialog rendered in a portal (`document.body`)
 * so it always overflows any container.
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
  /** Portal styles — rendered as `<style>` inside the portal div. */
  private static readonly _portalCSS = `
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
      pointer-events: none;
      transition: opacity var(--sg-transition-base, 250ms ease);
    }
    .backdrop--open {
      opacity: 1;
      pointer-events: auto;
    }
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
      background: var(--sg-glass-bg, rgba(255, 255, 255, 0.08));
      backdrop-filter: var(--sg-glass-blur, blur(20px));
      -webkit-backdrop-filter: var(--sg-glass-blur, blur(20px));
      border: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
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
    .dialog--accent::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      padding: 1px;
      background: var(--sg-dialog-accent,
        var(--sg-gradient-spectral,
          linear-gradient(135deg, rgba(212, 134, 159, 0.5), rgba(196, 160, 80, 0.5), rgba(127, 168, 141, 0.5), rgba(122, 128, 192, 0.5))
        ));
      -webkit-mask: linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask-composite: exclude;
      pointer-events: none;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
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
    .body {
      flex: 1;
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
    }
    .footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
    }
  `;

  static override styles = css`
    :host {
      display: contents;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
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

  /** When true, renders a 1px spectral gradient border overlay. */
  @property({ type: Boolean, reflect: true })
  accent: boolean = false;

  private _portalEl: HTMLDivElement | null = null;
  private _previousFocus: HTMLElement | null = null;
  /** Saved slot-assigned nodes so they can be restored on close. */
  private _savedSlotNodes: Map<string, Node[]> = new Map();

  /** Selector for focusable elements inside the dialog. */
  private static readonly _FOCUSABLE =
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])';

  override render(): TemplateResult {
    return html`
      <!-- Hidden slot holders — keep light-DOM children tracked for portal cloning -->
      <div style="display:none" aria-hidden="true">
        <slot name="header"></slot>
        <slot></slot>
        <slot name="footer"></slot>
      </div>
    `;
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('open')) {
      if (this.open) {
        this._previousFocus = document.activeElement as HTMLElement | null;
        this.#showPortal();
        requestAnimationFrame(() => this.#focusFirst());
      } else {
        this.#hidePortal();
        this._previousFocus?.focus();
        this._previousFocus = null;
      }
    } else if (
      this.open &&
      (changed.has('closable') || changed.has('accent') || changed.has('title'))
    ) {
      this.#updatePortal();
    }
  }

  // ── Portal lifecycle ──

  #showPortal(): void {
    // Save slot-assigned nodes on first open only — they get moved to the
    // portal and become detached on close; we keep the references for re-use.
    if (this._savedSlotNodes.size === 0) {
      this._savedSlotNodes.set('header', this.#getSlotContent('header'));
      this._savedSlotNodes.set('body', this.#getSlotContent());
      this._savedSlotNodes.set('footer', this.#getSlotContent('footer'));
    }

    const portal = this.#ensurePortal();
    render(this.#portalTemplate(), portal);
    document.body.appendChild(portal);
  }

  #hidePortal(): void {
    this.#destroyPortal();
  }

  #destroyPortal(): void {
    if (this._portalEl) {
      if (this._portalEl.parentNode) {
        this._portalEl.parentNode.removeChild(this._portalEl);
      }
      render(null, this._portalEl);
      this._portalEl = null;
      // Nodes are now detached but kept alive via _savedSlotNodes
      // — they'll be re-rendered into the portal on next open.
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#destroyPortal();
    this._savedSlotNodes.clear();
  }

  #ensurePortal(): HTMLDivElement {
    if (!this._portalEl) {
      this._portalEl = document.createElement('div');
    }
    return this._portalEl;
  }

  // ── Portal template ──

  #portalTemplate(): TemplateResult {
    const headerNodes = this._savedSlotNodes.get('header') || [];
    const bodyNodes = this._savedSlotNodes.get('body') || [];
    const footerNodes = this._savedSlotNodes.get('footer') || [];

    const hasFooter = footerNodes.length > 0;
    const accessibleTitle = this.#textContent(headerNodes) || this.title;

    return html`
      <style>${SgDialog._portalCSS}</style>
      <div
        class="backdrop backdrop--open"
        @click=${() => this.#handleBackdropClick()}
        @keydown=${(e: KeyboardEvent) => this.#handleKeydown(e)}
        role="presentation"
      >
        <div
          class="dialog${this.accent ? ' dialog--accent' : ''}"
          role="dialog"
          tabindex="-1"
          aria-modal="true"
          aria-label=${accessibleTitle || undefined}
          @click=${(e: MouseEvent) => e.stopPropagation()}
        >
          <!-- Header -->
          <div class="header">
            <h2 class="header__title">
              ${headerNodes.length > 0 ? headerNodes : this.title}
            </h2>
            ${this.closable
              ? html`
                  <button
                    class="header__close"
                    @click=${() => this.#close()}
                    aria-label="Close dialog"
                  >
                    &times;
                  </button>
                `
              : ''}
          </div>

          <!-- Body -->
          <div class="body">
            ${bodyNodes}
          </div>

          <!-- Footer -->
          ${hasFooter
            ? html`
                <div class="footer">
                  ${footerNodes}
                </div>
              `
            : ''}
        </div>
      </div>
    `;
  }

  /** Re-render the portal template in-place (used when properties change while open). */
  #updatePortal(): void {
    if (this._portalEl && this._portalEl.parentNode) {
      render(this.#portalTemplate(), this._portalEl);
    }
  }

  // ── Slot helpers ──

  #getSlotContent(name?: string): Node[] {
    const sel = name != null ? `slot[name="${name}"]` : 'slot:not([name])';
    const slot = this.shadowRoot?.querySelector<HTMLSlotElement>(sel);
    if (!slot) return [];
    const nodes = slot.assignedNodes({ flatten: true });
    // Filter out whitespace-only text nodes
    return nodes.filter(n => n.nodeType !== 3 || (n.textContent ?? '').trim().length > 0);
  }

  #textContent(nodes: Node[]): string {
    return nodes.map(n => n.textContent ?? '').join(' ').trim();
  }

  // ── Focus management ──

  #focusFirst(): void {
    if (!this._portalEl) return;
    const panel = this._portalEl.querySelector('.dialog');
    if (!panel) return;
    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>(SgDialog._FOCUSABLE)
    );
    if (focusable.length > 0) {
      focusable[0]!.focus();
    } else {
      (panel as HTMLElement).focus();
    }
  }

  #handleBackdropClick(): void {
    if (this.backdropDismiss && this.open) {
      this.#close();
    }
  }

  #handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.open) {
      this.#close();
      return;
    }

    // Trap Tab focus within the portal
    if (e.key === 'Tab' && this.open && this._portalEl) {
      const panel = this._portalEl.querySelector('.dialog');
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(SgDialog._FOCUSABLE)
      );
      if (focusable.length < 2) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }

  #close(): void {
    this.open = false;
    this.dispatchEvent(
      new CustomEvent('close', { bubbles: true, composed: true })
    );
  }
}

customElements.define('sg-dialog', SgDialog);

declare global {
  interface HTMLElementTagNameMap {
    'sg-dialog': SgDialog;
  }
}
