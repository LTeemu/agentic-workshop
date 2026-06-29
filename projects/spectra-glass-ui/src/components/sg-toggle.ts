import { LitElement, html, css, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { focusRing, smoothTransition } from '../styles/shared.js';

/**
 * A toggle switch with spectral gradient active track.
 *
 * @fires change - Emitted when toggled. `event.detail` contains the new checked state.
 *
 * @cssprop [--sg-toggle-height=24px] - Track height.
 * @cssprop [--sg-toggle-width=44px] - Track width.
 * @cssprop [--sg-toggle-knob-size=18px] - Knob diameter.
 */
export class SgToggle extends LitElement {
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

    /* ═══ Track ═══ */

    .track {
      position: relative;
      width: var(--sg-toggle-width, 44px);
      height: var(--sg-toggle-height, 24px);
      border-radius: var(--sg-radius-full, 9999px);
      background: var(--sg-glass-bg, rgba(255, 255, 255, 0.08));
      backdrop-filter: var(--sg-glass-blur, blur(20px));
      -webkit-backdrop-filter: var(--sg-glass-blur, blur(20px));
      border: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      flex-shrink: 0;
      ${smoothTransition}
    }

    .track--checked {
      background: var(
        --sg-toggle-active-bg,
        var(
          --sg-gradient-spectral,
          linear-gradient(135deg, rgba(212, 134, 159, 0.5), rgba(196, 160, 80, 0.5), rgba(127, 168, 141, 0.5), rgba(122, 128, 192, 0.5))
        )
      );
      border-color: transparent;
    }

    /* ═══ Knob ═══ */

    .knob {
      position: absolute;
      top: 50%;
      left: 2px;
      width: var(--sg-toggle-knob-size, 18px);
      height: var(--sg-toggle-knob-size, 18px);
      border-radius: 50%;
      background: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      transform: translateY(-50%) translateX(0);
      ${smoothTransition}
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
      will-change: transform;
    }

    .track--checked .knob {
      transform: translateY(-50%)
        translateX(
          calc(
            var(--sg-toggle-width, 44px) - var(--sg-toggle-knob-size, 18px) - 4px
          )
        );
      background: #fff;
    }

    /* ═══ Label ═══ */

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

  @property({ type: String })
  label: string = '';

  @property({ type: String, attribute: 'label-position' })
  labelPosition: 'left' | 'right' = 'right';

  override render(): TemplateResult {
    const trackClasses = classMap({
      track: true,
      'track--checked': this.checked,
    });

    const labelEl = this.label
      ? html`<span class="label">${this.label}</span>`
      : '';

    return html`
      ${this.labelPosition === 'left' ? labelEl : ''}
      <div
        class=${trackClasses}
        role="switch"
        aria-checked=${this.checked ? 'true' : 'false'}
        tabindex=${this.disabled ? '-1' : '0'}
        @click=${this.#handleToggle}
        @keydown=${this.#handleKeydown}
      >
        <span class="knob"></span>
      </div>
      ${this.labelPosition === 'right' ? labelEl : ''}
    `;
  }

  #handleToggle(): void {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.#dispatchChange();
  }

  #handleKeydown(e: KeyboardEvent): void {
    if (this.disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.checked = !this.checked;
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

customElements.define('sg-toggle', SgToggle);

declare global {
  interface HTMLElementTagNameMap {
    'sg-toggle': SgToggle;
  }
}
