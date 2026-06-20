import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';

export class UrlInput extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    .container {
      display: flex;
      gap: var(--space-2);
      align-items: stretch;
    }
    @media (max-width: 480px) {
      button { padding: var(--space-3) var(--space-4); flex-shrink: 0; }
    }
    .input-wrapper {
      flex: 1;
      position: relative;
      padding: var(--space-3) var(--space-4);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }
    .input-wrapper:focus-within {
      border-color: var(--color-accent);
    }
    input {
      display: block;
      width: 100%;
      height: 100%;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--color-text);
      font-size: var(--font-size-base);
      font-family: var(--font-mono);
      outline: none;
    }
    input::placeholder {
      color: var(--color-text-secondary);
    }
    button {
      width: max-content;
      padding: var(--space-3) var(--space-6);
      background: var(--color-accent);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-size: var(--font-size-base);
      font-weight: 600;
      cursor: pointer;
      transition: background var(--transition-fast), opacity var(--transition-fast);
      white-space: nowrap;
    }
    button:hover:not(:disabled) {
      background: var(--color-accent-hover);
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .spinner {
      display: inline-block;
      width: 1em;
      height: 1em;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin-right: var(--space-2);
      vertical-align: middle;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  @property({ type: String }) value = '';
  @property({ type: Boolean }) loading = false;

  private _onInput(e: Event) {
    this.value = (e.target as HTMLInputElement).value;
  }

  private _onSubmit() {
    if (!this.value.trim() || this.loading) return;
    const url = this.value.startsWith('http') ? this.value : `https://${this.value}`;
    this.dispatchEvent(new CustomEvent('audit-start', {
      detail: { url },
      bubbles: true,
      composed: true,
    }));
  }

  private _onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') this._onSubmit();
  }

  render() {
    return html`
      <div class="container" role="search">
        <div class="input-wrapper">
          <input
            type="url"
            .value=${this.value}
            @input=${this._onInput}
            @keydown=${this._onKeydown}
            placeholder="Enter a URL… e.g. example.com"
            aria-label="URL to audit"
            ?disabled=${this.loading}
          />
        </div>
        <button
          @click=${this._onSubmit}
          ?disabled=${this.loading || !this.value.trim()}
          aria-label="Run performance audit"
        >
          ${this.loading ? html`<span class="spinner"></span> Auditing…` : 'Audit'}
        </button>
      </div>
    `;
  }
}

customElements.define('url-input', UrlInput);
