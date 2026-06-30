import { LitElement, html, css, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  disabled?: boolean;
}

export class SgBreadcrumb extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
    }

    .breadcrumb {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .item {
      font-size: 0.8125rem;
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
      text-decoration: none;
      display: inline-flex;
      align-items: center;
    }

    .item--link {
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
      transition: color var(--sg-transition-fast, 150ms ease);
      cursor: pointer;
    }

    .item--link:hover {
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
    }

    .item--current {
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      font-weight: 600;
    }

    .item--disabled {
      opacity: 0.45;
      pointer-events: none;
    }

    .separator {
      color: var(--sg-text-tertiary, rgba(255, 255, 255, 0.35));
      user-select: none;
      display: inline-flex;
      align-items: center;
    }
  `;

  @property({ type: Array })
  items: BreadcrumbItem[] = [];

  @property({ type: String })
  separator: string = '/';

  override render(): TemplateResult {
    return html`
      <nav aria-label="Breadcrumb">
        <ol class="breadcrumb">
          ${this.items.map((item, i) => {
            const isLast = i === this.items.length - 1;

            const itemClasses = classMap({
              item: true,
              'item--link': !!item.href && !item.disabled && !isLast,
              'item--current': isLast,
              'item--disabled': !!item.disabled,
            });

            const content = item.href && !item.disabled && !isLast
              ? html`<a class=${itemClasses} href=${item.href}>${item.label}</a>`
              : html`<span class=${itemClasses} aria-current=${isLast ? 'page' : ''}>${item.label}</span>`;

            return html`
              <li style="display:contents">
                ${content}
                ${!isLast
                  ? html`<span class="separator" aria-hidden="true">${this.separator}</span>`
                  : ''}
              </li>
            `;
          })}
        </ol>
      </nav>
    `;
  }
}

customElements.define('sg-breadcrumb', SgBreadcrumb);

declare global {
  interface HTMLElementTagNameMap {
    'sg-breadcrumb': SgBreadcrumb;
  }
}
