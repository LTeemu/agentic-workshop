import { A as p, i as d, a as c, b as g } from './iframe-CIO0rj-b.js';
import { n as e } from './property-BDX7J2XP.js';
import { e as u } from './class-map-BIM98jav.js';
import { f as h, s as v } from './shared-C_d8Ah3H.js';
import './sg-spinner-jN4t8AzK.js';
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */ const f = (s) => s ?? p;
var y = Object.defineProperty,
  a = (s, n, b, m) => {
    for (var r = void 0, o = s.length - 1, l; o >= 0; o--) (l = s[o]) && (r = l(n, b, r) || r);
    return (r && y(n, b, r), r);
  };
const i = class i extends d {
  constructor() {
    (super(...arguments),
      (this.variant = 'primary'),
      (this.size = 'md'),
      (this.disabled = !1),
      (this.loading = !1),
      (this.type = 'button'));
  }
  render() {
    const n = u({
      btn: !0,
      [`btn--${this.variant}`]: !0,
      [`btn--${this.size}`]: !0,
      'btn--loading': this.loading,
    });
    return g`
      <button
        class=${n}
        type=${this.type}
        ?disabled=${this.disabled || this.loading}
        aria-busy=${f(this.loading ? 'true' : void 0)}
      >
        <span class="btn__label"><slot></slot></span>
        ${this.loading ? g`<span class="btn__spinner"><sg-spinner size="sm" variant="glass"></sg-spinner></span>` : ''}
      </button>
    `;
  }
};
i.styles = c`
    :host {
      display: inline-block;
      position: relative;
      outline: none;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
    }

    ${h}

    /* ═══ Shared button base ═══ */
    .btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: 1px solid transparent;
      border-radius: var(--sg-button-radius, var(--sg-radius-md, 12px));
      font-family: inherit;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      text-decoration: none;
      line-height: 1;
      -webkit-appearance: none;
      appearance: none;
      ${v}
    }

    .btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      pointer-events: none;
    }

    .btn::-moz-focus-inner {
      border: 0;
    }

    /* ─── Sizes ─── */

    .btn--sm {
      padding: 6px 14px;
      font-size: 0.8125rem;
      height: 32px;
    }

    .btn--md {
      padding: 10px 20px;
      font-size: 0.875rem;
      height: 40px;
    }

    .btn--lg {
      padding: 14px 28px;
      font-size: 1rem;
      height: 48px;
    }

    /* ─── Variants ─── */

    .btn--primary {
      background: var(
        --sg-button-primary-bg,
        var(
          --sg-gradient-spectral-strong,
          var(
            --sg-gradient-spectral,
            linear-gradient(135deg, rgba(212, 134, 159, 0.75), rgba(196, 160, 80, 0.75), rgba(127, 168, 141, 0.75), rgba(122, 128, 192, 0.75))
          )
        )
      );
      color: #fff;
      border-color: transparent;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    }

    .btn--primary:hover:not(:disabled) {
      filter: brightness(1.1);
      box-shadow:
        0 4px 20px rgba(218, 119, 242, 0.25),
        0 0 40px rgba(77, 171, 247, 0.15);
    }

    .btn--primary:active:not(:disabled) {
      filter: brightness(0.95);
      transform: scale(0.98);
    }

    .btn--secondary {
      background: var(--sg-glass-bg, rgba(255, 255, 255, 0.08));
      backdrop-filter: var(--sg-glass-blur, blur(20px));
      -webkit-backdrop-filter: var(--sg-glass-blur, blur(20px));
      border-color: var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
    }

    .btn--secondary:hover:not(:disabled) {
      border-color: var(--sg-glass-border-hover, rgba(255, 255, 255, 0.25));
      background: var(--sg-glass-bg-hover, rgba(255, 255, 255, 0.14));
      box-shadow:
        0 0 20px rgba(218, 119, 242, 0.06),
        0 0 40px rgba(77, 171, 247, 0.04);
    }

    .btn--secondary:active:not(:disabled) {
      background: var(--sg-glass-bg-active, rgba(255, 255, 255, 0.18));
    }

    .btn--ghost {
      background: transparent;
      border-color: transparent;
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
    }

    .btn--ghost:hover:not(:disabled) {
      background: var(--sg-glass-bg-hover, rgba(255, 255, 255, 0.14));
    }

    .btn--ghost:active:not(:disabled) {
      background: var(--sg-glass-bg-active, rgba(255, 255, 255, 0.18));
    }

    /* ─── Loading ─── */

    .btn--loading {
      pointer-events: none;
      position: relative;
    }

    .btn--loading .btn__label {
      opacity: 0;
    }

    .btn__spinner {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `;
let t = i;
a([e({ type: String, reflect: !0 })], t.prototype, 'variant');
a([e({ type: String, reflect: !0 })], t.prototype, 'size');
a([e({ type: Boolean, reflect: !0 })], t.prototype, 'disabled');
a([e({ type: Boolean, reflect: !0 })], t.prototype, 'loading');
a([e({ type: String })], t.prototype, 'type');
customElements.define('sg-button', t);
