import { LitElement, html, css, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { live } from 'lit/directives/live.js';
import { focusRing, glassSurface, smoothTransition } from '../styles/shared.js';

export type InputVariant = 'outlined' | 'ghost';
export type InputType = 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url';

/**
 * A glass-styled text input with spectral focus ring.
 *
 * @slot prefix - Content before the input (e.g. icon).
 * @slot suffix - Content after the input (e.g. clear button).
 *
 * @fires input - Native input event.
 * @fires change - Native change event.
 *
 * @cssprop [--sg-input-radius=var(--sg-radius-md, 12px)] - Border radius.
 * @cssprop [--sg-input-height=40px] - Input height.
 */
export class SgInput extends LitElement {
  static override styles = css`
    :host {
      display: block;
      position: relative;
      outline: none;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
      --_focus-offset: -3px;
    }

    /* Focus ring — extend radius to match the field */
    :host(:focus-visible)::after {
      content: '';
      position: absolute;
      inset: -3px;
      border-radius: calc(
        var(--sg-input-radius, var(--sg-radius-md, 12px)) + 3px
      );
      padding: 2px;
      background: var(
        --sg-focus-ring,
        var(
          --sg-gradient-spectral,
          linear-gradient(
            135deg,
            rgba(212, 134, 159, 0.5),
            rgba(196, 160, 80, 0.5),
            rgba(127, 168, 141, 0.5),
            rgba(122, 128, 192, 0.5)
          )
        )
      );
      -webkit-mask: linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask-composite: exclude;
      pointer-events: none;
      z-index: 1;
    }

    .field {
      display: flex;
      align-items: center;
      gap: 8px;
      border-radius: var(--sg-input-radius, var(--sg-radius-md, 12px));
      height: var(--sg-input-height, 40px);
      padding: 0 12px;
      ${smoothTransition}
    }

    .field--outlined {
      ${glassSurface}
    }

    .field--outlined:focus-within {
      border-color: var(--sg-glass-border-hover, rgba(255, 255, 255, 0.25));
      background: var(--sg-glass-bg-hover, rgba(255, 255, 255, 0.14));
    }

    .field--ghost {
      background: transparent;
      border: 1px solid transparent;
    }

    .field--ghost:focus-within {
      background: var(--sg-glass-bg-hover, rgba(255, 255, 255, 0.14));
    }

    .field--error {
      border-color: var(--sg-spectral-rose, #d4869f) !important;
    }

    .field--disabled {
      opacity: 0.45;
      pointer-events: none;
    }

    /* ─── Input element ─── */

    .field__input {
      flex: 1;
      min-width: 0;
      background: transparent;
      border: none;
      outline: none;
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      font-family: inherit;
      font-size: 0.875rem;
      line-height: 1;
      padding: 0;
      height: 100%;
    }

    .field__input::placeholder {
      color: var(--sg-text-tertiary, rgba(255, 255, 255, 0.4));
    }

    /* ─── Label ─── */

    .label {
      display: block;
      margin-bottom: 6px;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
    }

    /* ─── Error text ─── */

    .error {
      display: block;
      margin-top: 4px;
      font-size: 0.75rem;
      color: var(--sg-spectral-rose, #d4869f);
    }

    /* ─── Slots ─── */

    ::slotted([slot='prefix']),
    ::slotted([slot='suffix']) {
      display: flex;
      align-items: center;
      color: var(--sg-text-tertiary, rgba(255, 255, 255, 0.4));
      flex-shrink: 0;
    }
  `;

  @property({ type: String })
  label: string = '';

  @property({ type: String })
  placeholder: string = '';

  @property({ type: String })
  value: string = '';

  @property({ type: String, reflect: true })
  type: InputType = 'text';

  @property({ type: String, reflect: true })
  variant: InputVariant = 'outlined';

  @property({ type: Boolean, reflect: true })
  disabled: boolean = false;

  @property({ type: Boolean, reflect: true })
  readonly: boolean = false;

  @property({ type: String })
  error: string = '';

  @property({ type: String })
  name: string = '';

  override render(): TemplateResult {
    const fieldClasses = classMap({
      field: true,
      [`field--${this.variant}`]: true,
      'field--error': !!this.error,
      'field--disabled': this.disabled,
    });

    return html`
      ${this.label ? html`<label class="label" for="input">${this.label}</label>` : ''}

      <div class=${fieldClasses}>
        <slot name="prefix"></slot>

        <input
          id="input"
          class="field__input"
          type=${this.type}
          .value=${live(this.value)}
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          ?readonly=${this.readonly}
          name=${this.name || ''}
          @input=${this.#handleInput}
          @change=${this.#handleChange}
          aria-invalid=${this.error ? 'true' : 'false'}
          aria-describedby=${this.error ? 'error-msg' : undefined}
        />

        <slot name="suffix"></slot>
      </div>

      ${this.error ? html`<span class="error" id="error-msg" role="alert">${this.error}</span>` : ''}
    `;
  }

  #handleInput(e: Event): void {
    const target = e.target as HTMLInputElement;
    this.value = target.value;
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  #handleChange(e: Event): void {
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }
}

customElements.define('sg-input', SgInput);

declare global {
  interface HTMLElementTagNameMap {
    'sg-input': SgInput;
  }
}
