import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';

export class ScoreCard extends LitElement {
  static styles = css`
    :host {
      display: block;
      contain: layout style;
    }
    .card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-4);
      min-height: 110px;
      transition: border-color var(--transition-fast);
    }
    .card:hover {
      border-color: var(--color-accent);
    }
    @media (max-width: 480px) {
      .card { padding: var(--space-3); min-height: 90px; }
    }
    .label {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 500;
      overflow-wrap: break-word;
      margin-bottom: var(--space-2);
    }
    .value-row {
      display: flex;
      align-items: baseline;
      gap: var(--space-2);
      margin-bottom: var(--space-3);
    }
    .value {
      font-size: var(--font-size-2xl);
      font-weight: 700;
      line-height: 1;
    }
    @media (max-width: 480px) {
      .value { font-size: var(--font-size-xl); }
    }
    .detail {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      overflow-wrap: break-word;
    }
    .score-low { color: var(--color-score-low); }
    .score-mid { color: var(--color-score-mid); }
    .score-high { color: var(--color-score-high); }
    .bar {
      width: 100%;
      height: 4px;
      background: var(--color-border);
      border-radius: 2px;
      overflow: hidden;
    }
    .bar-fill {
      width: 100%;
      height: 100%;
      border-radius: 2px;
      transform-origin: left;
      will-change: transform;
    }
  `;

  @property({ type: String }) label = '';
  @property({ type: Number }) value: number | null = null;
  @property({ type: String }) detail = '';
  @property({ type: Boolean }) invert = false;

  private _scoreTier(): { className: string; color: string } {
    if (this.value === null) return { className: '', color: 'var(--color-border)' };
    if (this.invert) {
      if (this.value > 70) return { className: 'score-low', color: 'var(--color-critical)' };
      if (this.value > 40) return { className: 'score-mid', color: 'var(--color-warning)' };
      return { className: 'score-high', color: 'var(--color-success)' };
    }
    if (this.value >= 80) return { className: 'score-high', color: 'var(--color-success)' };
    if (this.value >= 50) return { className: 'score-mid', color: 'var(--color-warning)' };
    return { className: 'score-low', color: 'var(--color-critical)' };
  }

  render() {
    const displayValue = this.value !== null
      ? (Number.isInteger(this.value) ? this.value.toString() : this.value.toFixed(1))
      : '—';
    const barWidth = this.value !== null ? Math.min(this.value, 100) : 0;
    const { className, color } = this._scoreTier();

    return html`
      <div class="card">
        <div class="label">${this.label}</div>
        <div class="value-row">
          <span class="value ${className}">${displayValue}</span>
          ${this.detail ? html`<span class="detail">${this.detail}</span>` : ''}
        </div>
        <div class="bar" role="progressbar" aria-valuenow=${this.value ?? 0} aria-valuemin="0" aria-valuemax="100">
          <div class="bar-fill" style="transform: scaleX(${barWidth / 100}); background: ${color}"></div>
        </div>
      </div>
    `;
  }
}

customElements.define('score-card', ScoreCard);
