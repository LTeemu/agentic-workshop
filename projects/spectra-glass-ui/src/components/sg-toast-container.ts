import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';

export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left';

const POSITION_STYLES: Record<ToastPosition, [string, string][]> = {
  'top-right': [['top', '16px'], ['right', '16px']],
  'top-left': [['top', '16px'], ['left', '16px']],
  'bottom-right': [['bottom', '16px'], ['right', '16px']],
  'bottom-left': [['bottom', '16px'], ['left', '16px']],
};

/**
 * A container that stacks sg-toast notifications in a fixed viewport corner.
 *
 * Toasts are rendered into a portal at `document.body` so they always float
 * above all content, regardless of where this container is placed in the DOM.
 *
 * @slot - sg-toast elements to display.
 *
 * @cssprop [--sg-toast-container-gap=12px] - Gap between stacked toasts.
 */
export class SgToastContainer extends LitElement {
  static override styles = css`
    :host {
      display: none; /* invisible host — children are portaled to body */
    }
  `;

  @property({ type: String, reflect: true })
  position: ToastPosition = 'bottom-right';

  /** Portal element at document.body. */
  private _portalEl: HTMLDivElement | null = null;

  /** True while syncing to prevent slotchange re-entry loops. */
  private _syncing = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#syncPortal();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#destroyPortal();
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('position')) {
      this.#applyPortalPosition();
    }
  }

  /** Ensure the portal div exists at document.body. */
  #ensurePortal(): HTMLDivElement {
    if (!this._portalEl) {
      this._portalEl = document.createElement('div');
      this._portalEl.style.position = 'fixed';
      this._portalEl.style.zIndex = '9999';
      this._portalEl.style.display = 'flex';
      this._portalEl.style.flexDirection = 'column';
      this._portalEl.style.gap = 'var(--sg-toast-container-gap, 12px)';
      this._portalEl.style.pointerEvents = 'none';
      this._portalEl.style.fontFamily =
        "var(--sg-font-family, 'Inter', -apple-system, sans-serif)";
      this.#applyPortalPosition();
      document.body.appendChild(this._portalEl);
    }
    return this._portalEl;
  }

  /** Position the portal at the chosen viewport corner and align toasts naturally. */
  #applyPortalPosition(): void {
    if (!this._portalEl) return;
    const rules = POSITION_STYLES[this.position] ?? POSITION_STYLES['bottom-right'];
    // Reset then apply the corner rules
    this._portalEl.style.top = '';
    this._portalEl.style.right = '';
    this._portalEl.style.bottom = '';
    this._portalEl.style.left = '';
    for (const [prop, val] of rules) {
      this._portalEl.style.setProperty(prop, val);
    }
    // Each toast keeps its natural (min-content) width
    const isLeft = this.position === 'top-left' || this.position === 'bottom-left';
    this._portalEl.style.alignItems = isLeft ? 'flex-start' : 'flex-end';
  }

  /** Move slotted sg-toast elements into the portal. */
  #syncPortal(): void {
    if (this._syncing) return;
    this._syncing = true;

    try {
      // Collect current light-DOM children that are sg-toast elements
      const toasts = Array.from(this.children).filter(
        (c): c is HTMLElement =>
          c instanceof HTMLElement && c.tagName === 'SG-TOAST',
      );
      if (toasts.length === 0) return;

      const portal = this.#ensurePortal();

      for (const el of toasts) {
        portal.appendChild(el);
        // When the toast closes itself, remove it from the portal
        el.addEventListener(
          'close',
          () => {
            if (portal.contains(el)) {
              portal.removeChild(el);
            }
          },
          { once: true },
        );
      }
    } finally {
      this._syncing = false;
    }
  }

  /** Remove the portal from the DOM. */
  #destroyPortal(): void {
    if (this._portalEl) {
      // Move children back to host
      while (this._portalEl.firstChild) {
        this.appendChild(this._portalEl.firstChild);
      }
      if (this._portalEl.parentNode) {
        this._portalEl.parentNode.removeChild(this._portalEl);
      }
      this._portalEl = null;
    }
  }

  override render() {
    return html`<slot @slotchange=${this.#syncPortal}></slot>`;
  }
}

customElements.define('sg-toast-container', SgToastContainer);

declare global {
  interface HTMLElementTagNameMap {
    'sg-toast-container': SgToastContainer;
  }
}
