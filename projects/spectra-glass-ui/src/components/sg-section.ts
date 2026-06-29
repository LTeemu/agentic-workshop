import { LitElement, css, type TemplateResult } from 'lit';
import { html, unsafeStatic } from 'lit/static-html.js';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

type SectionPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';
type SectionMaxWidth = 'sm' | 'md' | 'lg' | 'full';
type SectionAccent = 'none' | 'top' | 'bottom' | 'both';

/** Padding-to-CSS-var map. */
const PADDING: Record<SectionPadding, string> = {
  none: '0',
  sm: 'var(--sg-section-padding-sm, 2rem)',
  md: 'var(--sg-section-padding-md, 4rem)',
  lg: 'var(--sg-section-padding-lg, 6rem)',
  xl: 'var(--sg-section-padding-xl, 8rem)',
};

/** Max-width-to-CSS-var map. */
const MAX_WIDTH: Record<SectionMaxWidth, string> = {
  sm: 'var(--sg-max-width-sm, 640px)',
  md: 'var(--sg-max-width-md, 800px)',
  lg: 'var(--sg-max-width-lg, 1100px)',
  full: '100%',
};

/**
 * Responsive layout container with consistent spacing, optional glass
 * background, and decorative gradient accent edges.
 *
 * @cssprop [--sg-section-padding-sm=2rem] - Small vertical padding.
 * @cssprop [--sg-section-padding-md=4rem] - Medium vertical padding.
 * @cssprop [--sg-section-padding-lg=6rem] - Large vertical padding.
 * @cssprop [--sg-section-padding-xl=8rem] - Extra-large vertical padding.
 * @cssprop [--sg-max-width-sm=640px] - Small max-width.
 * @cssprop [--sg-max-width-md=800px] - Medium max-width.
 * @cssprop [--sg-max-width-lg=1100px] - Large max-width.
 */
export class SgSection extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
      position: relative;
    }

    .section {
      width: 100%;
      position: relative;
    }

    .inner {
      width: 100%;
      margin: 0 auto;
      padding-left: var(--sg-section-gutter, 1.5rem);
      padding-right: var(--sg-section-gutter, 1.5rem);
      box-sizing: border-box;
    }

    /* ─── Glass background ─── */

    .section--glass {
      background: var(--sg-glass-bg, rgba(255, 255, 255, 0.08));
      backdrop-filter: var(--sg-glass-blur, blur(20px));
      -webkit-backdrop-filter: var(--sg-glass-blur, blur(20px));
      border-top: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      border-bottom: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
    }

    /* ─── Accent edges ─── */

    .section--accent-top::before,
    .section--accent-bottom::after {
      content: '';
      display: block;
      height: 2px;
      width: 100%;
      position: absolute;
      left: 0;
      background: var(
        --sg-section-accent,
        var(
          --sg-gradient-spectral,
          linear-gradient(
            90deg,
            transparent,
            rgba(212, 134, 159, 0.5),
            rgba(196, 160, 80, 0.5),
            rgba(127, 168, 141, 0.5),
            rgba(122, 128, 192, 0.5),
            transparent
          )
        )
      );
    }

    .section--accent-top::before {
      top: 0;
    }

    .section--accent-bottom::after {
      bottom: 0;
    }
  `;

  /**
   * Vertical padding.
   * @default 'lg'
   */
  @property({ type: String })
  padding: SectionPadding = 'lg';

  /**
   * Inner content max-width.
   * @default 'lg'
   */
  @property({ type: String, attribute: 'max-width' })
  maxWidth: SectionMaxWidth = 'lg';

  /** Whether to apply the glass surface background. */
  @property({ type: Boolean })
  glass: boolean = false;

  /**
   * Decorative gradient accent edge(s).
   * @default 'none'
   */
  @property({ type: String })
  accent: SectionAccent = 'none';

  /**
   * Semantic HTML tag for the section element.
   * @default 'section'
   */
  @property({ type: String })
  tag: string = 'section';

  override render(): TemplateResult {
    const paddingPx = PADDING[this.padding] ?? PADDING.lg;
    const maxW = MAX_WIDTH[this.maxWidth] ?? MAX_WIDTH.lg;

    const sectionClasses = {
      section: true,
      'section--glass': this.glass,
      'section--accent-top': this.accent === 'top' || this.accent === 'both',
      'section--accent-bottom': this.accent === 'bottom' || this.accent === 'both',
    };

    const tag = unsafeStatic(this.tag);

    return html`
      <style>
        .inner {
          max-width: ${maxW};
          padding-top: ${paddingPx};
          padding-bottom: ${paddingPx};
        }
      </style>
      <${tag} class=${classMap(sectionClasses)}>
        <div class="inner">
          <slot></slot>
        </div>
      </${tag}>
    `;
  }
}

customElements.define('sg-section', SgSection);

declare global {
  interface HTMLElementTagNameMap {
    'sg-section': SgSection;
  }
}
