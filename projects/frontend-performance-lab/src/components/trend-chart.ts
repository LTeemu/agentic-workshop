import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import type { AuditSummary } from '../lib/types.js';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4'];
const METRICS: Array<{ key: keyof AuditSummary['lighthouse']; label: string; color: string; scale: number }> = [
  { key: 'performance', label: 'Perf', color: COLORS[0], scale: 100 },
  { key: 'accessibility', label: 'A11y', color: COLORS[1], scale: 100 },
  { key: 'seo', label: 'SEO', color: COLORS[2], scale: 100 },
  { key: 'bestPractices', label: 'Practices', color: COLORS[3], scale: 100 },
];

export class TrendChart extends LitElement {
  static styles = css`
    :host {
      display: none;
    }
    :host([open]) {
      display: flex;
      position: fixed;
      inset: 0;
      z-index: 100;
      background: rgba(0, 0, 0, 0.6);
      align-items: center;
      justify-content: center;
      padding: var(--space-4);
    }
    .panel {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
      max-width: 700px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-4);
    }
    .header h3 {
      font-size: var(--font-size-lg);
      font-weight: 600;
    }
    .header button {
      background: var(--color-border);
      border: none;
      border-radius: var(--radius-sm);
      padding: var(--space-1) var(--space-3);
      color: var(--color-text);
      cursor: pointer;
      font-size: var(--font-size-sm);
    }
    .header button:hover {
      background: var(--color-surface-hover);
    }
    svg {
      width: 100%;
      height: auto;
      display: block;
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      margin-top: var(--space-4);
      font-size: var(--font-size-xs);
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: var(--space-1);
    }
    .legend-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .empty {
      text-align: center;
      padding: var(--space-8);
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
    }
  `;

  @property({ type: Array }) history: AuditSummary[] = [];
  @property({ type: Boolean, reflect: true }) open = false;

  private _close() {
    this.dispatchEvent(new CustomEvent('close-trend', { bubbles: true, composed: true }));
  }

  private _onBackdrop(e: Event) {
    if ((e.target as HTMLElement) === this) this._close();
  }

  render() {
    if (!this.open) return '';
    const data = this.history.slice().reverse(); // oldest first

    if (data.length < 2) {
      return html`
        <div class="panel" @click=${(e: Event) => e.stopPropagation()}>
          <div class="header">
            <h3>Performance Trend</h3>
            <button @click=${this._close}>Close</button>
          </div>
          <div class="empty">Need at least 2 audits for a trend chart.</div>
        </div>
      `;
    }

    const W = 600, H = 250, PAD = { top: 20, right: 20, bottom: 30, left: 40 };
    const iw = W - PAD.left - PAD.right;
    const ih = H - PAD.top - PAD.bottom;
    const stepX = iw / (data.length - 1);

    // Build series
    const series = METRICS.map(m => {
      const values = data.map(d => {
        const v = d.lighthouse[m.key];
        return v !== null && v !== undefined ? (v as number) * (m.scale === 100 ? 100 : 1) / m.scale : null;
      });
      return { ...m, values };
    });

    return html`
      <div class="panel" @click=${(e: Event) => e.stopPropagation()}>
        <div class="header">
          <h3>Performance Trend</h3>
          <button @click=${this._close}>Close</button>
        </div>
        <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
          <!-- Grid lines -->
          ${[0, 25, 50, 75, 100].map(v => html`
            <line x1=${PAD.left} y1=${PAD.top + ih * (1 - v / 100)} x2=${W - PAD.right} y2=${PAD.top + ih * (1 - v / 100)}
              stroke="var(--color-border)" stroke-width="0.5" />
            <text x=${PAD.left - 6} y=${PAD.top + ih * (1 - v / 100) + 3}
              fill="var(--color-text-secondary)" font-size="10" text-anchor="end">${v}</text>
          `)}
          <!-- Threshold zones -->
          <rect x=${PAD.left} y=${PAD.top} width=${iw} height=${ih * 0.2}
            fill="var(--color-critical)" opacity="0.05" />
          <rect x=${PAD.left} y=${PAD.top} width=${iw} height=${ih * 0.5}
            fill="var(--color-warning)" opacity="0.05" />
          <rect x=${PAD.left} y=${PAD.top + ih * 0.8} width=${iw} height=${ih * 0.2}
            fill="var(--color-success)" opacity="0.05" />
          <!-- Lines -->
          ${series.filter(s => s.values.some(v => v !== null)).map(s => {
            const points = s.values.map((v, i) => {
              if (v === null) return null;
              const x = PAD.left + i * stepX;
              const y = PAD.top + ih * (1 - Math.min(v, 1));
              return `${x},${y}`;
            }).filter(Boolean).join(' ');
            return html`<polyline points=${points} fill="none" stroke=${s.color} stroke-width="2" stroke-linejoin="round" opacity="0.85" />`;
          })}
          <!-- Date labels (first, middle, last) -->
          ${[0, Math.floor(data.length / 2), data.length - 1].map(i => {
            const label = data[i].timestamp ? data[i].timestamp.slice(0, 10) : '';
            return html`<text x=${PAD.left + i * stepX} y=${H - 6}
              fill="var(--color-text-secondary)" font-size="9" text-anchor="middle">${label}</text>`;
          })}
        </svg>
        <div class="legend">
          ${series.map(s => html`
            <span class="legend-item">
              <span class="legend-dot" style="background:${s.color}"></span>
              ${s.label}
            </span>
          `)}
        </div>
      </div>
    `;
  }
}

customElements.define('trend-chart', TrendChart);
