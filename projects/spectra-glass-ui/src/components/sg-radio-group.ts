import { LitElement, html, css } from 'lit';
import { property, queryAssignedElements } from 'lit/decorators.js';
import { type SgRadio } from './sg-radio.js';

/**
 * A radio group container that manages selection state across child sg-radio elements.
 *
 * @fires change - Emitted when the selected value changes. `event.detail` contains `{ value }`.
 */
export class SgRadioGroup extends LitElement {
  static override styles = css`
    :host {
      display: inline-flex;
      flex-direction: column;
      gap: 8px;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
    }

    .group-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 4px;
      user-select: none;
    }
  `;

  @property({ type: String, reflect: true })
  value: string = '';

  @property({ type: String, reflect: true })
  name: string = '';

  @property({ type: Boolean, reflect: true })
  disabled: boolean = false;

  @property({ type: String })
  label: string = '';

  @queryAssignedElements({ selector: 'sg-radio' })
  private _radios!: SgRadio[];

  private _slotChangeHandler(): void {
    this.#syncRadios();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('change', this.#onRadioChange);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('change', this.#onRadioChange);
  }

  override updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('name')) {
      this.#updateRadiosName();
    }
    if (changedProperties.has('value')) {
      this.#updateRadiosChecked();
    }
    if (changedProperties.has('disabled')) {
      this.#updateRadiosDisabled();
    }
  }

  override render() {
    return html`
      ${this.label ? html`<div class="group-label">${this.label}</div>` : ''}
      <slot @slotchange=${this._slotChangeHandler}></slot>
    `;
  }

  #syncRadios(): void {
    this.#updateRadiosName();
    this.#updateRadiosChecked();
    this.#updateRadiosDisabled();
  }

  #updateRadiosName(): void {
    for (const radio of this._radios) {
      radio.name = this.name;
    }
  }

  #updateRadiosChecked(): void {
    for (const radio of this._radios) {
      radio.checked = radio.value === this.value;
    }
  }

  #updateRadiosDisabled(): void {
    for (const radio of this._radios) {
      radio.disabled = this.disabled;
    }
  }

  readonly #onRadioChange = (e: Event): void => {
    const target = e.target as SgRadio;
    if (!target || target.getRootNode() !== this.shadowRoot?.host.getRootNode()) return;

    if (target.checked) {
      this.value = target.value;
      for (const radio of this._radios) {
        if (radio !== target) {
          radio.checked = false;
        }
      }
      this.dispatchEvent(
        new CustomEvent('change', {
          detail: { value: this.value },
          bubbles: true,
          composed: true,
        })
      );
    }
  };
}

customElements.define('sg-radio-group', SgRadioGroup);

declare global {
  interface HTMLElementTagNameMap {
    'sg-radio-group': SgRadioGroup;
  }
}
