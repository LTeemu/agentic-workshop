import { LitElement, html, css, render, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { focusRingCSS, glassSurface, smoothTransition } from '../styles/shared.js';
import './sg-icon.js';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * A glass-styled dropdown select with spectral gradient accents.
 *
 * Uses a custom dropdown UI (not native `<select>`) for full styling control.
 *
 * @fires change - CustomEvent with `detail.value` (comma-separated for multiple).
 *
 * @cssprop [--sg-select-radius=var(--sg-radius-md, 12px)] - Border radius.
 * @cssprop [--sg-select-height=40px] - Trigger height.
 * @cssprop [--sg-glass-shadow-lg=0 8px 32px rgba(0,0,0,0.4)] - Dropdown shadow.
 */
export class SgSelect extends LitElement {
  static override styles = css`
    :host {
      display: block;
      position: relative;
      outline: none;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
    }

    ${focusRingCSS('var(--sg-select-radius, var(--sg-radius-md, 12px))')}

    .label {
      display: block;
      margin-bottom: 6px;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
    }

    .trigger {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      width: 100%;
      height: var(--sg-select-height, 40px);
      padding: 0 12px;
      border-radius: var(--sg-select-radius, var(--sg-radius-md, 12px));
      cursor: pointer;
      font-family: inherit;
      font-size: 0.875rem;
      line-height: 1;
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      text-align: left;
      user-select: none;
      -webkit-appearance: none;
      appearance: none;
      border: none;
      box-sizing: border-box;
      ${glassSurface}
      ${smoothTransition}
    }

    .trigger:hover {
      background: var(--sg-glass-bg-hover, rgba(255, 255, 255, 0.14));
      border-color: var(--sg-glass-border-hover, rgba(255, 255, 255, 0.25));
    }

    .trigger--open {
      background: var(--sg-glass-bg-active, rgba(255, 255, 255, 0.18));
      border-color: var(--sg-glass-border-hover, rgba(255, 255, 255, 0.25));
    }

    .trigger--error {
      border-color: var(--sg-spectral-rose, #d4869f) !important;
    }

    .trigger--disabled {
      opacity: 0.45;
      pointer-events: none;
    }

    /* ─── Spectral gradient accent border ─── */

    .trigger--accent::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      padding: 1px;
      --sg-spectral-fallback: linear-gradient(
        135deg,
        rgba(212, 134, 159, 0.5),
        rgba(196, 160, 80, 0.5),
        rgba(127, 168, 141, 0.5),
        rgba(122, 128, 192, 0.5)
      );
      background: var(
        --sg-select-accent,
        var(--sg-gradient-spectral, var(--sg-spectral-fallback))
      );
      -webkit-mask: linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask-composite: exclude;
      pointer-events: none;
    }

    .trigger__value {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .trigger__placeholder {
      color: var(--sg-text-tertiary, rgba(255, 255, 255, 0.4));
    }

    .trigger__chevron {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      color: var(--sg-text-tertiary, rgba(255, 255, 255, 0.4));
      transition: transform var(--sg-transition-fast, 150ms ease);
    }

    .trigger__chevron--open {
      transform: rotate(180deg);
    }

    .trigger__clear {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      color: var(--sg-text-tertiary, rgba(255, 255, 255, 0.4));
      cursor: pointer;
      border-radius: 50%;
      font-size: 1rem;
      line-height: 1;
      padding: 0;
      flex-shrink: 0;
      transition: color var(--sg-transition-fast, 150ms ease);
    }

    .trigger__clear:hover {
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
    }

    .error {
      display: block;
      margin-top: 4px;
      font-size: 0.75rem;
      color: var(--sg-spectral-rose, #d4869f);
    }
  `;

  @property({ type: String })
  label: string = '';

  @property({ type: String })
  placeholder: string = 'Select an option';

  @property({ type: String, reflect: true })
  value: string = '';

  @property({ type: Boolean, reflect: true })
  disabled: boolean = false;

  @property({ type: String })
  error: string = '';

  @property({ type: String })
  name: string = '';

  @property({ type: Array })
  options: SelectOption[] = [];

  @property({ type: Boolean })
  multiple: boolean = false;

  @property({ type: Boolean })
  clearable: boolean = false;

  /** When true, renders a spectral gradient border overlay on the trigger. */
  @property({ type: Boolean, reflect: true })
  accent: boolean = false;

  /** All sg-select instances alive in the DOM — used to close others on open. */
  private static _instances = new Set<SgSelect>();

  @state()
  private _open = false;

  @state()
  private _highlightedIndex = -1;

  /** Portal element (child of document.body) that hosts the dropdown list. */
  private _portalEl: HTMLDivElement | null = null;

  private get _selectedValues(): string[] {
    if (!this.value) return [];
    return this.value.split(',').map(v => v.trim()).filter(Boolean);
  }

  private get _displayText(): string {
    const selected = this._selectedValues;
    if (selected.length === 0) return '';
    const labels = selected.map(v => {
      const opt = this.options.find(o => o.value === v);
      return opt ? opt.label : v;
    });
    return labels.join(', ');
  }

  private _isSelected(val: string): boolean {
    return this._selectedValues.includes(val);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    SgSelect._instances.add(this);
    document.addEventListener('click', this.#onDocumentClick);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    SgSelect._instances.delete(this);
    document.removeEventListener('click', this.#onDocumentClick);
    this.#destroyPortal();
    this._open = false;
  }

  #onDocumentClick = (e: MouseEvent): void => {
    if (!this._open) return;
    const path = e.composedPath();
    // Close if click is outside both the host and the portal
    if (!path.includes(this) && this._portalEl && !path.includes(this._portalEl)) {
      this._close();
    }
  };

  #onScroll = (): void => {
    if (this._open) this.#repositionPortal();
  };

  #onResize = (): void => {
    if (this._open) this.#repositionPortal();
  };

  #addScrollListeners(): void {
    document.addEventListener('scroll', this.#onScroll, true);
    window.addEventListener('resize', this.#onResize);
  }

  #removeScrollListeners(): void {
    document.removeEventListener('scroll', this.#onScroll, true);
    window.removeEventListener('resize', this.#onResize);
  }

  /** Create or reuse the portal element at document.body. */
  #ensurePortal(): HTMLDivElement {
    if (!this._portalEl) {
      this._portalEl = document.createElement('div');
      this._portalEl.style.position = 'fixed';
      this._portalEl.style.zIndex = '10000';
    }
    return this._portalEl;
  }

  /** Position the portal to appear just below the trigger, matching its width. */
  #repositionPortal(): void {
    if (!this._portalEl) return;
    const trigger = this.renderRoot.querySelector<HTMLElement>('.trigger');
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    this._portalEl.style.top = `${rect.bottom + 4}px`;
    this._portalEl.style.left = `${rect.left}px`;
    this._portalEl.style.width = `${rect.width}px`;
  }

  /** Render the options list into the portal and show it. */
  #renderPortal(): void {
    const portal = this.#ensurePortal();
    document.body.appendChild(portal);
    render(this.#portalTemplate(), portal);
    this.#repositionPortal();
  }

  /** Template for the portal-hosted dropdown. */
  #portalTemplate(): TemplateResult {
    return html`
      <div
        role="listbox"
        aria-multiselectable=${this.multiple ? 'true' : 'false'}
        style="
          max-height: 280px;
          overflow-y: auto;
          border-radius: var(--sg-select-radius, var(--sg-radius-md, 12px));
          box-shadow: var(--sg-glass-shadow-lg, 0 8px 32px rgba(0,0,0,0.4));
          background: var(--sg-glass-bg, rgba(255,255,255,0.08));
          backdrop-filter: var(--sg-glass-blur, blur(20px));
          -webkit-backdrop-filter: var(--sg-glass-blur, blur(20px));
          border: 1px solid var(--sg-glass-border, rgba(255,255,255,0.12));
        "
      >
        ${this.options.map((option, index) => {
          const selected = this._isSelected(option.value);
          return html`
            <div
              role="option"
              aria-selected=${selected ? 'true' : 'false'}
              data-index=${index}
              @click=${() => this._selectOption(option)}
              @mouseenter=${() => { if (!option.disabled) this._highlightedIndex = index; }}
              style="
                padding: 10px 12px;
                cursor: ${option.disabled ? 'not-allowed' : 'pointer'};
                display: flex;
                align-items: center;
                gap: 8px;
                color: var(--sg-text-secondary, rgba(255,255,255,0.6));
                font-size: 0.875rem;
                font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
                background: ${index === this._highlightedIndex ? 'var(--sg-glass-bg-hover, rgba(255,255,255,0.14))' : 'transparent'};
                opacity: ${option.disabled ? '0.45' : '1'};
                font-weight: ${selected ? '500' : '400'};
                color: ${selected ? 'var(--sg-text-primary, rgba(255,255,255,0.9))' : 'var(--sg-text-secondary, rgba(255,255,255,0.6))'};
              "
            >
              ${selected ? html`
                <span style="width:16px;height:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--sg-spectral-rose,#d4869f);">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
              ` : html`<span style="width:16px;height:16px;flex-shrink:0;"></span>`}
              <span>${option.label}</span>
            </div>
          `;
        })}
      </div>
    `;
  }

  /** Destroy the portal element. */
  #destroyPortal(): void {
    if (this._portalEl) {
      if (this._portalEl.parentNode) {
        this._portalEl.parentNode.removeChild(this._portalEl);
      }
      render(null, this._portalEl);
      this._portalEl = null;
    }
  }

  private _openDropdown(): void {
    if (this.disabled) return;

    // Close any other sg-select dropdowns
    for (const instance of SgSelect._instances) {
      if (instance !== this && instance._open) {
        instance._close();
      }
    }

    this._open = true;
    this._highlightedIndex = -1;
    this.#renderPortal();
    this.#addScrollListeners();
  }

  private _close(): void {
    if (!this._open) return;
    this._open = false;
    this._highlightedIndex = -1;
    this.#destroyPortal();
    this.#removeScrollListeners();
    this.renderRoot.querySelector<HTMLElement>('.trigger')?.focus();
  }

  private _toggle(): void {
    if (this._open) {
      this._close();
    } else {
      this._openDropdown();
    }
  }

  private _selectOption(option: SelectOption): void {
    if (option.disabled) return;

    if (this.multiple) {
      const current = this._selectedValues;
      const idx = current.indexOf(option.value);
      if (idx >= 0) {
        current.splice(idx, 1);
      } else {
        current.push(option.value);
      }
      this.value = current.join(',');
      this._dispatchChange();
    } else {
      this.value = option.value;
      this._dispatchChange();
      this._close();
    }
  }

  private _dispatchChange(): void {
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  #onTriggerClick(): void {
    this._toggle();
  }

  #onTriggerKeydown(e: KeyboardEvent): void {
    if (this.disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        this._toggle();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!this._open) {
          this._openDropdown();
        } else {
          this._highlightNext();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (this._open) {
          this._highlightPrevious();
        }
        break;
      case 'Escape':
        if (this._open) {
          e.preventDefault();
          this._close();
        }
        break;
    }
  }

  override updated(changed: Map<string, unknown>): void {
    // Re-render portal content when highlight or selection changes
    if (this._open && (changed.has('_highlightedIndex') || changed.has('value') || changed.has('options'))) {
      this.#updatePortalContent();
    }
  }

  private _highlightNext(): void {
    const enabledIndices = this.options
      .map((opt, i) => (opt.disabled ? -1 : i))
      .filter(i => i >= 0);
    if (enabledIndices.length === 0) return;

    const currentIdx = enabledIndices.indexOf(this._highlightedIndex);
    const nextIdx = (currentIdx + 1) % enabledIndices.length;
    this._highlightedIndex = enabledIndices[nextIdx]!;
    this.#scrollPortalToIndex(this._highlightedIndex);
  }

  private _highlightPrevious(): void {
    const enabledIndices = this.options
      .map((opt, i) => (opt.disabled ? -1 : i))
      .filter(i => i >= 0);
    if (enabledIndices.length === 0) return;

    const currentIdx = enabledIndices.indexOf(this._highlightedIndex);
    const prevIdx = (currentIdx - 1 + enabledIndices.length) % enabledIndices.length;
    this._highlightedIndex = enabledIndices[prevIdx]!;
    this.#scrollPortalToIndex(this._highlightedIndex);
  }

  /** Re-render the portal's options list (called after highlight/value changes). */
  #updatePortalContent(): void {
    if (this._portalEl) {
      render(this.#portalTemplate(), this._portalEl);
    }
  }

  /** Scroll the portal's list so the highlighted option is visible. */
  #scrollPortalToIndex(index: number): void {
    if (!this._portalEl) return;
    const listbox = this._portalEl.firstElementChild;
    const optionEl = listbox?.children[index] as HTMLElement | undefined;
    if (!listbox || !optionEl) return;
    const boxRect = listbox.getBoundingClientRect();
    const optRect = optionEl.getBoundingClientRect();
    if (optRect.bottom > boxRect.bottom) {
      listbox.scrollTop = (listbox.scrollTop ?? 0) + (optRect.bottom - boxRect.bottom);
    } else if (optRect.top < boxRect.top) {
      listbox.scrollTop = (listbox.scrollTop ?? 0) - (boxRect.top - optRect.top);
    }
  }

  #handleClear(e: Event): void {
    e.stopPropagation();
    this.value = '';
    this._dispatchChange();
  }

  override render(): TemplateResult {
    const hasValue = this.multiple ? this._selectedValues.length > 0 : !!this.value;

    const triggerClasses = classMap({
      trigger: true,
      'trigger--open': this._open,
      'trigger--error': !!this.error,
      'trigger--disabled': this.disabled,
      'trigger--accent': this.accent,
    });

    const chevronClasses = classMap({
      trigger__chevron: true,
      'trigger__chevron--open': this._open,
    });

    return html`
      ${this.label ? html`<label class="label">${this.label}</label>` : ''}

      <button
        class=${triggerClasses}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded=${this._open}
        aria-invalid=${this.error ? 'true' : 'false'}
        aria-describedby=${this.error ? 'error-msg' : undefined}
        ?disabled=${this.disabled}
        @click=${this.#onTriggerClick}
        @keydown=${this.#onTriggerKeydown}
      >
        <span class="${classMap({ trigger__value: true, trigger__placeholder: !hasValue })}">
          ${hasValue ? this._displayText : this.placeholder}
        </span>

        ${this.clearable && hasValue ? html`
          <button
            class="trigger__clear"
            @click=${this.#handleClear}
            aria-label="Clear selection"
            tabindex="-1"
            type="button"
          >&times;</button>
        ` : ''}

        <span class=${chevronClasses}>
          <sg-icon name="chevron-down" size="sm"></sg-icon>
        </span>
      </button>

      ${this.error ? html`<span class="error" id="error-msg" role="alert">${this.error}</span>` : ''}
    `;
  }
}

customElements.define('sg-select', SgSelect);

declare global {
  interface HTMLElementTagNameMap {
    'sg-select': SgSelect;
  }
}
