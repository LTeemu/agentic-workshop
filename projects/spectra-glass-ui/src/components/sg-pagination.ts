import { LitElement, html, css, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import './sg-icon.js';

export type PaginationSize = 'sm' | 'md';

export class SgPagination extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
    }

    .pagination {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 4px;
    }

    .page-btn {
      min-width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--sg-radius-sm, 8px);
      border: 1px solid transparent;
      background: transparent;
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
      cursor: pointer;
      font-size: 0.875rem;
      font-family: inherit;
      transition:
        background var(--sg-transition-fast, 150ms ease),
        color var(--sg-transition-fast, 150ms ease),
        border-color var(--sg-transition-fast, 150ms ease),
        box-shadow var(--sg-transition-fast, 150ms ease);
      padding: 0;
      line-height: 1;
      user-select: none;
    }

    .page-btn:hover:not(.page-btn--disabled) {
      background: var(--sg-glass-bg-hover, rgba(255, 255, 255, 0.12));
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
    }

    .page-btn--active {
      background: var(
        --sg-gradient-spectral,
        linear-gradient(
          135deg,
          rgba(212, 134, 159, 0.8),
          rgba(196, 160, 80, 0.8),
          rgba(127, 168, 141, 0.8),
          rgba(122, 128, 192, 0.8)
        )
      );
      color: #fff;
      border-color: transparent;
    }

    .page-btn--active:hover:not(.page-btn--disabled) {
      color: #fff;
    }

    .page-btn--disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .page-btn--sm {
      min-width: 32px;
      height: 32px;
      font-size: 0.8125rem;
    }

    .ellipsis {
      padding: 0 4px;
      color: var(--sg-text-tertiary, rgba(255, 255, 255, 0.35));
      font-size: 0.875rem;
      user-select: none;
    }

  `;

  @property({ type: Number })
  total: number = 1;

  @property({ type: Number, reflect: true })
  current: number = 1;

  @property({ type: Number, attribute: 'sibling-count' })
  siblingCount: number = 1;

  @property({ type: Boolean, attribute: 'show-first-last' })
  showFirstLast: boolean = false;

  @property({ type: String, reflect: true })
  size: PaginationSize = 'md';

  get #pages(): (number | 'ellipsis')[] {
    const total = this.total;
    const current = this.current;
    const siblings = this.siblingCount;

    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const rangeStart = Math.max(2, current - siblings);
    const rangeEnd = Math.min(total - 1, current + siblings);

    const pages: (number | 'ellipsis')[] = [1];

    if (rangeStart > 2) {
      pages.push('ellipsis');
    }

    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i);
    }

    if (rangeEnd < total - 1) {
      pages.push('ellipsis');
    }

    pages.push(total);

    return pages;
  }

  #goTo(page: number): void {
    if (page < 1 || page > this.total || page === this.current) return;
    this.current = page;
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { page },
        bubbles: true,
        composed: true,
      })
    );
  }

  override render(): TemplateResult {
    if (this.total <= 1) return html``;

    const btnClasses = classMap({
      'page-btn': true,
      [`page-btn--${this.size}`]: this.size !== 'md',
    });

    const disabledBtn = classMap({
      'page-btn': true,
      [`page-btn--${this.size}`]: this.size !== 'md',
      'page-btn--disabled': true,
    });

    const chevronLeft = html`<sg-icon name="chevron-left" size="sm"></sg-icon>`;
    const chevronRight = html`<sg-icon name="chevron-right" size="sm"></sg-icon>`;
    const chevronsLeft = html`
      <sg-icon name="chevron-left" size="sm"></sg-icon>
      <sg-icon name="chevron-left" size="sm"></sg-icon>
    `;
    const chevronsRight = html`
      <sg-icon name="chevron-right" size="sm"></sg-icon>
      <sg-icon name="chevron-right" size="sm"></sg-icon>
    `;

    return html`
      <nav class="pagination" role="navigation" aria-label="Pagination">
        ${this.showFirstLast
          ? html`
              <button
                class=${this.current === 1 ? disabledBtn : btnClasses}
                ?disabled=${this.current === 1}
                @click=${() => this.#goTo(1)}
                aria-label="First page"
              >
                ${chevronsLeft}
              </button>
            `
          : ''}

        <button
          class=${this.current === 1 ? disabledBtn : btnClasses}
          ?disabled=${this.current === 1}
          @click=${() => this.#goTo(this.current - 1)}
          aria-label="Previous page"
        >
          ${chevronLeft}
        </button>

        ${this.#pages.map(p => {
          if (p === 'ellipsis') {
            return html`<span class="ellipsis">&hellip;</span>`;
          }

          const isActive = p === this.current;

          const classes = classMap({
            'page-btn': true,
            [`page-btn--${this.size}`]: this.size !== 'md',
            'page-btn--active': isActive,
          });

          return html`
            <button
              class=${classes}
              @click=${() => this.#goTo(p)}
              aria-label=${`Page ${p}`}
              aria-current=${isActive ? 'page' : ''}
            >
              ${p}
            </button>
          `;
        })}

        <button
          class=${this.current === this.total ? disabledBtn : btnClasses}
          ?disabled=${this.current === this.total}
          @click=${() => this.#goTo(this.current + 1)}
          aria-label="Next page"
        >
          ${chevronRight}
        </button>

        ${this.showFirstLast
          ? html`
              <button
                class=${this.current === this.total ? disabledBtn : btnClasses}
                ?disabled=${this.current === this.total}
                @click=${() => this.#goTo(this.total)}
                aria-label="Last page"
              >
                ${chevronsRight}
              </button>
            `
          : ''}
      </nav>
    `;
  }
}

customElements.define('sg-pagination', SgPagination);

declare global {
  interface HTMLElementTagNameMap {
    'sg-pagination': SgPagination;
  }
}
