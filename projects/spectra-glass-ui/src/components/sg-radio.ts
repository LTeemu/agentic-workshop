import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { focusRing, smoothTransition } from '../styles/shared.js';

/**
 * A glass-styled radio button with spectral gradient checked state.
 *
 * @fires change - Emitted when selection changes. `event.detail` contains `{ checked, value }`.
 *
 * @cssprop [--sg-radio-size=18px] - Diameter of the radio circle.
 * @cssprop [--sg-radio-dot-size=8px] - Diameter of the inner filled dot.
 */
export class SgRadio extends LitElement {
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

    .radio {
      position: relative;
      width: var(--sg-radio-size, 18px);
      height: var(--sg-radio-size, 18px);
      border-radius: 50%;
      background: var(--sg-glass-bg, rgba(255, 255, 255, 0.08));
      backdrop-filter: var(--sg-glass-blur, blur(20px));
      -webkit-backdrop-filter: var(--sg-glass-blur, blur(20px));
      border: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      flex-shrink: 0;
      box-sizing: border-box;
      ${smoothTransition}
    }

    .radio--checked {
      border-color: var(
        --sg-gradient-spectral,
        linear-gradient(135deg, rgba(212, 134, 159, 0.5), rgba(196, 160, 80, 0.5), rgba(127, 168, 141, 0.5), rgba(122, 128, 192, 0.5))
      );
    }

    .radio::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: var(--sg-radio-dot-size, 8px);
      height: var(--sg-radio-dot-size, 8px);
      border-radius: 50%;
      background: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      transform: translate(-50%, -50%) scale(0);
      ${smoothTransition}
    }

    .radio--checked::after {
      transform: translate(-50%, -50%) scale(1);
      background: var(
        --sg-gradient-spectral,
        linear-gradient(135deg, rgba(212, 134, 159, 1), rgba(196, 160, 80, 1), rgba(127, 168, 141, 1), rgba(122, 128, 192, 1))
      );
    }

    .label {
      font-size: 0.875rem;
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      user-select: none;
    }

    .input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
      pointer-events: none;
    }
  `;

  @property({ type: Boolean, reflect: true })
  checked: boolean = false;

  @property({ type: Boolean, reflect: true })
  disabled: boolean = false;

  @property({ type: String })
  label: string = '';

  @property({ type: String, reflect: true })
  name: string = '';

  @property({ type: String })
  value: string = '';

  override render() {
    const radioClasses = classMap({
      radio: true,
      'radio--checked': this.checked,
    });

    return html`
      <input
        type="radio"
        class="input"
        .checked=${this.checked}
        .disabled=${this.disabled}
        .name=${this.name}
        .value=${this.value}
        @change=${this.#handleChange}
        @keydown=${this.#handleKeydown}
        tabindex=${this.disabled ? '-1' : '0'}
        aria-checked=${this.checked ? 'true' : 'false'}
      />
      <span class=${radioClasses} @click=${this.#handleClick}></span>
      ${this.label ? html`<span class="label">${this.label}</span>` : ''}
    `;
  }

  #handleClick(): void {
    if (this.disabled || this.checked) return;
    this.checked = true;
    this.#dispatchChange();
  }

  #handleKeydown(e: KeyboardEvent): void {
    if (this.disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!this.checked) {
        this.checked = true;
        this.#dispatchChange();
      }
    }
  }

  #handleChange(): void {
    if (this.disabled) return;
    this.#dispatchChange();
  }

  #dispatchChange(): void {
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { checked: this.checked, value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define('sg-radio', SgRadio);

declare global {
  interface HTMLElementTagNameMap {
    'sg-radio': SgRadio;
  }
}
