import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';

export class PagePreview extends LitElement {
  static styles = css`
    :host {
      display: block;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      overflow: hidden;
      background: var(--color-surface);
      contain: layout style;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--color-border);
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }
    .url {
      font-family: var(--font-mono);
      font-size: var(--font-size-xs);
      color: var(--color-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .status {
      display: flex;
      gap: var(--space-2);
      align-items: center;
      flex-shrink: 0;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-text-secondary);
    }
    .dot.loaded { background: var(--color-success); }
    .dot.loading { background: var(--color-warning); animation: pulse 1s ease infinite; }
    .dot.error { background: var(--color-critical); }
    .img-wrap {
      width: 100%;
      max-height: 400px;
      min-height: 200px;
      overflow-y: auto;
      contain: layout paint;
      position: relative;
      background: #fff;
    }
    @media (max-width: 768px) {
      .img-wrap { max-height: 250px; }
    }
    @media (max-width: 480px) {
      .img-wrap { max-height: 180px; }
    }
    .img-wrap img {
      width: 100%;
      display: block;
      height: auto;
    }
    .preview-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--color-surface);
      gap: var(--space-2);
      padding: var(--space-4);
    }
    .empty {
      display: flex;
      align-items: center;
      justify-content: center;
      aspect-ratio: 16 / 9;
      max-height: 400px;
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
      contain: layout;
      padding: var(--space-4);
      text-align: center;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `;

  @property({ type: String }) url = '';
  @property({ type: String }) screenshotUrl = '';

  @property({ type: String }) status: 'idle' | 'loading' | 'loaded' | 'error' = 'idle';
  @property({ type: String }) errorMessage = '';

  private _imgKey = 0;

  updated(changed: Map<string, unknown>) {
    if (changed.has('screenshotUrl') && this.screenshotUrl) {
      this.status = 'loading';
      this.errorMessage = '';
      this._imgKey++;
    }
  }

  private _onImgLoad() {
    this.status = 'loaded';
    this.errorMessage = '';
  }

  private _onImgError() {
    this.status = 'error';
    this.errorMessage = 'Screenshot not available';
  }

  render() {
    const label = !this.screenshotUrl ? 'No screenshot'
      : this.status === 'loading' ? 'Loading…'
      : this.status === 'loaded' ? 'Loaded'
      : this.status === 'error' ? 'Error'
      : 'Idle';

    return html`
      <div class="header">
        <span class="url">${this.url || 'No page loaded'}</span>
        <span class="status">
          <span class="dot ${this.screenshotUrl ? this.status : ''}"></span>
          <span>${label}</span>
        </span>
      </div>
      ${this.screenshotUrl
        ? html`<div class="img-wrap">
            <img
              key=${this._imgKey}
              src=${this.screenshotUrl}
              alt="Screenshot of ${this.url}"
              @load=${this._onImgLoad}
              @error=${this._onImgError}
            />
            ${this.errorMessage ? html`<div class="preview-overlay">
              <div class="overlay-icon">⊘</div>
              <div class="overlay-text">${this.errorMessage}</div>
            </div>` : ''}
          </div>`
        : html`<div class="empty">${this.url ? 'Run an audit to capture a screenshot' : 'Enter a URL to begin'}</div>`
      }
    `;
  }
}

customElements.define('page-preview', PagePreview);
