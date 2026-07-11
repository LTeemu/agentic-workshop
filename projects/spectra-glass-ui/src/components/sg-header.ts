import { LitElement, html, css, type TemplateResult } from 'lit';
import { property, state, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { smoothTransition } from '../styles/shared.js';

/**
 * Responsive navigation bar with sticky support and a mobile
 * slide-out drawer.
 *
 * @fires menu-toggle - Emitted when the mobile menu opens or closes.
 *   `event.detail` contains `{ open: boolean }`.
 *
 * @cssprop [--sg-header-height=64px] - Header bar height.
 * @cssprop [--sg-header-bg=var(--sg-glass-bg)] - Header background.
 * @cssprop [--sg-header-blur=var(--sg-glass-blur)] - Header backdrop blur.
 * @cssprop [--sg-header-border=var(--sg-glass-border)] - Header bottom border.
 * @cssprop [--sg-drawer-width=280px] - Mobile drawer width.
 * @cssprop [--sg-drawer-bg=rgba(20,20,30,0.95)] - Mobile drawer background.
 */
export class SgHeader extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
      position: relative;
      z-index: 100;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
    }

    :host([sticky]) {
      position: sticky;
      top: 0;
    }

    /* ═══ Bar ═══ */

    .bar {
      display: flex;
      align-items: center;
      height: var(--sg-header-height, 64px);
      padding: 0 var(--sg-section-gutter, 1.5rem);
      background: var(--sg-header-bg, var(--sg-glass-bg, rgba(255, 255, 255, 0.08)));
      backdrop-filter: var(--sg-header-blur, var(--sg-glass-blur, blur(20px)));
      -webkit-backdrop-filter: var(--sg-header-blur, var(--sg-glass-blur, blur(20px)));
      border-bottom: 1px solid var(--sg-header-border, var(--sg-glass-border, rgba(255, 255, 255, 0.12)));
      gap: 24px;
      box-sizing: border-box;
    }

    .logo {
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .spacer {
      flex: 1;
    }

    .desktop-nav {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .desktop-nav ::slotted(a),
    .desktop-nav ::slotted(button) {
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
      text-decoration: none;
      font-size: 0.9375rem;
      font-weight: 500;
      padding: 8px 14px;
      border-radius: var(--sg-radius-sm, 8px);
      transition: color var(--sg-transition-fast, 150ms ease);
    }

    .desktop-nav ::slotted(a:hover),
    .desktop-nav ::slotted(button:hover) {
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
    }

    .desktop-cta {
      flex-shrink: 0;
    }

    /* ─── Hamburger ─── */

    .hamburger {
      display: none;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: none;
      border-radius: var(--sg-radius-sm, 8px);
      background: var(--sg-glass-bg-hover, rgba(255, 255, 255, 0.14));
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      cursor: pointer;
      flex-shrink: 0;
      ${smoothTransition}
    }

    .hamburger:hover {
      background: var(--sg-glass-bg-active, rgba(255, 255, 255, 0.18));
    }

    /* ═══ Drawer backdrop ═══ */

    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--sg-transition-base, 250ms ease);
      z-index: 98;
    }

    .backdrop--open {
      opacity: 1;
      pointer-events: auto;
    }

    /* ═══ Drawer ═══ */

    .drawer {
      position: fixed;
      top: 0;
      right: 0;
      height: 100vh;
      width: var(--sg-drawer-width, 280px);
      background: var(--sg-drawer-bg, rgba(20, 20, 30, 0.95));
      backdrop-filter: var(--sg-glass-blur, blur(20px));
      -webkit-backdrop-filter: var(--sg-glass-blur, blur(20px));
      z-index: 99;
      transform: translateX(100%);
      ${smoothTransition}
      display: flex;
      flex-direction: column;
      border-left: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      box-sizing: border-box;
    }

    .drawer--open {
      transform: translateX(0);
    }

    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      height: var(--sg-header-height, 64px);
      padding: 0 1rem;
      border-bottom: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      flex-shrink: 0;
    }

    .drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
    }

    .drawer-body [data-nav-clone] {
      display: block;
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      text-decoration: none;
      font-size: 1.0625rem;
      font-weight: 500;
      padding: 12px 8px;
      border-radius: var(--sg-radius-sm, 8px);
      box-sizing: border-box;
      transition: background var(--sg-transition-fast, 150ms ease);
    }

    .drawer-body [data-nav-clone]:not(:last-child) {
      margin-bottom: 4px;
    }

    .drawer-body [data-nav-clone]:hover {
      background: var(--sg-glass-bg-hover, rgba(255, 255, 255, 0.14));
    }

    /* The divider and button shouldn't get nav-link padding — they have their own */
    .drawer-body sg-divider[data-nav-clone] {
      padding: 0;
    }
    .drawer-body sg-button[data-nav-clone] {
      padding: 0;
      text-align: center;
    }

    /* Inside the shadow DOM, global stylesheets don't apply, so the
       .theme-switcher class from the page CSS has no effect here.
       Provide explicit styling for cloned selects in the drawer. */
    .drawer-body select[data-nav-clone] {
      appearance: none;
      -webkit-appearance: none;
      background: rgba(255, 255, 255, 0.06);
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
      border: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      border-radius: var(--sg-radius-sm, 8px);
      padding: 10px 28px 10px 10px;
      font-size: 1rem;
      font-family: inherit;
      cursor: pointer;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='rgba(255,255,255,0.4)' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
      background-size: 10px 6px;
    }

    .drawer-body select[data-nav-clone]:hover {
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      border-color: rgba(255, 255, 255, 0.25);
      background-color: rgba(255, 255, 255, 0.1);
    }

    .drawer-body select[data-nav-clone] option {
      background: #1a1a2a;
      color: rgba(255, 255, 255, 0.9);
    }

    /* ─── Responsive (driven by _match state, not hardcoded px) ─── */

    .bar--mobile .desktop-nav,
    .bar--mobile .desktop-cta {
      display: none;
    }

    .bar--mobile .hamburger {
      display: flex;
    }
  `;

  /** Whether the header is sticky (stays at top on scroll). */
  @property({ type: Boolean, reflect: true })
  sticky: boolean = true;

  /** Whether the mobile drawer is open. */
  @property({ type: Boolean, reflect: true, attribute: 'menu-open' })
  menuOpen: boolean = false;

  /**
   * Breakpoint below which the mobile drawer shows.
   * @default '768px'
   */
  @property({ type: String, attribute: 'mobile-breakpoint' })
  mobileBreakpoint: string = '768px';

  @state()
  private _match = false;

  @query('.desktop-nav slot[name="nav"]')
  private _navSlot!: HTMLSlotElement;

  @query('.desktop-cta slot[name="cta"]')
  private _ctaSlot!: HTMLSlotElement;

  @query('.drawer-body')
  private _drawerBody!: HTMLElement;

  private _mq?: MediaQueryList;
  private _mqHandler?: () => void;

  /** Set up (or tear down + re-create) the responsive media query. */
  #initMediaQuery(): void {
    // Tear down previous listener
    if (this._mq && this._mqHandler) {
      this._mq.removeEventListener('change', this._mqHandler);
    }
    this._mq = window.matchMedia(`(max-width: ${this.mobileBreakpoint})`);
    this._match = this._mq.matches;
    this._mqHandler = () => {
      this._match = this._mq!.matches;
      if (!this._match) this.menuOpen = false;
    };
    this._mq.addEventListener('change', this._mqHandler);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#initMediaQuery();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._mq && this._mqHandler) {
      this._mq.removeEventListener('change', this._mqHandler);
    }
    this.#unlockScroll();
  }

  override firstUpdated(): void {
    this.#mirrorToDrawer();
    this._navSlot.addEventListener('slotchange', () => this.#mirrorToDrawer());
    this._ctaSlot.addEventListener('slotchange', () => this.#mirrorToDrawer());

    // The native `change` event has `composed: false`, so it's trapped
    // inside the shadow DOM. Re-dispatch as a composed event so the
    // page's delegation listener can catch it.
    this._drawerBody.addEventListener('change', (e: Event) => {
      if (!e.isTrusted) return; // prevent loop from our own re-dispatch
      const target = e.target as Element;
      if (target.matches('.theme-switcher')) {
        target.dispatchEvent(
          new Event('change', { bubbles: true, composed: true })
        );
      }
    });
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('menuOpen')) {
      if (this.menuOpen) {
        this.#lockScroll();
      } else {
        this.#unlockScroll();
      }
    }
    if (changed.has('mobileBreakpoint')) {
      this.#initMediaQuery();
    }
  }

  override render(): TemplateResult {
    const drawerClasses = {
      drawer: true,
      'drawer--open': this.menuOpen,
    };

    const backdropClasses = {
      backdrop: true,
      'backdrop--open': this.menuOpen,
    };

    const barClasses = {
      bar: true,
      'bar--mobile': this._match,
    };

    return html`
      <header class=${classMap(barClasses)}>
        <div class="logo"><slot name="logo"></slot></div>
        <div class="spacer"></div>
        <nav class="desktop-nav"><slot name="nav"></slot></nav>
        <div class="desktop-cta"><slot name="cta"></slot></div>
        <button
          class="hamburger"
          @click=${this.#toggleMenu}
          aria-label=${this.menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded=${this.menuOpen ? 'true' : 'false'}
        >
          ${this.menuOpen
            ? html`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
            : html`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`}
        </button>
      </header>

      <!-- Backdrop -->
      <div class=${classMap(backdropClasses)} @click=${this.#closeMenu}></div>

      <!-- Drawer -->
      <aside class=${classMap(drawerClasses)}>
        <div class="drawer-header">
          <button
            class="hamburger"
            @click=${this.#closeMenu}
            aria-label="Close menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="drawer-body"></div>
      </aside>
    `;
  }

  /** Clone the desktop nav and CTA slot nodes into the drawer body. */
  #mirrorToDrawer(): void {
    // Remove stale clones
    this._drawerBody.querySelectorAll<Element>('[data-nav-clone]').forEach((el) => el.remove());

    const navAssigned = this._navSlot.assignedElements({ flatten: true });
    const ctaAssigned = this._ctaSlot.assignedElements({ flatten: true });

    // Clone nav links — each closes the drawer on click
    navAssigned.forEach((el, i) => {
      const clone = el.cloneNode(true) as HTMLElement;
      clone.setAttribute('data-nav-clone', '');
      clone.addEventListener('click', () => this.#closeMenu());
      if (i < navAssigned.length - 1 || ctaAssigned.length > 0) {
        clone.style.marginBottom = '4px';
      }
      this._drawerBody.appendChild(clone);
    });

    if (ctaAssigned.length === 0) return;

    // Visual separator before CTA items using the library's own divider
    const sep = document.createElement('sg-divider');
    sep.setAttribute('variant', 'solid');
    sep.setAttribute('data-nav-clone', '');
    (sep as HTMLElement).style.margin = '12px 0';
    this._drawerBody.appendChild(sep);

    ctaAssigned.forEach((el, i) => {
      const clone = el.cloneNode(true) as HTMLElement;
      clone.setAttribute('data-nav-clone', '');
      const isButton = clone.matches('button, sg-button, a');
      if (isButton) {
        clone.addEventListener('click', () => this.#closeMenu());
        if (clone.matches('sg-button')) {
          // Upgrade size and make it full-width for the drawer
          clone.setAttribute('size', 'md');
          clone.setAttribute('block', '');
        }
      }
      // Full-width in the drawer
      clone.style.width = '100%';
      clone.style.boxSizing = 'border-box';
      if (i < ctaAssigned.length - 1) {
        clone.style.marginBottom = '12px';
      }
      this._drawerBody.appendChild(clone);
    });
  }

  #toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    this.#dispatchMenuToggle();
  }

  #closeMenu(): void {
    this.menuOpen = false;
    this.#dispatchMenuToggle();
  }

  #dispatchMenuToggle(): void {
    this.dispatchEvent(
      new CustomEvent('menu-toggle', {
        detail: { open: this.menuOpen },
        bubbles: true,
        composed: true,
      })
    );
  }

  #lockScroll(): void {
    document.body.style.overflow = 'hidden';
  }

  #unlockScroll(): void {
    document.body.style.overflow = '';
  }
}

customElements.define('sg-header', SgHeader);

declare global {
  interface HTMLElementTagNameMap {
    'sg-header': SgHeader;
  }
}
