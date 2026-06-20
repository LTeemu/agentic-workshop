import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import './components/url-input.js';
import './components/page-preview.js';
import './components/score-card.js';
import './components/suggestions.js';
import './components/trend-chart.js';
import { runAudit, fetchLatest, fetchUrls, fetchAuditByFile, deleteAudits, fetchHistory } from './lib/api.js';
import type { AuditResult, UrlEntry, AuditSummary, AccessibilityResult } from './lib/types.js';

export class PerfApp extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    .layout {
      flex: 1;
      display: flex;
      gap: var(--space-6);
      overflow: hidden;
      min-height: 0;
    }
    .main {
      flex: 1;
      min-width: 0;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      padding-bottom: var(--space-4);
      scrollbar-width: thin;
      scrollbar-color: var(--color-border) transparent;
    }
    .main::-webkit-scrollbar {
      width: 6px;
    }
    .main::-webkit-scrollbar-track {
      background: transparent;
    }
    .main::-webkit-scrollbar-thumb {
      background: var(--color-border);
      border-radius: 3px;
    }
    .main::-webkit-scrollbar-thumb:hover {
      background: var(--color-text-secondary);
    }
    .sidebar {
      width: 260px;
      flex-shrink: 0;
      overflow-y: auto;
    }
    @media (max-width: 1100px) {
      :host { padding: var(--space-4) var(--space-3); }
      .layout { gap: var(--space-4); }
    }
    @media (max-width: 900px) {
      :host { height: auto; min-height: 100vh; overflow: visible; }
      .layout { flex-direction: column; overflow: visible; }
      .sidebar { width: 100%; overflow: visible; }
      .main { overflow-y: visible; }
    }
    @media (max-width: 480px) {
      :host { padding: var(--space-3); }
      h1 { font-size: var(--font-size-xl); }
      .subtitle { font-size: var(--font-size-xs); }
    }
    header {
      flex-shrink: 0;
      margin-bottom: var(--space-6);
    }
    h1 {
      font-size: var(--font-size-2xl);
      font-weight: 800;
      letter-spacing: -0.03em;
      background: linear-gradient(135deg, var(--color-accent), var(--color-accent-hover));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .subtitle {
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
      margin-top: var(--space-1);
    }
    .toolbar {
      display: grid;
      gap: var(--space-4);
      margin-bottom: var(--space-4);
    }
    .toolbar-row {
      display: flex;
      gap: var(--space-2);
      align-items: stretch;
    }
    .toolbar-row url-input {
      flex: 1;
      min-width: 0;
    }
    .toolbar-row .batch-toggle {
      width: max-content;
      padding: var(--space-3) var(--space-4);
      background: var(--color-surface);
      color: var(--color-text);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      font-weight: 600;
      cursor: pointer;
      transition: background var(--transition-fast);
      white-space: nowrap;
    }
    .toolbar-row .batch-toggle:hover:not(:disabled) {
      background: var(--color-surface-hover);
    }
    .toolbar-row .batch-toggle:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .toolbar-row .batch-toggle.active {
      background: var(--color-accent);
      color: white;
      border-color: var(--color-accent);
    }
    .toolbar-row .batch-toggle.active:disabled {
      background: var(--color-accent);
      opacity: 0.5;
      cursor: not-allowed;
    }
    .batch-panel {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-4);
    }
    .batch-panel textarea {
      width: 100%;
      min-height: 80px;
      padding: var(--space-3);
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      color: var(--color-text);
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);
      resize: vertical;
      outline: none;
    }
    .batch-panel textarea:focus {
      border-color: var(--color-accent);
    }
    .batch-panel .batch-actions {
      display: flex;
      gap: var(--space-2);
      align-items: center;
      margin-top: var(--space-3);
    }
    .batch-panel .batch-actions button {
      padding: var(--space-2) var(--space-4);
      background: var(--color-accent);
      color: white;
      border: none;
      border-radius: var(--radius-sm);
      font-size: var(--font-size-sm);
      font-weight: 600;
      cursor: pointer;
      transition: background var(--transition-fast);
    }
    .batch-panel .batch-actions button:hover:not(:disabled) {
      background: var(--color-accent-hover);
    }
    .batch-panel .batch-actions button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .batch-panel .batch-progress {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }
    .batch-summary {
      margin-top: var(--space-3);
      overflow-x: auto;
    }
    .batch-summary table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--font-size-xs);
    }
    .batch-summary th {
      text-align: left;
      padding: var(--space-2) var(--space-3);
      border-bottom: 1px solid var(--color-border);
      color: var(--color-text-secondary);
      font-weight: 600;
      white-space: nowrap;
    }
    .batch-summary td {
      padding: var(--space-2) var(--space-3);
      border-bottom: 1px solid var(--color-border);
      white-space: nowrap;
    }
    .batch-summary tr:hover td {
      background: var(--color-surface-hover);
      cursor: pointer;
    }
    .batch-summary .score-cell {
      font-weight: 600;
    }
    .preview-row {
      margin-bottom: var(--space-4);
      min-height: 48px;
    }
    section {
      margin-bottom: var(--space-6);
      contain: layout style;
    }
    h2 {
      font-size: var(--font-size-xl);
      font-weight: 700;
      margin-bottom: var(--space-3);
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: var(--space-2);
      row-gap: var(--space-2);
      min-height: 120px;
    }
    section .grid + .grid {
      margin-top: var(--space-3);
    }
    @media (max-width: 768px) {
      .grid { grid-template-columns: repeat(2, 1fr); gap: var(--space-1); }
    }
    @media (max-width: 480px) {
      .grid { grid-template-columns: repeat(2, 1fr); min-height: 80px; }
    }
    .module {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-4);
      content-visibility: auto;
      contain-intrinsic-size: 80px;
    }
    @media (max-width: 480px) {
      .module { padding: var(--space-3); }
    }
    .module + .module {
      margin-top: var(--space-2);
    }
    .module h3 {
      font-size: var(--font-size-base);
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex: 1;
      min-width: 0;
    }
    .module .score-badge {
      font-size: var(--font-size-xs);
      font-weight: 600;
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-sm);
    }
    .score-badge.good { background: rgba(34, 197, 94, 0.15); color: var(--color-success); }
    .score-badge.ok { background: rgba(245, 158, 11, 0.15); color: var(--color-warning); }
    .score-badge.bad { background: rgba(239, 68, 68, 0.15); color: var(--color-critical); }
    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: var(--space-1) 0;
      font-size: var(--font-size-sm);
      border-bottom: 1px solid var(--color-border);
      overflow: hidden;
    }
    .stat-row:last-child { border-bottom: none; }
    .stat-label { color: var(--color-text-secondary); flex-shrink: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    .stat-value { font-weight: 500; flex-shrink: 1; min-width: 0; text-align: right; overflow: hidden; text-overflow: ellipsis; padding-left: var(--space-2); }
    .duration {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      text-align: right;
      margin-top: var(--space-1);
      width: fit-content;
      margin-left: auto;
    }
    .empty-state {
      text-align: center;
      padding: var(--space-12) var(--space-4);
      color: var(--color-text-secondary);
    }
    .empty-state h2 {
      justify-content: center;
      font-size: var(--font-size-xl);
      margin-bottom: var(--space-2);
    }
    .empty-state p {
      font-size: var(--font-size-sm);
      max-width: 480px;
      margin: 0 auto;
      line-height: 1.6;
    }
    @media (max-width: 480px) {
      .empty-state { padding: var(--space-8) var(--space-2); }
      .empty-state h2 { font-size: var(--font-size-lg); }
    }
    .error-banner {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid var(--color-critical);
      color: var(--color-critical);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      margin-bottom: var(--space-3);
    }

    details.module summary {
      display: flex;
      align-items: center;
      outline: none;
      cursor: pointer;
    }
    details.module summary::-webkit-details-marker,
    details.module summary::marker {
      display: none;
      content: '';
    }
    details.module .summary-content {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex: 1;
      min-width: 0;
    }
    .collapse-icon {
      transition: transform var(--transition-fast);
      color: var(--color-text-secondary);
      flex-shrink: 0;
      font-size: var(--font-size-lg);
    }
    details[open] .collapse-icon {
      transform: rotate(90deg);
    }

    /* Sidebar */
    .sidebar-panel {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      contain: layout style;
    }
    .sidebar-header {
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--color-border);
      font-weight: 600;
      font-size: var(--font-size-sm);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-secondary);
    }
    .sidebar-list {
      max-height: 500px;
      overflow-y: auto;
      contain: layout style;
    }
    @media (max-width: 900px) {
      .sidebar-list { max-height: 300px; }
    }
    @media (max-width: 480px) {
      .sidebar-list { max-height: 200px; }
    }
    .sidebar-url {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      text-align: left;
      background: none;
      border: none;
      border-bottom: 1px solid var(--color-border);
      border-left: 3px solid transparent;
      padding: var(--space-2) var(--space-4);
      cursor: pointer;
      transition: background var(--transition-fast), border-color var(--transition-fast);
      font: inherit;
      color: inherit;
    }
    .sidebar-url:hover {
      background: var(--color-surface-hover);
    }
    .sidebar-url.active {
      border-left-color: var(--color-accent);
      background: var(--color-surface-hover);
    }
    .sidebar-url .url-label {
      flex: 1;
      min-width: 0;
    }
    .sidebar-url-name {
      display: block;
      font-size: var(--font-size-xs);
      font-family: var(--font-mono);
      color: var(--color-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sidebar-url-count {
      font-size: 10px;
      color: var(--color-text-secondary);
    }
    .sidebar-url-meta {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin-top: 2px;
    }
    .trend-btn {
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: var(--space-1) var(--space-3);
      font-size: 10px;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: background var(--transition-fast), color var(--transition-fast);
    }
    .trend-btn:hover:not(:disabled) {
      background: var(--color-surface-hover);
      color: var(--color-accent);
      border-color: var(--color-accent);
    }
    .trend-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .sidebar-empty {
      padding: var(--space-6);
      text-align: center;
      color: var(--color-text-secondary);
      font-size: var(--font-size-xs);
    }
    .history-entry {
      padding: var(--space-1) var(--space-4) var(--space-1) var(--space-6);
      font-size: 11px;
      font-family: var(--font-mono);
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: background var(--transition-fast);
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
    .history-entry:hover {
      background: var(--color-surface-hover);
      color: var(--color-text);
    }
    .history-entry .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .history-entry .dot.good { background: var(--color-success); }
    .history-entry .dot.ok { background: var(--color-warning); }
    .history-entry .dot.bad { background: var(--color-critical); }

    /* History checkboxes */
    .history-checkbox {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      accent-color: var(--color-accent);
      cursor: pointer;
      border-radius: 3px;
      transition: opacity var(--transition-fast);
    }
    .history-checkbox:hover {
      opacity: 0.85;
    }
    .history-checkbox:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }
    .history-entry label {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      cursor: pointer;
      flex: 1;
      min-width: 0;
    }
    .history-entry label .ts-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .history-entry.selected {
      background: rgba(99, 102, 241, 0.08);
    }
    .delete-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-2) var(--space-4);
      margin-top: var(--space-1);
      border-top: 1px solid var(--color-border);
      font-size: var(--font-size-xs);
    }
    .delete-bar .count {
      color: var(--color-text-secondary);
    }
    .delete-bar button {
      border: none;
      border-radius: var(--radius-sm);
      padding: var(--space-1) var(--space-3);
      font-size: var(--font-size-xs);
      font-weight: 600;
      cursor: pointer;
      transition: background var(--transition-fast), opacity var(--transition-fast);
    }
    .delete-bar button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .delete-bar button:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }
    /* Initial delete button (non-confirm state) */
    .delete-bar .compare-btn {
      background: var(--color-accent);
      color: #fff;
      border: 1px solid var(--color-accent);
    }
    .delete-bar .compare-btn:disabled {
      background: transparent;
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border);
      opacity: 1;
    }
    .delete-bar .compare-btn:hover:not(:disabled) {
      background: var(--color-accent-hover);
      border-color: var(--color-accent-hover);
    }
    .delete-bar .delete-btn {
      background: var(--color-critical);
      color: #fff;
    }
    .delete-bar .delete-btn:hover:not(:disabled) {
      background: #dc2626;
    }
    .delete-bar.confirm .count {
      color: var(--color-critical);
    }
    .confirm-actions {
      display: flex;
      gap: var(--space-2);
    }
    .confirm-btn {
      background: var(--color-critical);
      color: #fff;
    }
    .confirm-btn:hover:not(:disabled) {
      background: #dc2626;
    }
    .cancel-btn {
      background: var(--color-border);
      color: var(--color-text);
    }
    .cancel-btn:hover:not(:disabled) {
      background: var(--color-surface-hover);
    }
    /* Compare view */
    .compare-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      margin-bottom: var(--space-4);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
    }
    .compare-bar .close-btn {
      background: var(--color-border);
      border: none;
      border-radius: var(--radius-sm);
      padding: var(--space-1) var(--space-3);
      color: var(--color-text);
      cursor: pointer;
      font-size: var(--font-size-xs);
    }
    .compare-bar .close-btn:hover {
      background: var(--color-surface-hover);
    }
    .compare-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-4);
    }
    .compare-col {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-4);
    }
    .compare-col .date-label {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      margin-bottom: var(--space-3);
    }
    .compare-row {
      display: grid;
      grid-template-columns: 1fr 80px auto 80px;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) 0;
      border-bottom: 1px solid var(--color-border);
      font-size: var(--font-size-sm);
    }
    .compare-row:last-child { border-bottom: none; }
    .compare-row .label { color: var(--color-text-secondary); }
    .compare-row .value {
      font-weight: 600;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .compare-row .delta {
      font-size: var(--font-size-xs);
      font-weight: 700;
      padding: 1px 6px;
      border-radius: var(--radius-sm);
      text-align: center;
    }
    .compare-row .delta.up {
      color: var(--color-success);
      background: rgba(34, 197, 94, 0.1);
    }
    .compare-row .delta.down {
      color: var(--color-critical);
      background: rgba(239, 68, 68, 0.1);
    }
    .compare-row .delta.same {
      color: var(--color-text-secondary);
    }
  `;

  @property({ type: Object }) result: AuditResult | null = null;
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) error = '';
  @property({ type: String }) currentUrl = '';
  @property({ type: Array }) urls: UrlEntry[] = [];
  @property({ type: String }) selectedHostname = '';
  @property({ type: String }) screenshotUrl = '';
  @property({ type: Object }) selectedFiles: Record<string, string[]> = {};
  @property({ type: Number }) pendingDeleteCount = 0;
  @property({ type: String }) currentFile = '';
  @property({ type: String }) trendUrl = '';
  @property({ type: Array }) trendHistory: AuditSummary[] = [];
  @property({ type: Object }) compareAudits: [AuditResult, AuditResult] | null = null;
  @property({ type: Boolean }) batchMode = false;
  @property({ type: String }) batchInput = '';
  @property({ type: Object }) batchProgress: { current: number; total: number; activeUrl: string } | null = null;
  @property({ type: Array }) batchResults: Array<{ url: string; performance: number | null; lcp: number | null; cls: number | null; suggestions: number; carbon: string; error?: string }> = [];

  async connectedCallback() {
    super.connectedCallback();
    const [latest, urlList] = await Promise.all([fetchLatest(), fetchUrls()]);
    this.urls = urlList;
    // Only auto-load latest if there are actual audit files — avoids stale latest.json
    if (latest && urlList.length > 0) {
      this.result = latest;
      this.currentFile = '';
      this.currentUrl = latest.url;
      this.selectedHostname = new URL(latest.url).host;
    }
  }

  private _onAuditStart(e: CustomEvent) {
    const { url } = e.detail;
    this.currentUrl = url;
    this.loading = true;
    this.error = '';
    this.screenshotUrl = '';

    runAudit(url)
      .then(async result => {
        this.result = result;
        this.currentFile = '';
        this.currentUrl = result.url;
        this.loading = false;
        this.selectedHostname = new URL(result.url).host;

        // Set screenshot URL from the audit result, if available
        if (result.screenshotFilename) {
          const hostPart = encodeURIComponent(new URL(result.url).host);
          this.screenshotUrl = `/api/screenshot/${hostPart}/${encodeURIComponent(result.screenshotFilename)}`;
        }

        this.urls = await fetchUrls();
      })
      .catch(err => {
        this.error = err instanceof Error ? err.message : 'Audit failed';
        this.loading = false;
      });
  }

  private async _runBatch() {
    const urls = this.batchInput.trim().split('\n').filter(Boolean).map(u => {
      u = u.trim();
      return u.startsWith('http') ? u : `https://${u}`;
    });
    if (urls.length === 0) return;

    this.batchResults = [];
    this.batchProgress = { current: 0, total: urls.length, activeUrl: '' };
    this.loading = true;

    for (let i = 0; i < urls.length; i++) {
      this.batchProgress = { current: i, total: urls.length, activeUrl: urls[i] };
      this.requestUpdate();
      try {
        const result = await runAudit(urls[i]);
        this.batchResults = [...this.batchResults, {
          url: urls[i],
          performance: result.lighthouse.performance !== null ? Math.round(result.lighthouse.performance * 100) : null,
          lcp: result.lighthouse.lcp,
          cls: result.lighthouse.cls,
          suggestions: result.suggestions.critical.length + result.suggestions.warning.length,
          carbon: result.carbon.rating,
        }];
      } catch (err) {
        this.batchResults = [...this.batchResults, {
          url: urls[i],
          performance: null,
          lcp: null,
          cls: null,
          suggestions: 0,
          carbon: '',
          error: err instanceof Error ? err.message : 'Failed',
        }];
      }
    }

    this.batchProgress = null;
    this.loading = false;
    this.urls = await fetchUrls();
  }

  private _renderBatchSummary() {
    return html`
      <div class="batch-summary">
        <table>
          <thead>
            <tr>
              <th>URL</th>
              <th>Perf</th>
              <th>LCP</th>
              <th>CLS</th>
              <th>Issues</th>
              <th>Carbon</th>
            </tr>
          </thead>
          <tbody>
            ${this.batchResults.map((r, i) => html`
              <tr @click=${() => this._loadBatchResult(i)}>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis" title=${r.url}>${r.url}</td>
                <td class="score-cell" style="color:${r.performance === null ? 'var(--color-text-secondary)' : r.performance >= 80 ? 'var(--color-success)' : r.performance >= 50 ? 'var(--color-warning)' : 'var(--color-critical)'}">${r.performance !== null ? `${r.performance}` : r.error ? '—' : '…'}</td>
                <td>${r.lcp !== null ? `${(r.lcp / 1000).toFixed(1)}s` : r.error ? '—' : '…'}</td>
                <td>${r.cls !== null ? r.cls.toFixed(2) : r.error ? '—' : '…'}</td>
                <td>${r.suggestions || '—'}</td>
                <td>${r.carbon || '—'}</td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>
    `;
  }

  private async _loadBatchResult(index: number) {
    const r = this.batchResults[index];
    if (!r || r.error) return;
    this.currentUrl = r.url;
    // Find the latest audit for this URL
    const urlEntry = this.urls.find(u => u.url === r.url || u.host === new URL(r.url).host);
    if (urlEntry && urlEntry.audits.length > 0) {
      await this._loadPastAudit(urlEntry.hostname, urlEntry.audits[0]);
    } else {
      // Trigger a fresh audit
      this._onAuditStart(new CustomEvent('audit-start', { detail: { url: r.url } }));
    }
  }

  private async _loadPastAudit(hostname: string, filename: string) {
    const key = `${hostname}/${filename}`;
    if (key === this.currentFile) return;
    this.currentFile = key;
    this.screenshotUrl = '';
    try {
      this.loading = true;
      const result = await fetchAuditByFile(hostname, filename);
      this.result = result;
      this.currentUrl = result.url;
      this.selectedHostname = hostname;
      // Derive screenshot URL — same filename, .png extension
      const shotFilename = filename.replace(/\.json$/, '.png');
      this.screenshotUrl = `/api/screenshot/${encodeURIComponent(hostname)}/${encodeURIComponent(shotFilename)}`;
      this.loading = false;
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to load audit';
      this.loading = false;
    }
  }

  private _setUrl(entry: UrlEntry) {
    this.currentUrl = entry.url || `https://${entry.host || entry.hostname}`;
    this.screenshotUrl = '';
    this.result = null;
    this.currentFile = '';
    this.selectedFiles = {};
  }

  private async _showTrend(entry: UrlEntry) {
    const url = entry.url || `https://${entry.host || entry.hostname}`;
    const history = await fetchHistory(url);
    this.trendHistory = history;
    this.trendUrl = url;
  }

  private _closeTrend() {
    this.trendUrl = '';
    this.trendHistory = [];
  }

  private _toggleUrl(hostname: string) {
    this.selectedHostname = this.selectedHostname === hostname ? '' : hostname;
  }

  private _toggleCheckFile(hostname: string, filename: string) {
    const current = [...(this.selectedFiles[hostname] || [])];
    const idx = current.indexOf(filename);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(filename);
    }
    const updated = { ...this.selectedFiles };
    if (current.length === 0) {
      delete updated[hostname];
    } else {
      updated[hostname] = current;
    }
    this.selectedFiles = updated;
    this.requestUpdate();
  }

  private _selectedCount(): number {
    return Object.values(this.selectedFiles).reduce((sum, arr) => sum + arr.length, 0);
  }

  private _requestDelete() {
    const count = this._selectedCount();
    if (count === 0) return;
    this.pendingDeleteCount = count;
  }

  private _cancelDelete() {
    this.pendingDeleteCount = 0;
  }

  private async _runCompare() {
    // Collect the first two selected files
    const files: Array<{ hostname: string; filename: string }> = [];
    for (const [hostname, filenames] of Object.entries(this.selectedFiles)) {
      for (const filename of filenames) {
        files.push({ hostname, filename });
        if (files.length === 2) break;
      }
      if (files.length === 2) break;
    }
    if (files.length !== 2) return;
    try {
      const [a, b] = await Promise.all([
        fetchAuditByFile(files[0].hostname, files[0].filename),
        fetchAuditByFile(files[1].hostname, files[1].filename),
      ]);
      this.compareAudits = [a, b];
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to load audits for comparison';
    }
  }

  private _closeCompare() {
    this.compareAudits = null;
  }

  private async _confirmDelete() {
    const count = this.pendingDeleteCount;
    this.pendingDeleteCount = 0;
    if (count === 0) return;

    const files: Array<{ hostname: string; filename: string }> = [];
    for (const [hostname, filenames] of Object.entries(this.selectedFiles)) {
      for (const filename of filenames) {
        files.push({ hostname, filename });
      }
    }

    const ok = await deleteAudits(files);
    if (ok) {
      this.selectedFiles = {};
      this.urls = await fetchUrls();
      // If the currently-displayed URL no longer has any audits, clear
      // the result, preview, sidebar selection, and URL input.
      if (this.result) {
        const stillInList = this.urls.some(u =>
          u.url === this.result!.url ||
          (u.host && new URL(this.result!.url).host === u.host)
        );
        if (!stillInList) {
          this.result = null;
          this.currentUrl = '';
          this.currentFile = '';
          this.selectedHostname = '';
          this.screenshotUrl = '';
          this.error = '';
        }
      }
    } else {
      this.error = 'Failed to delete some audits';
    }
  }

  private _scoreClass(score: number | null): string {
    if (score === null) return '';
    if (score >= 80) return 'good';
    if (score >= 50) return 'ok';
    return 'bad';
  }

  private _formatMs(ms: number | null): string {
    if (ms === null) return '—';
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.round(ms)}ms`;
  }

  private _formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private _formatBytesMap(map: Record<string, number> | undefined): string {
    if (!map) return '';
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}: ${this._formatBytes(v)}`)
      .join(' · ');
  }

  private _formatDate(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  }

  private _moduleTemplate(title: string, score: number | null, open: boolean, content: ReturnType<typeof html>) {
    return html`
      <details class="module" ?open=${open}>
        <summary><div class="summary-content">
          <span class="collapse-icon">›</span>
          <h3>${title} ${score !== null ? html`<span class="score-badge ${this._scoreClass(score)}">${score}</span>` : ''}</h3>
        </div></summary>
        ${content}
      </details>
    `;
  }

  private _row(label: string, value: string | ReturnType<typeof html>) {
    return html`<div class="stat-row"><span class="stat-label">${label}</span><span class="stat-value">${value}</span></div>`;
  }

  private _renderSidebar() {
    const selCount = this._selectedCount();
    return html`
      <div class="sidebar">
        <div class="sidebar-panel">
        <div class="sidebar-header">Audit History</div>
        ${this.urls.length === 0
          ? html`<div class="sidebar-empty">No audits yet</div>`
          : html`<div class="sidebar-list">
              ${this.urls.map(u => html`
                  <div class="sidebar-url ${this.selectedHostname === u.hostname ? 'active' : ''}"
                       @click=${() => {
                         if (this.selectedHostname === u.hostname) {
                           this.selectedHostname = '';
                           this.currentUrl = '';
                           this.selectedFiles = {};
                         } else {
                           this.selectedHostname = u.hostname;
                           this._setUrl(u);
                         }
                       }}>
                   <div class="url-label">
                     <span class="sidebar-url-name">${u.host || u.hostname}</span>
                     <div class="sidebar-url-meta">
                       <span class="sidebar-url-count">${u.audits.length} audit${u.audits.length === 1 ? '' : 's'}</span>
                       <button class="trend-btn" @click=${(e: Event) => { e.stopPropagation(); this._showTrend(u); }}
                         ?disabled=${u.audits.length < 2} title=${u.audits.length < 2 ? 'Need at least 2 audits' : 'Show performance trend'}>
                         Trend
                       </button>
                     </div>
                   </div>
                 </div>
                 ${this.selectedHostname === u.hostname ? html`
                   ${u.audits.slice(0, 20).map(f => {
                    const checked = (this.selectedFiles[u.hostname] || []).includes(f);
                    const ts = f.replace('.json', '').replace(/-/g, ':').replace(/T/, ' ');
                    return html`
                      <div class="history-entry ${checked ? 'selected' : ''}"
                           @click=${() => this._loadPastAudit(u.hostname, f)}>
                        <input type="checkbox" class="history-checkbox" .checked=${checked}
                          @click=${(e: Event) => { e.stopPropagation(); this._toggleCheckFile(u.hostname, f); }} />
                        <span class="dot"></span>
                        <span class="ts-text">${ts.includes('T') ? ts.split('.')[0] : ts}</span>
                      </div>`;
                  })}
                  ${selCount > 0 ? html`
                    ${this.pendingDeleteCount > 0 ? html`
                      <div class="delete-bar confirm">
                        <span class="count">Delete ${this.pendingDeleteCount} audit${this.pendingDeleteCount === 1 ? '' : 's'}?</span>
                        <div class="confirm-actions">
                          <button class="cancel-btn" @click=${this._cancelDelete}>Cancel</button>
                          <button class="confirm-btn" @click=${this._confirmDelete}>Confirm</button>
                        </div>
                      </div>
                    ` : html`
                      <div class="delete-bar">
                        <span class="count">${selCount} selected</span>
                        <div class="confirm-actions">
                          <button class="compare-btn" ?disabled=${selCount !== 2} @click=${this._runCompare}
                            title=${selCount !== 2 ? 'Select exactly 2 audits to compare' : 'Compare 2 selected audits'}>Compare</button>
                          <button class="delete-btn" @click=${this._requestDelete}>Delete</button>
                        </div>
                      </div>
                    `}
                  ` : ''}
                ` : ''}
              `)}
            </div>`
        }
      </div>
      </div>
    `;
  }

  render() {
    return html`
      <header>
        <h1>Performance Lab</h1>
        <div class="subtitle">Multi-dimensional frontend audit — Lighthouse + 12 custom analysis modules</div>
      </header>

      <div class="layout">
        ${this._renderSidebar()}

          <div class="main">
          <div class="toolbar">
            <div class="toolbar-row">
              <url-input
                .value=${this.currentUrl}
                .loading=${this.loading}
                @audit-start=${this._onAuditStart}
              ></url-input>
              <button
                class="batch-toggle ${this.batchMode ? 'active' : ''}"
                @click=${() => { this.batchMode = !this.batchMode; if (!this.batchMode) this.batchProgress = null; }}
                ?disabled=${this.loading || this.batchProgress !== null}
              >Batch</button>
            </div>
            ${this.batchMode ? html`
              <div class="batch-panel">
                <textarea
                  .value=${this.batchInput}
                  @input=${(e: Event) => this.batchInput = (e.target as HTMLTextAreaElement).value}
                  placeholder="Enter URLs, one per line&#10;e.g.&#10;https://example.com&#10;https://example.org"
                  ?disabled=${this.batchProgress !== null}
                ></textarea>
                <div class="batch-actions">
                  ${this.batchProgress
                    ? html`<span class="batch-progress">${this.batchProgress.current}/${this.batchProgress.total} — ${this.batchProgress.activeUrl}</span>`
                    : html`
                      <button @click=${this._runBatch} ?disabled=${!this.batchInput.trim() || this.loading}>Run Batch</button>
                      <span class="batch-progress">${this.batchInput.trim().split('\n').filter(Boolean).length} URLs</span>
                    `}
                </div>
                ${this.batchResults.length > 0 ? this._renderBatchSummary() : ''}
              </div>
            ` : ''}
          </div>

          ${this.compareAudits ? this._renderCompareView() : ''}

          <div class="preview-row">
            <page-preview .url=${this.currentUrl} .screenshotUrl=${this.screenshotUrl}></page-preview>
          </div>

          <div class="content-area">
            ${this.error ? html`<div class="error-banner" role="alert">${this.error}</div>` : ''}

            ${this.result && !this.compareAudits ? this._renderDashboard(this.result) : (!this.loading && !this.error && !this.compareAudits ? html`
              <div class="empty-state">
                <h2>Enter a URL to begin</h2>
                <p>The Performance Lab runs Lighthouse alongside 12 custom analysis modules covering compression, caching, render blocking, images, security, HTML quality, third parties, fonts, HTTP protocol, carbon estimation, and accessibility.</p>
              </div>
            ` : '')}
          </div>
        </div>
      </div>

      <trend-chart
        .history=${this.trendHistory}
        .open=${!!this.trendUrl}
        @close-trend=${this._closeTrend}
      ></trend-chart>
    `;
  }

  private _renderDashboard(r: AuditResult) {
    return html`
      <div class="duration">${this._formatDate(r.timestamp || '')} · completed in ${this._formatMs(r.durationMs)}</div>

      ${this._renderLighthouseSection(r)}
      ${this._renderAnatomySection(r)}
      ${this._renderCompressionSection(r)}
      ${this._renderCachingSection(r)}
      ${this._renderRenderBlockingSection(r)}
      ${this._renderImagesSection(r)}
      ${this._renderSecuritySection(r)}
      ${this._renderHtmlSection(r)}
      ${this._renderThirdPartiesSection(r)}
      ${this._renderFontsSection(r)}
      ${this._renderProtocolSection(r)}
      ${this._renderCarbonSection(r)}
      ${this._renderAccessibilitySection(r)}

      <section>
        <suggestions-list .suggestions=${r.suggestions}></suggestions-list>
      </section>
    `;
  }

  private _renderLighthouseSection(r: AuditResult) {
    const lh = r.lighthouse;
    return html`
      <section>
        <h2>Lighthouse</h2>
        <div class="grid">
          <score-card label="Performance" .value=${lh.performance !== null ? Math.round(lh.performance * 100) : null} detail="Score"></score-card>
          <score-card label="Accessibility" .value=${lh.accessibility !== null ? Math.round(lh.accessibility * 100) : null} detail="Score"></score-card>
          <score-card label="Best Practices" .value=${lh.bestPractices !== null ? Math.round(lh.bestPractices * 100) : null} detail="Score"></score-card>
          <score-card label="SEO" .value=${lh.seo !== null ? Math.round(lh.seo * 100) : null} detail="Score"></score-card>
          <score-card label="FCP" .value=${lh.fcp !== null ? lh.fcp / 1000 : null} detail="seconds" .invert=${true}></score-card>
          <score-card label="LCP" .value=${lh.lcp !== null ? lh.lcp / 1000 : null} detail="seconds" .invert=${true}></score-card>
          <score-card label="TBT" .value=${lh.tbt !== null ? lh.tbt : null} detail="ms" .invert=${true}></score-card>
          <score-card label="CLS" .value=${lh.cls !== null ? lh.cls : null} detail="score" .invert=${true}></score-card>
          <score-card label="Speed Index" .value=${lh.si !== null ? lh.si / 1000 : null} detail="seconds" .invert=${true}></score-card>
        </div>
      </section>
    `;
  }

  private _renderAnatomySection(r: AuditResult) {
    return this._moduleTemplate('Page Anatomy', null, true, html`
      ${this._row('Total Size', this._formatBytes(r.anatomy.totalBytes))}
      ${this._row('Total Requests', `${r.anatomy.totalRequests}`)}
      ${this._row('By Type', this._formatBytesMap(r.anatomy.bytesByType))}
    `);
  }

  private _renderCompressionSection(r: AuditResult) {
    return this._moduleTemplate('Compression', r.compression.score, true, html`
      ${this._row('Without Compression', `${r.compression.resourcesWithoutCompression} resources`)}
      ${this._row('Potential Savings', this._formatBytes(r.compression.potentialSavingsBytes))}
      ${this._row('Main Page', r.compression.mainPageCompressed ? `Yes (${r.compression.mainPageEncoding})` : 'No')}
    `);
  }

  private _renderCachingSection(r: AuditResult) {
    return this._moduleTemplate('Caching', r.caching.score, false, html`
      ${this._row('Poor Cache TTL', `${r.caching.poorCacheCount} / ${r.caching.totalResources} resources`)}
      ${(r.caching.details ?? []).slice(0, 10).map(d =>
        this._row(d.url.length > 60 ? d.url.slice(0, 60) + '…' : d.url, d.cacheControl || '(none)')
      )}
    `);
  }

  private _renderRenderBlockingSection(r: AuditResult) {
    return this._moduleTemplate('Render Blocking', r.renderBlocking.score, false, html`
      ${this._row('Blocking Resources', `${r.renderBlocking.count}`)}
      ${r.renderBlocking.resources.slice(0, 10).map(res =>
        this._row(res.tag, res.src.length > 50 ? res.src.slice(0, 50) + '…' : res.src)
      )}
    `);
  }

  private _renderImagesSection(r: AuditResult) {
    const issueEls = r.images.issues.map(i =>
      html`<div class="stat-row"><span class="stat-value" style="color:var(--color-warning)">${i}</span></div>`
    );
    return this._moduleTemplate('Images', r.images.score, false, html`
      ${this._row('Total Images', `${r.images.total}`)}
      ${this._row('No lazy loading', `${r.images.withoutLazyLoading}`)}
      ${this._row('No dimensions', `${r.images.withoutDimensions}`)}
      ${this._row('No alt text', `${r.images.withoutAlt}`)}
      ${issueEls}
    `);
  }

  private _renderSecuritySection(r: AuditResult) {
    return this._moduleTemplate('Security', r.security.score, false, html`
      ${this._row('Present', r.security.present.map(p => p.header).join(', ') || 'None')}
      ${this._row('Missing', r.security.missing.join(', ') || 'None')}
    `);
  }

  private _renderHtmlSection(r: AuditResult) {
    return this._moduleTemplate('HTML Quality', r.html.score, false, html`
      ${this._row('Valid', r.html.valid ? 'Yes' : 'No')}
      ${r.html.issues.map(i =>
        html`<div class="stat-row"><span class="stat-value" style="color:var(--color-warning)">${i}</span></div>`
      )}
    `);
  }

  private _renderThirdPartiesSection(r: AuditResult) {
    return this._moduleTemplate('Third Parties', r.thirdParties.score, false, html`
      ${this._row('External Requests', `${r.thirdParties.totalExternal}`)}
      ${this._row('Unique Domains', `${r.thirdParties.uniqueDomains}`)}
      ${r.thirdParties.trackerDomains.length > 0
        ? this._row('Trackers', r.thirdParties.trackerDomains.join(', '))
        : ''}
      ${r.thirdParties.domains.slice(0, 10).map(d =>
        this._row(d.hostname, `${d.count} req`)
      )}
    `);
  }

  private _renderFontsSection(r: AuditResult) {
    return this._moduleTemplate('Fonts', r.fonts.score, false, html`
      ${this._row('Preloaded', `${r.fonts.preloaded}`)}
      ${this._row('Google Fonts', r.fonts.googleFonts ? 'Yes' : 'No')}
      ${r.fonts.issues.map(i =>
        html`<div class="stat-row"><span class="stat-value" style="color:var(--color-warning)">${i}</span></div>`
      )}
    `);
  }

  private _renderProtocolSection(r: AuditResult) {
    return this._moduleTemplate('HTTP Protocol', r.protocol.score, false, html`
      ${this._row('HTTP/2 Resources', `${r.protocol.http2Resources}`)}
      ${this._row('HTTP/1.1 Resources', `${r.protocol.http1Resources}`)}
      ${this._row('HTTP/2 %', `${r.protocol.http2Percent}%`)}
    `);
  }

  private _renderCarbonSection(r: AuditResult) {
    return html`
      <details class="module">
        <summary><div class="summary-content">
          <h3>Carbon Estimate</h3>
          <span class="collapse-icon">›</span>
        </div></summary>
        ${this._row('Rating', html`<span style="font-weight:700">${r.carbon.rating}</span>`)}
        ${this._row('Per Visit', `${r.carbon.gramsPerVisit.toFixed(2)} gCO₂`)}
        ${this._row('Equivalent', r.carbon.equivalent)}
      </details>
    `;
  }

  private _renderAccessibilitySection(r: AuditResult) {
    const a11y = r.accessibility as AccessibilityResult | undefined;
    if (!a11y || !a11y.violations) return '';

    const violationRows = a11y.violations.slice(0, 10).map(v =>
      this._row(
        v.impact.charAt(0).toUpperCase() + v.impact.slice(1),
        `${v.description} (${v.nodes} element${v.nodes === 1 ? '' : 's'})`
      )
    );

    return this._moduleTemplate('Accessibility', a11y.score, false, html`
      ${this._row('Violations', `${a11y.violations.length}`)}
      ${this._row('Passed Checks', `${a11y.passes}`)}
      ${this._row('Incomplete', `${a11y.incomplete}`)}
      ${violationRows}
    `);
  }

  private _renderCompareView() {
    if (!this.compareAudits) return '';
    const [a, b] = this.compareAudits;
    const aDate = this._formatDate(a.timestamp || '');
    const bDate = this._formatDate(b.timestamp || '');

    const cmp = (label: string, getVal: (r: AuditResult) => number | null, fmt?: (v: number) => string) => {
      const va = getVal(a);
      const vb = getVal(b);
      const delta = va !== null && vb !== null ? vb - va : null;
      const cls = delta === null ? 'same' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'same';
      const text = delta === null ? '—' : (delta > 0 ? '+' : '') + (fmt ? fmt(delta) : String(delta));
      return html`
        <div class="compare-row">
          <span class="label">${label}</span>
          <span class="value">${va !== null ? (fmt ? fmt(va) : String(va)) : '—'}</span>
          <span class="delta ${cls}">${text}</span>
          <span class="value">${vb !== null ? (fmt ? fmt(vb) : String(vb)) : '—'}</span>
        </div>`;
    };

    return html`
      <div class="compare-bar">
        <span>Comparing ${aDate} vs ${bDate}</span>
        <button class="close-btn" @click=${this._closeCompare}>Close Compare</button>
      </div>
      <div class="compare-grid" style="grid-template-columns:1fr">
        <div class="compare-col">
          <div class="date-label">Metric · ${aDate} → ${bDate}</div>
          ${cmp('Performance', r => r.lighthouse.performance !== null ? Math.round(r.lighthouse.performance * 100) : null)}
          ${cmp('LCP', r => r.lighthouse.lcp, v => `${(v / 1000).toFixed(1)}s`)}
          ${cmp('CLS', r => r.lighthouse.cls, v => v.toFixed(2))}
          ${cmp('TBT', r => r.lighthouse.tbt, v => `${Math.round(v)}ms`)}
          ${cmp('Compression', r => r.compression.score)}
          ${cmp('Caching', r => r.caching.score)}
          ${cmp('Images', r => r.images.score)}
          ${cmp('Security', r => r.security.score)}
          ${cmp('Fonts', r => r.fonts.score)}
        </div>
      </div>
    `;
  }
}

customElements.define('perf-app', PerfApp);
