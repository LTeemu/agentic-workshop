import { LitElement, html, css, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

/**
 * Hero section with headline, subtitle, CTA buttons, and optional
 * background media.
 *
 * @cssprop [--sg-hero-min-height=80vh] - Minimum height.
 * @cssprop [--sg-hero-overlay=rgba(0,0,0,0.5)] - Gradient overlay colour.
 * @cssprop [--sg-hero-heading-size=clamp(2.5rem,6vw,4.5rem)] - Heading font size.
 * @cssprop [--sg-hero-subtitle-size=clamp(1rem,2vw,1.25rem)] - Subtitle font size.
 */
export class SgHero extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
      position: relative;
      overflow: hidden;
    }

    .hero {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: var(--sg-hero-min-height, 80vh);
      padding: 4rem 1.5rem;
      box-sizing: border-box;
    }

    /* ─── Background media ─── */

    .media {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .media ::slotted(img),
    .media ::slotted(video) {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* ─── Gradient overlay ─── */

    .overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        transparent 0%,
        var(--sg-hero-overlay, rgba(0, 0, 0, 0.5)) 100%
      );
      pointer-events: none;
    }

    /* ─── Content ─── */

    .content {
      position: relative;
      z-index: 1;
      max-width: var(--sg-max-width-md, 800px);
      width: 100%;
    }

    .content--center {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .content--left {
      text-align: left;
    }

    .heading {
      font-size: var(--sg-hero-heading-size, clamp(2.5rem, 6vw, 4.5rem));
      font-weight: 700;
      line-height: 1.1;
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      margin: 0 0 1rem;
      letter-spacing: -0.02em;
    }

    .subtitle {
      font-size: var(--sg-hero-subtitle-size, clamp(1rem, 2vw, 1.25rem));
      line-height: 1.6;
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
      margin: 0 0 2rem;
      max-width: 600px;
    }

    .content--center .subtitle {
      margin-left: auto;
      margin-right: auto;
    }

    .actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .content--center .actions {
      justify-content: center;
    }

    .actions ::slotted([slot='cta-primary']) {
      --sg-button-primary-bg: var(
        --sg-gradient-spectral-strong,
        linear-gradient(135deg, rgba(212, 134, 159, 0.75), rgba(196, 160, 80, 0.75), rgba(127, 168, 141, 0.75), rgba(122, 128, 192, 0.75))
      );
    }
  `;

  /**
   * Content alignment.
   * @default 'center'
   */
  @property({ type: String })
  align: 'left' | 'center' = 'center';

  /**
   * Whether to show the gradient overlay on the background media.
   * @default true
   */
  @property({ type: Boolean })
  overlay: boolean = true;

  override render(): TemplateResult {
    const contentClasses = {
      content: true,
      'content--center': this.align === 'center',
      'content--left': this.align === 'left',
    };

    return html`
      <section class="hero">
        <!-- Background media slot -->
        <div class="media">
          <slot name="media"></slot>
        </div>

        <!-- Gradient overlay -->
        ${this.overlay ? html`<div class="overlay"></div>` : ''}

        <!-- Foreground content -->
        <div class=${classMap(contentClasses)}>
          <div class="heading"><slot name="heading"></slot></div>
          <div class="subtitle"><slot name="subtitle"></slot></div>
          <div class="actions">
            <slot name="cta-primary"></slot>
            <slot name="cta-secondary"></slot>
          </div>
          <slot name="extra"></slot>
        </div>
      </section>
    `;
  }
}

customElements.define('sg-hero', SgHero);

declare global {
  interface HTMLElementTagNameMap {
    'sg-hero': SgHero;
  }
}
