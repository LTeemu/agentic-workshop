import { LitElement, html, css, render, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { glassSurface } from '../styles/shared.js';

export type TooltipPosition = 'auto' | 'top' | 'bottom' | 'left' | 'right';

/**
 * A glass-styled tooltip that appears on hover/focus.
 *
 * The tooltip popup is rendered in a portal (`document.body`) so it always
 * floats above any overflow-clipped parent. When `position="auto"` (default)
 * it automatically picks the corner with the most available viewport space.
 *
 * @slot - The trigger element (must be inline-level).
 *
 * @cssprop [--sg-tooltip-gap=8px] - Gap between the trigger and the tooltip.
 */
export class SgTooltip extends LitElement {
  static override styles = css`
    :host {
      display: inline-block;
    }
  `;

  @property({ type: String })
  label: string = '';

  @property({ type: String, reflect: true })
  position: TooltipPosition = 'auto';

  @property({ type: Number })
  delay: number = 200;

  @property({ type: Boolean, reflect: true })
  disabled: boolean = false;

  @state()
  private _visible: boolean = false;

  /** The actual position resolved after auto-detection. */
  private _resolvedPos: 'top' | 'bottom' | 'left' | 'right' = 'top';

  private _showTimeout: number | null = null;

  /** Portal element appended to document.body. */
  private _portalEl: HTMLDivElement | null = null;

  constructor() {
    super();
    this.addEventListener('mouseenter', this.#handleMouseEnter);
    this.addEventListener('mouseleave', this.#handleMouseLeave);
    this.addEventListener('focusin', this.#handleFocusIn);
    this.addEventListener('focusout', this.#handleFocusOut);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('scroll', this.#onScroll, true);
    window.addEventListener('resize', this.#onResize);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#clearShowTimeout();
    this.#hide();
    document.removeEventListener('scroll', this.#onScroll, true);
    window.removeEventListener('resize', this.#onResize);
  }

  #onScroll = (): void => {
    if (this._visible) this.#showPortal();
  };

  #onResize = (): void => {
    if (this._visible) this.#showPortal();
  };

  /* ---------- Portal management ---------- */

  /** Detect the best corner for the tooltip. */
  #detectPosition(): 'top' | 'bottom' | 'left' | 'right' {
    if (this.position !== 'auto') return this.position;
    const r = this.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceAbove = r.top;
    const spaceBelow = vh - r.bottom;
    const spaceLeft = r.left;
    const spaceRight = vw - r.right;
    const max = Math.max(spaceAbove, spaceBelow, spaceLeft, spaceRight);
    if (max === spaceBelow) return 'bottom';
    if (max === spaceAbove) return 'top';
    if (max === spaceRight) return 'right';
    return 'left';
  }

  /** Create and show the portal with the tooltip content. */
  #showPortal(): void {
    if (this.disabled || !this.label) return;

    this._resolvedPos = this.#detectPosition();
    const hostRect = this.getBoundingClientRect();
    const gap = 8;

    // Calculate position based on resolved direction
    let top: number, left: number;
    let originX = '0', originY = '0';

    switch (this._resolvedPos) {
      case 'top':
        top = hostRect.top - gap;
        left = hostRect.left + hostRect.width / 2;
        originX = '-50%';
        originY = '-100%';
        break;
      case 'bottom':
        top = hostRect.bottom + gap;
        left = hostRect.left + hostRect.width / 2;
        originX = '-50%';
        originY = '0';
        break;
      case 'left':
        top = hostRect.top + hostRect.height / 2;
        left = hostRect.left - gap;
        originX = '-100%';
        originY = '-50%';
        break;
      case 'right':
        top = hostRect.top + hostRect.height / 2;
        left = hostRect.right + gap;
        originX = '0';
        originY = '-50%';
        break;
    }

    // Build slide direction for the entrance animation
    const slideX = this._resolvedPos === 'left' ? '8px' : this._resolvedPos === 'right' ? '-8px' : '0';
    const slideY = this._resolvedPos === 'top' ? '8px' : this._resolvedPos === 'bottom' ? '-8px' : '0';

    const portal = this.#ensurePortal();
    portal.style.top = `${top}px`;
    portal.style.left = `${left}px`;
    portal.style.transform = `translate(${originX}, ${originY})`;

    render(this.#portalTemplate(slideX, slideY), portal);
    document.body.appendChild(portal);
    this.#clampPortal(portal);
  }

  /** Push the tooltip back on-screen if it overflows the viewport. */
  #clampPortal(portal: HTMLDivElement): void {
    const rect = portal.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let dx = 0, dy = 0;
    if (rect.right > vw) dx = vw - rect.right;
    if (rect.left < 0) dx = -rect.left;
    if (rect.bottom > vh) dy = vh - rect.bottom;
    if (rect.top < 0) dy = -rect.top;
    if (dx !== 0 || dy !== 0) {
      portal.style.transform += ` translate(${dx}px, ${dy}px)`;
    }
  }

  #ensurePortal(): HTMLDivElement {
    if (!this._portalEl) {
      this._portalEl = document.createElement('div');
      this._portalEl.style.position = 'fixed';
      this._portalEl.style.zIndex = '10000';
      this._portalEl.style.pointerEvents = 'none';
      this._portalEl.style.whiteSpace = 'nowrap';
    }
    return this._portalEl;
  }

  #portalTemplate(slideX: string, slideY: string): TemplateResult {
    return html`
      <div
        role="tooltip"
        style="
          padding: 6px 12px;
          font-size: 0.8125rem;
          border-radius: var(--sg-radius-sm, 8px);
          color: var(--sg-text-primary, rgba(255,255,255,0.9));
          font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
          background: var(--sg-glass-bg, rgba(255,255,255,0.08));
          backdrop-filter: var(--sg-glass-blur, blur(20px));
          -webkit-backdrop-filter: var(--sg-glass-blur, blur(20px));
          border: 1px solid var(--sg-glass-border, rgba(255,255,255,0.12));
          animation: sg-tooltip-in 150ms ease forwards;
          transform-origin: ${slideX === '0' ? 'center' : (slideX.startsWith('-') ? 'right' : 'left')} ${slideY === '0' ? 'center' : (slideY.startsWith('-') ? 'bottom' : 'top')};
        "
        aria-hidden="false"
      >
        ${this.label}
        <style>
          @keyframes sg-tooltip-in {
            from { opacity: 0; transform: translate(${slideX}, ${slideY}); }
            to   { opacity: 1; transform: translate(0, 0); }
          }
        </style>
      </div>
    `;
  }

  /** Destroy the portal. */
  #hidePortal(): void {
    if (this._portalEl) {
      if (this._portalEl.parentNode) {
        this._portalEl.parentNode.removeChild(this._portalEl);
      }
      render(null, this._portalEl);
    }
  }

  /* ---------- Show / hide lifecycle ---------- */

  #handleMouseEnter(): void {
    if (this.disabled) return;
    this.#scheduleShow();
  }

  #handleMouseLeave(): void {
    this.#hide();
  }

  #handleFocusIn(): void {
    if (this.disabled) return;
    this.#scheduleShow();
  }

  #handleFocusOut(): void {
    this.#hide();
  }

  #scheduleShow(): void {
    this.#clearShowTimeout();
    this._showTimeout = window.setTimeout(() => {
      this._visible = true;
      this.#showPortal();
    }, this.delay);
  }

  #hide(): void {
    this.#clearShowTimeout();
    if (this._visible) {
      this._visible = false;
      this.#hidePortal();
    }
  }

  #clearShowTimeout(): void {
    if (this._showTimeout !== null) {
      clearTimeout(this._showTimeout);
      this._showTimeout = null;
    }
  }

  /* ---------- Render (trigger slot only) ---------- */

  override render(): TemplateResult {
    return html`<slot></slot>`;
  }
}

customElements.define('sg-tooltip', SgTooltip);

declare global {
  interface HTMLElementTagNameMap {
    'sg-tooltip': SgTooltip;
  }
}
