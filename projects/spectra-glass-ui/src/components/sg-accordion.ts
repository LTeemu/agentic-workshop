import { LitElement, html, css, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { smoothTransition } from '../styles/shared.js';

/* ─── Accordion Container ─── */

/**
 * Container for `sg-accordion-item` elements. Manages single/multi-open.
 *
 * @fires change - Emitted when an item toggles. `event.detail` contains `{ index, open }`.
 */
export class SgAccordion extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
    }

    .accordion {
      display: flex;
      flex-direction: column;
      gap: 1px;
      background: var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      border-radius: var(--sg-radius-md, 12px);
      overflow: hidden;
    }
  `;

  /**
   * If true, multiple items can be open simultaneously.
   * @default false
   */
  @property({ type: Boolean })
  multiple: boolean = false;

  private readonly _items: SgAccordionItem[] = [];

  override render(): TemplateResult {
    return html`
      <div class="accordion" @toggle=${this.#handleItemToggle}>
        <slot @slotchange=${this.#queryItems}></slot>
      </div>
    `;
  }

  #queryItems(): void {
    const slot = this.shadowRoot?.querySelector('slot');
    if (!slot) return;
    const items = slot.assignedElements().filter(
      (el): el is SgAccordionItem => el instanceof SgAccordionItem
    );
    this._items.length = 0;
    this._items.push(...items);
  }

  #handleItemToggle(e: Event): void {
    const item = e.target as SgAccordionItem;
    if (!this.multiple) {
      this._items.forEach((other) => {
        if (other !== item && other.open) {
          other.open = false;
        }
      });
    }
  }
}

customElements.define('sg-accordion', SgAccordion);

/* ─── Accordion Item ─── */

/**
 * A single collapsible panel inside an `sg-accordion`.
 *
 * @fires toggle - Emitted when opened or closed. `event.detail` contains `{ open }`.
 *
 * @cssprop [--sg-accordion-header-bg=var(--sg-glass-bg)] - Header background.
 * @cssprop [--sg-accordion-header-hover=var(--sg-glass-bg-hover)] - Header hover background.
 * @cssprop [--sg-accordion-content-bg=transparent] - Content panel background.
 */
export class SgAccordionItem extends LitElement {
  static override styles = css`
    :host {
      display: block;
      background: var(--sg-accordion-content-bg, transparent);
    }

    .item {
      background: var(--sg-accordion-header-bg, var(--sg-glass-bg, rgba(255, 255, 255, 0.08)));
    }

    /* ─── Header ─── */

    .header {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 16px 20px;
      border: none;
      background: none;
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      font-family: inherit;
      font-size: 1rem;
      font-weight: 500;
      line-height: 1.4;
      text-align: left;
      cursor: pointer;
      ${smoothTransition}
      gap: 12px;
    }

    .header:hover {
      background: var(--sg-accordion-header-hover, var(--sg-glass-bg-hover, rgba(255, 255, 255, 0.14)));
    }

    .header:focus-visible {
      outline: 2px solid var(--sg-spectral-gold, #c4a050);
      outline-offset: -2px;
    }

    .header-text {
      flex: 1;
    }

    /* ─── Chevron ─── */

    .chevron {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
      ${smoothTransition}
    }

    .item--open .chevron {
      transform: rotate(180deg);
    }

    /* ─── Panel ───
       max-height is set dynamically via JS for smooth animation.
       The 300ms transition on max-height gives the slide effect. */

    .panel-wrapper {
      max-height: 0;
      overflow: hidden;
      transition: max-height var(--sg-transition-base, 250ms ease);
      will-change: max-height;
    }

    .panel {
      padding: 0 20px 16px;
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
      font-size: 0.9375rem;
      line-height: 1.7;
    }
  `;

  /** Whether this item is open. */
  @property({ type: Boolean, reflect: true })
  open: boolean = false;

  /** Heading text shown in the header button. */
  @property({ type: String })
  heading: string = '';

  /** Measured content height for pixel-perfect animation. */
  @state()
  private _contentHeight = 0;

  override render(): TemplateResult {
    const itemClasses = {
      item: true,
      'item--open': this.open,
    };

    return html`
      <div class=${classMap(itemClasses)}>
        <button
          class="header"
          @click=${this.#toggle}
          aria-expanded=${this.open ? 'true' : 'false'}
        >
          <span class="header-text">${this.heading}<slot name="heading"></slot></span>
          <span class="chevron">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </span>
        </button>
        <div class="panel-wrapper">
          <div class="panel">
            <slot @slotchange=${this.#measureContent}></slot>
          </div>
        </div>
      </div>
    `;
  }

  #toggle(): void {
    this.open = !this.open;
    this.dispatchEvent(
      new CustomEvent('toggle', {
        detail: { open: this.open },
        bubbles: true,
        composed: true,
      })
    );
  }

  override firstUpdated(): void {
    if (this.open) {
      this.#measureContent();
    }
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('open')) {
      this.#animatePanel();
    }
  }

  /** Measure content when slots change so we always have the right height. */
  #measureContent(): void {
    if (!this.open) return;
    const wrapper = this.renderRoot.querySelector('.panel-wrapper') as HTMLElement | null;
    if (!wrapper) return;

    // Temporarily remove max-height to read natural scrollHeight
    wrapper.style.transition = 'none';
    wrapper.style.maxHeight = '';
    const height = wrapper.scrollHeight;

    // Reset to current position instantly, then animate to new height
    wrapper.style.maxHeight = this._contentHeight + 'px';
    void wrapper.offsetHeight; // force reflow
    wrapper.style.transition = '';
    wrapper.style.maxHeight = height + 'px';

    this._contentHeight = height;
  }

  /** Animate panel open or closed by setting exact max-height. */
  #animatePanel(): void {
    const wrapper = this.renderRoot.querySelector('.panel-wrapper') as HTMLElement | null;
    if (!wrapper) return;

    if (this.open) {
      // Measure natural height after render (content is now visible)
      wrapper.style.maxHeight = '';
      const height = wrapper.scrollHeight;

      // Reset to 0 instantly, then animate to measured height
      wrapper.style.maxHeight = '0px';
      void wrapper.offsetHeight; // force reflow to start transition from 0
      wrapper.style.maxHeight = height + 'px';

      this._contentHeight = height;
    } else {
      // Animate closed — first set to current measured height (in case different)
      wrapper.style.maxHeight = this._contentHeight + 'px';
      void wrapper.offsetHeight;
      wrapper.style.maxHeight = '0px';
    }
  }
}

customElements.define('sg-accordion-item', SgAccordionItem);

declare global {
  interface HTMLElementTagNameMap {
    'sg-accordion': SgAccordion;
    'sg-accordion-item': SgAccordionItem;
  }
}
