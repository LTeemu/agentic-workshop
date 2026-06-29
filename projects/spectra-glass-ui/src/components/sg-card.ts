import { LitElement, html, css, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';

export type CardVariant = 'elevated' | 'outlined' | 'ghost';
export type CardPadding = 'sm' | 'md' | 'lg';

/**
 * A glassmorphic card component with spectral gradient interactions.
 *
 * - **Focus-visible**: A 2px spectral gradient ring appears on keyboard focus.
 * - **Hover**: The elevated variant gains a subtle spectral glow.
 * - **Selected/accent**: A gradient border overlay decorates the card.
 *
 * @slot header - Optional header content.
 * @slot - Default body content.
 * @slot footer - Optional footer content.
 *
 * @cssprop [--sg-card-bg=var(--sg-glass-bg, rgba(255,255,255,0.08))] - Card background.
 * @cssprop [--sg-card-border=var(--sg-glass-border, rgba(255,255,255,0.12))] - Card border colour.
 * @cssprop [--sg-card-shadow=var(--sg-glass-shadow, 0 4px 24px rgba(0,0,0,0.12))] - Card box-shadow.
 * @cssprop [--sg-card-radius=var(--sg-radius-lg, 20px)] - Card border-radius.
 */
export class SgCard extends LitElement {
  static override styles = css`
    /* ═══════════════════════════════════════════════════════
       Host — focus ring lives here (outside overflow clip)
       ═══════════════════════════════════════════════════════ */
    :host {
      display: block;
      position: relative;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
      outline: none;
    }

    /* ─── Gradient focus ring (keyboard only) ─── */
    :host(:focus-visible)::after {
      content: '';
      position: absolute;
      inset: -3px;
      border-radius: calc(
        var(--sg-card-radius, var(--sg-radius-lg, 20px)) + 3px
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

    /* ═══════════════════════════════════════════════════════
       Card body
       ═══════════════════════════════════════════════════════ */
    .card {
      position: relative;
      display: flex;
      flex-direction: column;
      border-radius: var(--sg-card-radius, var(--sg-radius-lg, 20px));
      border: 1px solid
        var(
          --sg-card-border,
          var(--sg-glass-border, rgba(255, 255, 255, 0.12))
        );
      background: var(--sg-card-bg, var(--sg-glass-bg, rgba(255, 255, 255, 0.08)));
      backdrop-filter: var(--sg-glass-blur, blur(20px));
      -webkit-backdrop-filter: var(--sg-glass-blur, blur(20px));
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      transition:
        background var(--sg-transition-base, 250ms ease),
        box-shadow var(--sg-transition-base, 250ms ease),
        border-color var(--sg-transition-base, 250ms ease);
      overflow: hidden;
    }

    /* ─── Variants ─── */

    .card--elevated {
      box-shadow: var(
        --sg-card-shadow,
        var(--sg-glass-shadow, 0 4px 24px rgba(0, 0, 0, 0.12))
      );
    }

    .card--elevated:hover {
      border-color: var(
        --sg-glass-border-hover,
        rgba(255, 255, 255, 0.25)
      );
      background: var(--sg-glass-bg-hover, rgba(255, 255, 255, 0.14));
      box-shadow:
        var(--sg-glass-shadow-lg, 0 8px 48px rgba(0, 0, 0, 0.18)),
        0 0 30px rgba(218, 119, 242, 0.08),
        0 0 60px rgba(77, 171, 247, 0.06);
    }

    .card--outlined {
      background: transparent;
      box-shadow: none;
    }

    .card--outlined:hover {
      border-color: var(
        --sg-glass-border-hover,
        rgba(255, 255, 255, 0.25)
      );
      box-shadow:
        0 0 20px rgba(218, 119, 242, 0.06),
        0 0 40px rgba(77, 171, 247, 0.04);
    }

    .card--ghost {
      background: transparent;
      border-color: transparent;
      box-shadow: none;
    }

    .card--ghost:hover {
      background: var(--sg-glass-bg-hover, rgba(255, 255, 255, 0.14));
    }

    /* ─── Padding ─── */

    .card--padding-sm {
      padding: var(--sg-card-padding-sm, 12px);
    }

    .card--padding-md {
      padding: var(--sg-card-padding-md, 20px);
    }

    .card--padding-lg {
      padding: var(--sg-card-padding-lg, 28px);
    }

    /* ─── Spectral gradient accent / selected border ─── */

    .card--accent::before,
    .card--selected::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      padding: 1px;

      /* Separate stop-gap fallback to avoid one huge expression */
      --sg-spectral-fallback: linear-gradient(
        135deg,
        rgba(212, 134, 159, 0.5),
        rgba(196, 160, 80, 0.5),
        rgba(127, 168, 141, 0.5),
        rgba(122, 128, 192, 0.5)
      );
      background: var(
        --sg-card-accent,
        var(--sg-gradient-spectral, var(--sg-spectral-fallback))
      );

      -webkit-mask: linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask-composite: exclude;
      pointer-events: none;
    }

    /* Selected state gets a slightly thicker accent border */
    .card--selected::before {
      padding: 1.5px;
    }

    /* ─── Sections ─── */

    .header {
      padding-bottom: 8px;
      border-bottom: 1px solid
        var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      margin-bottom: 8px;
    }

    .header ::slotted(*) {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0;
    }

    .body {
      flex: 1;
    }

    .footer {
      padding-top: 12px;
      border-top: 1px solid
        var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      margin-top: 12px;
    }

    .footer ::slotted(*) {
      margin: 0;
    }
  `;

  /**
   * Card visual variant.
   * - `elevated`: glass surface with shadow + spectral hover glow (default)
   * - `outlined`: transparent with visible border + subtle glow on hover
   * - `ghost`: minimal, no border or bg until hover
   */
  @property({ type: String, reflect: true })
  variant: CardVariant = 'elevated';

  /**
   * Inner padding size.
   * - `sm`: 12px
   * - `md`: 20px (default)
   * - `lg`: 28px
   */
  @property({ type: String, reflect: true })
  padding: CardPadding = 'md';

  /**
   * When true, renders a 1px spectral gradient border overlay.
   */
  @property({ type: Boolean, reflect: true, attribute: 'accent' })
  accent: boolean = false;

  /**
   * When true, renders a thicker spectral gradient border
   * to indicate the selected/active state.
   */
  @property({ type: Boolean, reflect: true })
  selected: boolean = false;

  constructor() {
    super();
    // Make the card focusable via keyboard so the gradient
    // focus-visible ring is accessible.
    this.tabIndex = 0;
  }

  override render(): TemplateResult {
    const variantClass = `card--${this.variant}`;
    const paddingClass = `card--padding-${this.padding}`;
    const accentClass = this.accent ? 'card--accent' : '';
    const selectedClass = this.selected ? 'card--selected' : '';

    return html`
      <div class="card ${variantClass} ${paddingClass} ${accentClass} ${selectedClass}">
        <div class="header" ?hidden=${!this.#hasHeaderSlotted()}>
          <slot name="header"></slot>
        </div>

        <div class="body">
          <slot></slot>
        </div>

        <div class="footer" ?hidden=${!this.#hasFooterSlotted()}>
          <slot name="footer"></slot>
        </div>
      </div>
    `;
  }

  #hasHeaderSlotted(): boolean {
    const slot = this.shadowRoot?.querySelector(
      'slot[name="header"]'
    ) as HTMLSlotElement | null;
    return (slot?.assignedNodes().length ?? 0) > 0;
  }

  #hasFooterSlotted(): boolean {
    const slot = this.shadowRoot?.querySelector(
      'slot[name="footer"]'
    ) as HTMLSlotElement | null;
    return (slot?.assignedNodes().length ?? 0) > 0;
  }

  override updated(changedProperties: Map<string, unknown>): void {
    if (
      changedProperties.has('variant') ||
      changedProperties.has('padding') ||
      changedProperties.has('accent') ||
      changedProperties.has('selected')
    ) {
      this.#updateSlots();
    }
  }

  #updateSlots(): void {
    requestAnimationFrame(() => {
      this.requestUpdate();
    });
  }
}

customElements.define('sg-card', SgCard);

declare global {
  interface HTMLElementTagNameMap {
    'sg-card': SgCard;
  }
}
