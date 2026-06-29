import { i as l, a as g, b as c } from './iframe-CIO0rj-b.js';
import { n as p } from './property-BDX7J2XP.js';
import { e as h } from './class-map-BIM98jav.js';
var b = Object.defineProperty,
  d = (n, s, a, v) => {
    for (var r = void 0, t = n.length - 1, o; t >= 0; t--) (o = n[t]) && (r = o(s, a, r) || r);
    return (r && b(s, a, r), r);
  };
const i = class i extends l {
  constructor() {
    (super(...arguments), (this.size = 'md'), (this.variant = 'spectral'));
  }
  render() {
    const s = h({ spinner: !0, [`spinner--${this.size}`]: !0, [`spinner--${this.variant}`]: !0 });
    return c`<span class=${s} role="status" aria-label="Loading"></span>`;
  }
};
i.styles = g`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .spinner {
      border-radius: 50%;
      animation: sg-spin var(--sg-spinner-speed, 0.8s) linear infinite;
    }

    /* ─── Sizes ─── */

    .spinner--sm {
      width: var(--sg-spinner-width-sm, 16px);
      height: var(--sg-spinner-width-sm, 16px);
      border-width: 2px;
    }

    .spinner--md {
      width: var(--sg-spinner-width-md, 24px);
      height: var(--sg-spinner-width-md, 24px);
      border-width: 3px;
    }

    .spinner--lg {
      width: var(--sg-spinner-width-lg, 40px);
      height: var(--sg-spinner-width-lg, 40px);
      border-width: 4px;
    }

    /* ─── Variants ─── */

    .spinner--spectral {
      border-style: solid;
      border-color: var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      border-top-color: var(--sg-spectral-rose, #d4869f);
      border-right-color: var(--sg-spectral-gold, #c4a050);
      border-bottom-color: var(--sg-spectral-sage, #7fa88d);
      border-left-color: var(--sg-spectral-violet, #9a7ab5);
    }

    .spinner--glass {
      border-style: solid;
      border-color: var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      border-top-color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
    }

    @keyframes sg-spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;
let e = i;
d([p({ type: String, reflect: !0 })], e.prototype, 'size');
d([p({ type: String, reflect: !0 })], e.prototype, 'variant');
customElements.define('sg-spinner', e);
