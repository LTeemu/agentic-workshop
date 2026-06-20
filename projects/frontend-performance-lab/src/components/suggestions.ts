import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import type { SuggestionsResult, Suggestion } from '../lib/types.js';

export class SuggestionsList extends LitElement {
  static styles = css`
    :host {
      display: block;
      contain: layout style;
      min-height: 48px;
    }
    h3 {
      font-size: var(--font-size-lg);
      margin-bottom: var(--space-4);
    }
    .group {
      margin-bottom: var(--space-4);
    }
    .group-title {
      font-size: var(--font-size-sm);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: var(--space-2);
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: white;
    }
    .badge.critical { background: var(--color-critical); }
    .badge.warning { background: var(--color-warning); }
    .badge.info { background: var(--color-info); }
    .group-title .count {
      font-size: var(--font-size-xs);
      font-weight: 400;
      color: var(--color-text-secondary);
    }
    .item {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      padding: var(--space-3);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      margin-bottom: var(--space-2);
    }
    @media (max-width: 480px) {
      .item { padding: var(--space-2); gap: var(--space-2); }
      .item-text { font-size: var(--font-size-xs); }
    }
    .item:hover {
      border-color: var(--color-accent);
    }
    .item-icon {
      flex-shrink: 0;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-top: 6px;
    }
    .item-icon.critical { background: var(--color-critical); }
    .item-icon.warning { background: var(--color-warning); }
    .item-icon.info { background: var(--color-info); }
    .item-body {
      flex: 1;
      min-width: 0;
    }
    .item-text {
      font-size: var(--font-size-sm);
      line-height: 1.5;
    }
    .item-category {
      font-size: var(--font-size-xs);
      color: var(--color-accent);
      margin-top: var(--space-1);
    }
    .empty {
      text-align: center;
      padding: var(--space-8);
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
    }
  `;

  @property({ type: Object }) suggestions: SuggestionsResult | null = null;

  private _renderGroup(severity: string, items: Suggestion[], label: string, iconClass: string) {
    if (!items || items.length === 0) return null;

    return html`
      <div class="group">
        <div class="group-title">
          <span class="badge ${iconClass}">${severity === 'critical' ? '!' : severity === 'warning' ? '!' : 'i'}</span>
          ${label}
          <span class="count">(${items.length})</span>
        </div>
        ${items.map(s => html`
          <div class="item">
            <span class="item-icon ${iconClass}"></span>
            <div class="item-body">
              <div class="item-text">${s.text}</div>
              <div class="item-category">${s.category}</div>
            </div>
          </div>
        `)}
      </div>
    `;
  }

  render() {
    if (!this.suggestions) {
      return html`<div class="empty">Run an audit to see improvement suggestions</div>`;
    }

    const { critical, warning, info } = this.suggestions;
    const total = critical.length + warning.length + info.length;

    return html`
      <h3>Improvement Suggestions (${total})</h3>
      ${this._renderGroup('critical', critical, 'Critical', 'critical')}
      ${this._renderGroup('warning', warning, 'Warnings', 'warning')}
      ${this._renderGroup('info', info, 'Info', 'info')}
      ${total === 0 ? html`<div class="empty">No issues found — great job!</div>` : ''}
    `;
  }
}

customElements.define('suggestions-list', SuggestionsList);
