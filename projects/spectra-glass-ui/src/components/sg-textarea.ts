import { LitElement, html, css, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { live } from 'lit/directives/live.js';
import { focusRingCSS, glassSurface, smoothTransition } from '../styles/shared.js';

export type TextareaVariant = 'outlined' | 'ghost';
export type TextareaResize = 'none' | 'vertical' | 'both';

/**
 * A glass-styled multi-line textarea with spectral focus ring.
 *
 * @fires input - Native input event.
 * @fires change - Native change event.
 *
 * @cssprop [--sg-textarea-radius=var(--sg-radius-md, 12px)] - Border radius.
 * @cssprop [--sg-textarea-height=120px] - Minimum height.
 * @cssprop [--sg-textarea-resize=vertical] - Resize direction.
 */
export class SgTextarea extends LitElement {
  static override styles = css`
    :host {
      display: block;
      position: relative;
      outline: none;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
      --_focus-offset: -3px;
    }

    ${focusRingCSS('var(--sg-textarea-radius, var(--sg-radius-md, 12px))')}

    .field {
      display: flex;
      flex-direction: column;
      position: relative;
      border-radius: var(--sg-textarea-radius, var(--sg-radius-md, 12px));
      min-height: var(--sg-textarea-height, 120px);
      padding: 12px;
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
      border-color: var(--sg-color-error, #d4869f) !important;
    }

    .field--disabled {
      opacity: 0.45;
      pointer-events: none;
    }

    /* ─── Spectral gradient accent border ─── */

    .field--accent::before {
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
        --sg-textarea-accent,
        var(--sg-gradient-spectral, var(--sg-spectral-fallback))
      );
      -webkit-mask: linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask-composite: exclude;
      pointer-events: none;
    }

    /* ─── Textarea element ─── */

    .field__textarea {
      flex: 1;
      min-width: 0;
      min-height: calc(var(--sg-textarea-height, 120px) - 24px);
      background: transparent;
      border: none;
      outline: none;
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      font-family: inherit;
      font-size: 0.875rem;
      line-height: 1.6;
      padding: 0;
      margin: 0;
      resize: var(--sg-textarea-resize, vertical);
      width: 100%;
      box-sizing: border-box;
    }

    .field__textarea::placeholder {
      color: var(--sg-text-tertiary, rgba(255, 255, 255, 0.4));
    }

    .field__textarea--no-resize {
      resize: none;
    }

    .field__textarea--resize-both {
      resize: both;
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
      color: var(--sg-color-error, #d4869f);
    }

    /* ─── Clear button ─── */

    .field__clear {
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      bottom: 4px;
      right: 4px;
      width: 22px;
      height: 22px;
      border: none;
      background: var(--sg-glass-bg, rgba(255, 255, 255, 0.08));
      color: var(--sg-text-tertiary, rgba(255, 255, 255, 0.4));
      cursor: pointer;
      border-radius: 50%;
      font-size: 1rem;
      line-height: 1;
      padding: 0;
      flex-shrink: 0;
      transition: color var(--sg-transition-fast, 150ms ease);
      z-index: 1;
    }

    .field__clear:hover {
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      background: var(--sg-glass-bg-hover, rgba(255, 255, 255, 0.14));
    }
  `;

  @property({ type: String })
  label: string = '';

  @property({ type: String })
  placeholder: string = '';

  @property({ type: String })
  value: string = '';

  @property({ type: String, reflect: true })
  variant: TextareaVariant = 'outlined';

  @property({ type: Boolean, reflect: true })
  disabled: boolean = false;

  @property({ type: Boolean, reflect: true })
  readonly: boolean = false;

  @property({ type: String })
  error: string = '';

  @property({ type: String })
  name: string = '';

  @property({ type: Number })
  rows: number = 3;

  @property({ type: Number })
  maxlength: number = 0;

  @property({ type: String })
  resize: TextareaResize = 'vertical';

  @property({ type: Boolean })
  clearable: boolean = false;

  /** When true, renders a spectral gradient border overlay. */
  @property({ type: Boolean, reflect: true })
  accent: boolean = false;

  override render(): TemplateResult {
    const fieldClasses = classMap({
      field: true,
      [`field--${this.variant}`]: true,
      'field--error': !!this.error,
      'field--disabled': this.disabled,
      'field--accent': this.accent,
    });

    const textareaClasses = classMap({
      field__textarea: true,
      'field__textarea--no-resize': this.resize === 'none',
      'field__textarea--resize-both': this.resize === 'both',
    });

    return html`
      ${this.label ? html`<label class="label" for="textarea">${this.label}</label>` : ''}

      <div class=${fieldClasses}>
        <textarea
          id="textarea"
          class=${textareaClasses}
          .value=${live(this.value)}
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          ?readonly=${this.readonly}
          name=${this.name || ''}
          rows=${this.rows}
          ?maxlength=${this.maxlength > 0}
          .maxLength=${this.maxlength > 0 ? this.maxlength : undefined}
          @input=${this.#handleInput}
          @change=${this.#handleChange}
          aria-invalid=${this.error ? 'true' : 'false'}
          aria-describedby=${this.error ? 'error-msg' : undefined}
        ></textarea>

        ${this.clearable && this.value ? html`
          <button
            class="field__clear"
            @click=${this.#handleClear}
            aria-label="Clear textarea"
            tabindex="-1"
            type="button"
          >&times;</button>
        ` : ''}
      </div>

      ${this.error ? html`<span class="error" id="error-msg" role="alert">${this.error}</span>` : ''}
    `;
  }

  #handleInput(e: Event): void {
    const target = e.target as HTMLTextAreaElement;
    this.value = target.value;
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  #handleChange(e: Event): void {
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  #handleClear(): void {
    this.value = '';
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    const textarea = this.renderRoot.querySelector<HTMLTextAreaElement>('.field__textarea');
    textarea?.focus();
  }
}

customElements.define('sg-textarea', SgTextarea);

declare global {
  interface HTMLElementTagNameMap {
    'sg-textarea': SgTextarea;
  }
}
