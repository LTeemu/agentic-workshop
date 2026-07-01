import { LitElement, html, css, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { smoothTransition } from '../styles/shared.js';

export interface Tab {
  id: string;
  label: string;
  disabled?: boolean;
}

/**
 * A tabbed container with glassmorphism styling.
 *
 * @fires change - Emitted when the active tab changes. `event.detail` contains `{ tabId }`.
 *
 * @cssprop [--sg-font-family] - Font family.
 * @cssprop [--sg-text-primary] - Primary text color.
 * @cssprop [--sg-text-secondary] - Secondary text color.
 * @cssprop [--sg-glass-bg] - Glass surface background.
 * @cssprop [--sg-glass-bg-hover] - Glass surface hover background.
 * @cssprop [--sg-glass-border] - Glass border color.
 * @cssprop [--sg-gradient-spectral] - Spectral gradient for underline.
 * @cssprop [--sg-spectral-color3] - Focus ring color.
 * @cssprop [--sg-radius-sm] - Border radius for tabs.
 */
export class SgTabs extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
    }

    .tabs-bar {
      display: flex;
      gap: 4px;
    }

    :host([variant="underline"]) .tabs-bar {
      border-bottom: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
    }

    .tab {
      padding: 10px 20px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
      border: none;
      background: transparent;
      border-radius: var(--sg-radius-sm, 8px);
      font-family: inherit;
      white-space: nowrap;
      ${smoothTransition}
    }

    .tab:hover {
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      background: var(--sg-glass-bg-hover, rgba(255, 255, 255, 0.14));
    }

    .tab:focus-visible {
      outline: 2px solid var(--sg-spectral-color3, #c4a050);
    }

    .tab--disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .tab--underline.tab--active {
      border-bottom: 2px solid var(--sg-gradient-spectral);
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      border-radius: 0;
    }

    .tab--pills.tab--active {
      background: var(--sg-glass-bg, rgba(255, 255, 255, 0.08));
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
    }

    .tab--glass.tab--active {
      background: var(--sg-glass-bg, rgba(255, 255, 255, 0.08));
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
    }

    .content {
      padding-top: 16px;
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
    }
  `;

  @property({ type: Array })
  tabs: Tab[] = [];

  @property({ type: String, reflect: true })
  activeTab: string = '';

  @property({ type: String, reflect: true })
  variant: 'underline' | 'pills' | 'glass' = 'glass';

  override firstUpdated(): void {
    if (!this.activeTab && this.tabs.length > 0) {
      const first = this.tabs.find((t) => !t.disabled);
      if (first) {
        this.activeTab = first.id;
      }
    }
  }

  override render(): TemplateResult {
    const tabButtons = this.tabs.map((tab) => {
      const isActive = tab.id === this.activeTab;
      const tabClasses = classMap({
        tab: true,
        'tab--active': isActive,
        'tab--disabled': !!tab.disabled,
        [`tab--${this.variant}`]: true,
      });

      return html`
        <button
          class=${tabClasses}
          role="tab"
          aria-selected=${isActive ? 'true' : 'false'}
          aria-controls=${tab.id}
          ?disabled=${tab.disabled}
          @click=${() => this.#onTabClick(tab.id)}
        >
          ${tab.label}
        </button>
      `;
    });

    return html`
      <div class="tabs-bar" role="tablist">
        ${tabButtons}
      </div>
      <div class="content" role="tabpanel">
        ${this.activeTab ? html`<slot name=${this.activeTab}></slot>` : ''}
      </div>
    `;
  }

  #onTabClick(tabId: string): void {
    if (this.activeTab === tabId) return;
    this.activeTab = tabId;
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { tabId },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define('sg-tabs', SgTabs);

declare global {
  interface HTMLElementTagNameMap {
    'sg-tabs': SgTabs;
  }
}
