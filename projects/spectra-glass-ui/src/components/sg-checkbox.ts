import { LitElement, html, css, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { focusRing, smoothTransition } from '../styles/shared.js';

/**
 * A glass-styled checkbox with spectral gradient when checked.
 *
 * @fires change - Emitted when toggled. `event.detail` contains `{ checked }`.
 *
 * @cssprop [--sg-radius-xs=4px] - Checkbox border radius.
 */
export class SgCheckbox extends LitElement {
  static override styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      position: relative;
      outline: none;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
      cursor: pointer;
    }

    :host([disabled]) {
      opacity: 0.45;
      cursor: not-allowed;
      pointer-events: none;
    }

    ${focusRing}

    .container {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      position: relative;
    }

    .native-input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
      margin: 0;
      pointer-events: none;
    }

    .box {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: var(--sg-radius-xs, 4px);
      background: var(--sg-glass-bg, rgba(255, 255, 255, 0.08));
      border: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      backdrop-filter: var(--sg-glass-blur, blur(20px));
      -webkit-backdrop-filter: var(--sg-glass-blur, blur(20px));
      flex-shrink: 0;
      ${smoothTransition}
    }

    .box--checked,
    .box--indeterminate {
      background: var(
        --sg-gradient-spectral,
        linear-gradient(
          135deg,
          rgba(212, 134, 159, 0.5),
          rgba(196, 160, 80, 0.5),
          rgba(127, 168, 141, 0.5),
          rgba(122, 128, 192, 0.5)
        )
      );
      border-color: transparent;
    }

    :host(:hover) .box:not(.box--checked):not(.box--indeterminate) {
      border-color: var(--sg-glass-border-hover, rgba(255, 255, 255, 0.25));
    }

    .icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }

    .label {
      font-size: 0.875rem;
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      user-select: none;
    }
  `;

  @property({ type: Boolean, reflect: true })
  checked: boolean = false;

  @property({ type: Boolean, reflect: true })
  disabled: boolean = false;

  @property({ type: Boolean, reflect: true })
  indeterminate: boolean = false;

  @property({ type: String })
  label: string = '';

  @property({ type: String })
  name: string = '';

  @property({ type: String })
  value: string = '';

  constructor() {
    super();
    this.addEventListener('keydown', this.#handleKeydown);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.tabIndex = this.disabled ? -1 : 0;
  }

  override updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('disabled')) {
      this.tabIndex = this.disabled ? -1 : 0;
    }
  }

  static checkIcon: TemplateResult = html`
    <svg class="icon" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  static minusIcon: TemplateResult = html`
    <svg class="icon" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path d="M2 6h8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>
  `;

  override render(): TemplateResult {
    const boxClasses = classMap({
      box: true,
      'box--checked': this.checked && !this.indeterminate,
      'box--indeterminate': this.indeterminate,
    });

    return html`
      <div class="container" @click=${this.#handleClick}>
        <input
          type="checkbox"
          class="native-input"
          .checked=${this.checked}
          .indeterminate=${this.indeterminate}
          ?disabled=${this.disabled}
          name=${this.name || ''}
          value=${this.value || ''}
          tabindex="-1"
          aria-hidden="true"
        />
        <span class=${boxClasses}>
          ${this.indeterminate
            ? SgCheckbox.minusIcon
            : this.checked
              ? SgCheckbox.checkIcon
              : ''}
        </span>
        ${this.label
          ? html`<span class="label">${this.label}</span>`
          : ''}
      </div>
    `;
  }

  #handleClick(): void {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.indeterminate = false;
    this.#dispatchChange();
  }

  #handleKeydown(e: KeyboardEvent): void {
    if (this.disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.checked = !this.checked;
      this.indeterminate = false;
      this.#dispatchChange();
    }
  }

  #dispatchChange(): void {
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { checked: this.checked },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define('sg-checkbox', SgCheckbox);

declare global {
  interface HTMLElementTagNameMap {
    'sg-checkbox': SgCheckbox;
  }
}
