import { LitElement, html, css, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

/**
 * Circular avatar with image, initials fallback, and optional status dot.
 *
 * @cssprop [--sg-avatar-size=40px] - Avatar diameter (each `size` maps to a default).
 * @cssprop [--sg-avatar-bg=var(--sg-glass-bg)] - Fallback background colour.
 * @cssprop [--sg-avatar-color=var(--sg-text-primary)] - Fallback initials colour.
 */
export class SgAvatar extends LitElement {
  static override styles = css`
    :host {
      display: inline-flex;
      position: relative;
      flex-shrink: 0;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
    }

    .avatar {
      width: var(--sg-avatar-size, 40px);
      height: var(--sg-avatar-size, 40px);
      border-radius: 50%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--sg-avatar-bg, var(--sg-glass-bg, rgba(255, 255, 255, 0.08)));
      backdrop-filter: var(--sg-glass-blur-sm, blur(12px));
      -webkit-backdrop-filter: var(--sg-glass-blur-sm, blur(12px));
      border: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      color: var(--sg-avatar-color, var(--sg-text-primary, rgba(255, 255, 255, 0.9)));
      font-weight: 600;
      font-size: calc(var(--sg-avatar-size, 40px) * 0.35);
      line-height: 1;
      user-select: none;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* ─── Status dot ─── */

    .status {
      position: absolute;
      bottom: 0;
      right: 0;
      width: calc(var(--sg-avatar-size, 40px) * 0.28);
      height: calc(var(--sg-avatar-size, 40px) * 0.28);
      border-radius: 50%;
      border: 2px solid var(--sg-avatar-dot-border, var(--sg-glass-bg, rgba(255, 255, 255, 0.08)));
      background: var(--sg-avatar-dot-bg, #4ade80);
    }

    .status--away {
      background: var(--sg-avatar-dot-away, #fbbf24);
    }
  `;

  /** Image URL. Omit to show initials fallback. */
  @property({ type: String })
  src: string = '';

  /** Alt text for the image. */
  @property({ type: String })
  alt: string = '';

  /**
   * Avatar size.
   * @default 'md'
   */
  @property({ type: String })
  size: 'sm' | 'md' | 'lg' | 'xl' = 'md';

  /** Fallback initials shown when no `src` or on image error. */
  @property({ type: String })
  initials: string = '';

  /**
   * Status indicator dot.
   * - `''` (empty): hidden
   * - `'online'`: green dot
   * - `'away'`: yellow dot
   */
  @property({ type: String })
  status: '' | 'online' | 'away' = '';

  @state()
  private _imgError = false;

  private readonly SIZE_MAP: Record<string, string> = {
    sm: '32px',
    md: '40px',
    lg: '56px',
    xl: '80px',
  };

  override render(): TemplateResult {
    const sizePx = this.SIZE_MAP[this.size] ?? '40px';
    const showImg = this.src && !this._imgError;
    const statusClasses = {
      status: true,
      'status--away': this.status === 'away',
    };

    return html`
      <style>
        :host {
          --sg-avatar-size: ${sizePx};
        }
      </style>
      <div class="avatar" role="img" aria-label=${this.alt || this.initials || 'avatar'}>
        ${showImg
          ? html`<img
              src=${this.src}
              alt=${this.alt}
              @error=${this.#onImgError}
            />`
          : html`<span>${this.initials}</span>`}
      </div>
      ${this.status ? html`<span class=${classMap(statusClasses)}></span>` : ''}
    `;
  }

  #onImgError(): void {
    this._imgError = true;
  }
}

customElements.define('sg-avatar', SgAvatar);

declare global {
  interface HTMLElementTagNameMap {
    'sg-avatar': SgAvatar;
  }
}
