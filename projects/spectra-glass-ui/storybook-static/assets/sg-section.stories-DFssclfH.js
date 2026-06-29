import { b as c, i as T, a as z } from './iframe-CIO0rj-b.js';
import { n as g } from './property-BDX7J2XP.js';
import { e as B } from './class-map-BIM98jav.js';
import './preload-helper-Dp1pzeXC.js';
import './directive-CvdRHFdJ.js';
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */ const O = Symbol.for(''),
  H = (t) => {
    if ((t == null ? void 0 : t.r) === O) return t == null ? void 0 : t._$litStatic$;
  },
  N = (t) => ({ _$litStatic$: t, r: O }),
  $ = new Map(),
  R =
    (t) =>
    (e, ...n) => {
      const o = n.length;
      let s, d;
      const a = [],
        x = [];
      let u,
        i = 0,
        f = !1;
      for (; i < o;) {
        for (u = e[i]; i < o && ((d = n[i]), (s = H(d)) !== void 0);) ((u += s + e[++i]), (f = !0));
        (i !== o && x.push(d), a.push(u), i++);
      }
      if ((i === o && a.push(e[o]), f)) {
        const y = a.join('$$lit$$');
        ((e = $.get(y)) === void 0 && ((a.raw = a), $.set(y, (e = a))), (n = x));
      }
      return t(e, ...n);
    },
  X = R(c);
var q = Object.defineProperty,
  l = (t, e, n, o) => {
    for (var s = void 0, d = t.length - 1, a; d >= 0; d--) (a = t[d]) && (s = a(e, n, s) || s);
    return (s && q(e, n, s), s);
  };
const w = {
    none: '0',
    sm: 'var(--sg-section-padding-sm, 2rem)',
    md: 'var(--sg-section-padding-md, 4rem)',
    lg: 'var(--sg-section-padding-lg, 6rem)',
    xl: 'var(--sg-section-padding-xl, 8rem)',
  },
  S = {
    sm: 'var(--sg-max-width-sm, 640px)',
    md: 'var(--sg-max-width-md, 800px)',
    lg: 'var(--sg-max-width-lg, 1100px)',
    full: '100%',
  },
  v = class v extends T {
    constructor() {
      (super(...arguments),
        (this.padding = 'lg'),
        (this.maxWidth = 'lg'),
        (this.glass = !1),
        (this.accent = 'none'),
        (this.tag = 'section'));
    }
    render() {
      const e = w[this.padding] ?? w.lg,
        n = S[this.maxWidth] ?? S.lg,
        o = {
          section: !0,
          'section--glass': this.glass,
          'section--accent-top': this.accent === 'top' || this.accent === 'both',
          'section--accent-bottom': this.accent === 'bottom' || this.accent === 'both',
        },
        s = N(this.tag);
      return X`
      <style>
        .inner {
          max-width: ${n};
          padding-top: ${e};
          padding-bottom: ${e};
        }
      </style>
      <${s} class=${B(o)}>
        <div class="inner">
          <slot></slot>
        </div>
      </${s}>
    `;
    }
  };
v.styles = z`
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
let r = v;
l([g({ type: String })], r.prototype, 'padding');
l([g({ type: String, attribute: 'max-width' })], r.prototype, 'maxWidth');
l([g({ type: Boolean })], r.prototype, 'glass');
l([g({ type: String })], r.prototype, 'accent');
l([g({ type: String })], r.prototype, 'tag');
customElements.define('sg-section', r);
const U = {
    title: 'Components/SgSection',
    component: 'sg-section',
    argTypes: {
      padding: { control: 'select', options: ['none', 'sm', 'md', 'lg', 'xl'] },
      maxWidth: { control: 'select', options: ['sm', 'md', 'lg', 'full'] },
      glass: { control: 'boolean' },
      accent: { control: 'select', options: ['none', 'top', 'bottom', 'both'] },
    },
    parameters: {
      docs: {
        description: {
          component:
            'Responsive layout container with consistent padding, max-width, optional glass background, and decorative gradient accent edges.',
        },
      },
    },
  },
  p = {
    render: (t) => c`
    <sg-section
      padding=${t.padding || 'lg'}
      max-width=${t.maxWidth || 'lg'}
      ?glass=${t.glass ?? !1}
      accent=${t.accent || 'none'}
    >
      <div style="padding:2rem;background:rgba(255,255,255,0.05);border-radius:12px;text-align:center;">
        Section content
      </div>
    </sg-section>
  `,
    args: { padding: 'lg', maxWidth: 'lg', glass: !1, accent: 'none' },
  },
  m = {
    render: () => c`
    <sg-section glass>
      <div style="padding:2rem;text-align:center;">Glass section with blur</div>
    </sg-section>
  `,
  },
  b = {
    render: () => c`
    <sg-section accent="both" padding="md">
      <div style="padding:2rem;text-align:center;">Section with gradient top and bottom edges</div>
    </sg-section>
  `,
  },
  h = {
    render: () => c`
    <sg-section padding="sm" glass>
      <div style="text-align:center;">Small padding</div>
    </sg-section>
    <sg-section padding="xl" glass>
      <div style="text-align:center;">Extra-large padding</div>
    </sg-section>
  `,
  };
var W, k, _;
p.parameters = {
  ...p.parameters,
  docs: {
    ...((W = p.parameters) == null ? void 0 : W.docs),
    source: {
      originalSource: `{
  render: args => html\`
    <sg-section
      padding=\${args.padding || 'lg'}
      max-width=\${args.maxWidth || 'lg'}
      ?glass=\${args.glass ?? false}
      accent=\${args.accent || 'none'}
    >
      <div style="padding:2rem;background:rgba(255,255,255,0.05);border-radius:12px;text-align:center;">
        Section content
      </div>
    </sg-section>
  \`,
  args: {
    padding: 'lg',
    maxWidth: 'lg',
    glass: false,
    accent: 'none'
  }
}`,
      ...((_ = (k = p.parameters) == null ? void 0 : k.docs) == null ? void 0 : _.source),
    },
  },
};
var G, P, A;
m.parameters = {
  ...m.parameters,
  docs: {
    ...((G = m.parameters) == null ? void 0 : G.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <sg-section glass>
      <div style="padding:2rem;text-align:center;">Glass section with blur</div>
    </sg-section>
  \`
}`,
      ...((A = (P = m.parameters) == null ? void 0 : P.docs) == null ? void 0 : A.source),
    },
  },
};
var C, D, E;
b.parameters = {
  ...b.parameters,
  docs: {
    ...((C = b.parameters) == null ? void 0 : C.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <sg-section accent="both" padding="md">
      <div style="padding:2rem;text-align:center;">Section with gradient top and bottom edges</div>
    </sg-section>
  \`
}`,
      ...((E = (D = b.parameters) == null ? void 0 : D.docs) == null ? void 0 : E.source),
    },
  },
};
var I, j, M;
h.parameters = {
  ...h.parameters,
  docs: {
    ...((I = h.parameters) == null ? void 0 : I.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <sg-section padding="sm" glass>
      <div style="text-align:center;">Small padding</div>
    </sg-section>
    <sg-section padding="xl" glass>
      <div style="text-align:center;">Extra-large padding</div>
    </sg-section>
  \`
}`,
      ...((M = (j = h.parameters) == null ? void 0 : j.docs) == null ? void 0 : M.source),
    },
  },
};
const V = ['Default', 'Glass', 'WithAccent', 'PaddingCompare'];
export {
  p as Default,
  m as Glass,
  h as PaddingCompare,
  b as WithAccent,
  V as __namedExportsOrder,
  U as default,
};
