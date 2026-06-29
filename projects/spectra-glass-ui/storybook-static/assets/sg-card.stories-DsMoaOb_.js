var w = (e) => {
  throw TypeError(e);
};
var ae = (e, r, a) => r.has(e) || w('Cannot ' + a);
var S = (e, r, a) =>
  r.has(e)
    ? w('Cannot add the same private member more than once')
    : r instanceof WeakSet
      ? r.add(e)
      : r.set(e, a);
var c = (e, r, a) => (ae(e, r, 'access private method'), a);
import { i as re, a as de, b as d } from './iframe-CIO0rj-b.js';
import { n as x } from './property-BDX7J2XP.js';
import './preload-helper-Dp1pzeXC.js';
var te = Object.defineProperty,
  y = (e, r, a, t) => {
    for (var s = void 0, o = e.length - 1, k; o >= 0; o--) (k = e[o]) && (s = k(r, a, s) || s);
    return (s && te(r, a, s), s);
  },
  n,
  Y,
  Z,
  ee;
const $ = class $ extends re {
  constructor() {
    super();
    S(this, n);
    ((this.variant = 'elevated'),
      (this.padding = 'md'),
      (this.accent = !1),
      (this.selected = !1),
      (this.tabIndex = 0));
  }
  render() {
    const a = `card--${this.variant}`,
      t = `card--padding-${this.padding}`,
      s = this.accent ? 'card--accent' : '',
      o = this.selected ? 'card--selected' : '';
    return d`
      <div class="card ${a} ${t} ${s} ${o}">
        <div class="header" ?hidden=${!c(this, n, Y).call(this)}>
          <slot name="header"></slot>
        </div>

        <div class="body">
          <slot></slot>
        </div>

        <div class="footer" ?hidden=${!c(this, n, Z).call(this)}>
          <slot name="footer"></slot>
        </div>
      </div>
    `;
  }
  updated(a) {
    (a.has('variant') || a.has('padding') || a.has('accent') || a.has('selected')) &&
      c(this, n, ee).call(this);
  }
};
((n = new WeakSet()),
  (Y = function () {
    var t;
    const a = (t = this.shadowRoot) == null ? void 0 : t.querySelector('slot[name="header"]');
    return ((a == null ? void 0 : a.assignedNodes().length) ?? 0) > 0;
  }),
  (Z = function () {
    var t;
    const a = (t = this.shadowRoot) == null ? void 0 : t.querySelector('slot[name="footer"]');
    return ((a == null ? void 0 : a.assignedNodes().length) ?? 0) > 0;
  }),
  (ee = function () {
    requestAnimationFrame(() => {
      this.requestUpdate();
    });
  }),
  ($.styles = de`
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
  `));
let i = $;
y([x({ type: String, reflect: !0 })], i.prototype, 'variant');
y([x({ type: String, reflect: !0 })], i.prototype, 'padding');
y([x({ type: Boolean, reflect: !0, attribute: 'accent' })], i.prototype, 'accent');
y([x({ type: Boolean, reflect: !0 })], i.prototype, 'selected');
customElements.define('sg-card', i);
const ce = {
    title: 'Components/SgCard',
    component: 'sg-card',
    argTypes: {
      variant: { control: 'select', options: ['elevated', 'outlined', 'ghost'] },
      padding: { control: 'select', options: ['sm', 'md', 'lg'] },
      accent: { control: 'boolean' },
      selected: { control: 'boolean' },
    },
    parameters: {
      docs: {
        description: {
          component:
            'A glassmorphic card with spectral gradient interactions. Focus-visible shows a gradient ring, hover adds a spectral glow, and selected/accent render a gradient border.',
        },
      },
    },
  },
  l = {
    render: (e) => d`
    <sg-card
      variant=${e.variant || 'elevated'}
      padding=${e.padding || 'md'}
      ?accent=${e.accent ?? !1}
      ?selected=${e.selected ?? !1}
    >
      <div>This is the card body content.</div>
    </sg-card>
  `,
    args: { variant: 'elevated', padding: 'md', accent: !1, selected: !1 },
  },
  g = {
    render: (e) => d`
    <sg-card
      variant=${e.variant || 'elevated'}
      padding=${e.padding || 'md'}
      ?accent=${e.accent ?? !1}
      ?selected=${e.selected ?? !1}
    >
      <span slot="header">Card Title</span>
      <div>Body content goes here. The header is separated by a subtle divider.</div>
    </sg-card>
  `,
    args: { variant: 'elevated', padding: 'md', accent: !1, selected: !1 },
  },
  p = {
    render: (e) => d`
    <sg-card
      variant=${e.variant || 'elevated'}
      padding=${e.padding || 'md'}
      ?accent=${e.accent ?? !1}
      ?selected=${e.selected ?? !1}
    >
      <div>Main content area.</div>
      <span slot="footer">Updated 2 minutes ago</span>
    </sg-card>
  `,
    args: { variant: 'elevated', padding: 'md', accent: !1, selected: !1 },
  },
  v = {
    render: (e) => d`
    <sg-card
      variant=${e.variant || 'elevated'}
      padding=${e.padding || 'md'}
      ?accent=${e.accent ?? !1}
      ?selected=${e.selected ?? !1}
    >
      <span slot="header">Profile Card</span>
      <div style="display:flex;gap:16px;align-items:center;">
        <div
          style="width:48px;height:48px;border-radius:50%;background:var(--sg-gradient-spectral, linear-gradient(135deg,rgba(212,134,159,0.5),rgba(122,128,192,0.5)));flex-shrink:0;"
        ></div>
        <div>
          <div style="font-weight:600;">Alex Rivera</div>
          <div style="font-size:0.875rem;opacity:0.6;">Design Engineer</div>
        </div>
      </div>
      <span slot="footer" style="display:flex;gap:8px;justify-content:flex-end;">
        <button style="padding:6px 16px;border-radius:8px;border:1px solid var(--sg-glass-border, rgba(255,255,255,0.12));background:transparent;color:inherit;cursor:pointer;">Profile</button>
        <button style="padding:6px 16px;border-radius:8px;border:none;background:var(--sg-gradient-spectral, linear-gradient(135deg,rgba(212,134,159,0.5),rgba(122,128,192,0.5)));color:#fff;cursor:pointer;">Message</button>
      </span>
    </sg-card>
  `,
    args: { variant: 'elevated', padding: 'md', accent: !0, selected: !1 },
  },
  m = {
    render: () => d`
    <div style="display:flex;flex-direction:column;gap:16px;">
      <sg-card variant="elevated" padding="md">
        <div><strong>Elevated</strong> — glass surface + spectral glow on hover</div>
      </sg-card>
      <sg-card variant="outlined" padding="md">
        <div><strong>Outlined</strong> — transparent with subtle glow on hover</div>
      </sg-card>
      <sg-card variant="ghost" padding="md">
        <div><strong>Ghost</strong> — minimal, appears on hover</div>
      </sg-card>
    </div>
  `,
  },
  b = {
    render: () => d`
    <sg-card variant="elevated" padding="md" accent>
      <div>
        <strong>Spectral accent border</strong><br />
        A 1px gradient border overlay using the full spectrum.
      </div>
    </sg-card>
  `,
  },
  f = {
    render: () => d`
    <sg-card variant="elevated" padding="md" selected>
      <div>
        <strong>Selected state</strong><br />
        A thicker (1.5px) gradient border to indicate selection.
      </div>
    </sg-card>
  `,
  },
  u = {
    render: () => d`
    <div style="display:flex;flex-direction:column;gap:16px;">
      <sg-card variant="elevated" padding="md" selected>
        <div>Elevated — selected</div>
      </sg-card>
      <sg-card variant="outlined" padding="md" selected>
        <div>Outlined — selected</div>
      </sg-card>
      <sg-card variant="ghost" padding="md" selected>
        <div>Ghost — selected</div>
      </sg-card>
    </div>
  `,
  },
  h = {
    render: () => d`
    <div style="display:flex;flex-direction:column;gap:16px;">
      <sg-card variant="elevated" padding="sm">
        <div>Small padding (12px)</div>
      </sg-card>
      <sg-card variant="elevated" padding="md">
        <div>Medium padding (20px)</div>
      </sg-card>
      <sg-card variant="elevated" padding="lg">
        <div>Large padding (28px)</div>
      </sg-card>
    </div>
  `,
  };
var C, A, E;
l.parameters = {
  ...l.parameters,
  docs: {
    ...((C = l.parameters) == null ? void 0 : C.docs),
    source: {
      originalSource: `{
  render: args => html\`
    <sg-card
      variant=\${args.variant || 'elevated'}
      padding=\${args.padding || 'md'}
      ?accent=\${args.accent ?? false}
      ?selected=\${args.selected ?? false}
    >
      <div>This is the card body content.</div>
    </sg-card>
  \`,
  args: {
    variant: 'elevated',
    padding: 'md',
    accent: false,
    selected: false
  }
}`,
      ...((E = (A = l.parameters) == null ? void 0 : A.docs) == null ? void 0 : E.source),
    },
  },
};
var F, T, z;
g.parameters = {
  ...g.parameters,
  docs: {
    ...((F = g.parameters) == null ? void 0 : F.docs),
    source: {
      originalSource: `{
  render: args => html\`
    <sg-card
      variant=\${args.variant || 'elevated'}
      padding=\${args.padding || 'md'}
      ?accent=\${args.accent ?? false}
      ?selected=\${args.selected ?? false}
    >
      <span slot="header">Card Title</span>
      <div>Body content goes here. The header is separated by a subtle divider.</div>
    </sg-card>
  \`,
  args: {
    variant: 'elevated',
    padding: 'md',
    accent: false,
    selected: false
  }
}`,
      ...((z = (T = g.parameters) == null ? void 0 : T.docs) == null ? void 0 : z.source),
    },
  },
};
var B, M, O;
p.parameters = {
  ...p.parameters,
  docs: {
    ...((B = p.parameters) == null ? void 0 : B.docs),
    source: {
      originalSource: `{
  render: args => html\`
    <sg-card
      variant=\${args.variant || 'elevated'}
      padding=\${args.padding || 'md'}
      ?accent=\${args.accent ?? false}
      ?selected=\${args.selected ?? false}
    >
      <div>Main content area.</div>
      <span slot="footer">Updated 2 minutes ago</span>
    </sg-card>
  \`,
  args: {
    variant: 'elevated',
    padding: 'md',
    accent: false,
    selected: false
  }
}`,
      ...((O = (M = p.parameters) == null ? void 0 : M.docs) == null ? void 0 : O.source),
    },
  },
};
var P, G, V;
v.parameters = {
  ...v.parameters,
  docs: {
    ...((P = v.parameters) == null ? void 0 : P.docs),
    source: {
      originalSource: `{
  render: args => html\`
    <sg-card
      variant=\${args.variant || 'elevated'}
      padding=\${args.padding || 'md'}
      ?accent=\${args.accent ?? false}
      ?selected=\${args.selected ?? false}
    >
      <span slot="header">Profile Card</span>
      <div style="display:flex;gap:16px;align-items:center;">
        <div
          style="width:48px;height:48px;border-radius:50%;background:var(--sg-gradient-spectral, linear-gradient(135deg,rgba(212,134,159,0.5),rgba(122,128,192,0.5)));flex-shrink:0;"
        ></div>
        <div>
          <div style="font-weight:600;">Alex Rivera</div>
          <div style="font-size:0.875rem;opacity:0.6;">Design Engineer</div>
        </div>
      </div>
      <span slot="footer" style="display:flex;gap:8px;justify-content:flex-end;">
        <button style="padding:6px 16px;border-radius:8px;border:1px solid var(--sg-glass-border, rgba(255,255,255,0.12));background:transparent;color:inherit;cursor:pointer;">Profile</button>
        <button style="padding:6px 16px;border-radius:8px;border:none;background:var(--sg-gradient-spectral, linear-gradient(135deg,rgba(212,134,159,0.5),rgba(122,128,192,0.5)));color:#fff;cursor:pointer;">Message</button>
      </span>
    </sg-card>
  \`,
  args: {
    variant: 'elevated',
    padding: 'md',
    accent: true,
    selected: false
  }
}`,
      ...((V = (G = v.parameters) == null ? void 0 : G.docs) == null ? void 0 : V.source),
    },
  },
};
var _, q, D;
m.parameters = {
  ...m.parameters,
  docs: {
    ...((_ = m.parameters) == null ? void 0 : _.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <div style="display:flex;flex-direction:column;gap:16px;">
      <sg-card variant="elevated" padding="md">
        <div><strong>Elevated</strong> — glass surface + spectral glow on hover</div>
      </sg-card>
      <sg-card variant="outlined" padding="md">
        <div><strong>Outlined</strong> — transparent with subtle glow on hover</div>
      </sg-card>
      <sg-card variant="ghost" padding="md">
        <div><strong>Ghost</strong> — minimal, appears on hover</div>
      </sg-card>
    </div>
  \`
}`,
      ...((D = (q = m.parameters) == null ? void 0 : q.docs) == null ? void 0 : D.source),
    },
  },
};
var H, R, W;
b.parameters = {
  ...b.parameters,
  docs: {
    ...((H = b.parameters) == null ? void 0 : H.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <sg-card variant="elevated" padding="md" accent>
      <div>
        <strong>Spectral accent border</strong><br />
        A 1px gradient border overlay using the full spectrum.
      </div>
    </sg-card>
  \`
}`,
      ...((W = (R = b.parameters) == null ? void 0 : R.docs) == null ? void 0 : W.source),
    },
  },
};
var j, U, I;
f.parameters = {
  ...f.parameters,
  docs: {
    ...((j = f.parameters) == null ? void 0 : j.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <sg-card variant="elevated" padding="md" selected>
      <div>
        <strong>Selected state</strong><br />
        A thicker (1.5px) gradient border to indicate selection.
      </div>
    </sg-card>
  \`
}`,
      ...((I = (U = f.parameters) == null ? void 0 : U.docs) == null ? void 0 : I.source),
    },
  },
};
var L, N, J;
u.parameters = {
  ...u.parameters,
  docs: {
    ...((L = u.parameters) == null ? void 0 : L.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <div style="display:flex;flex-direction:column;gap:16px;">
      <sg-card variant="elevated" padding="md" selected>
        <div>Elevated — selected</div>
      </sg-card>
      <sg-card variant="outlined" padding="md" selected>
        <div>Outlined — selected</div>
      </sg-card>
      <sg-card variant="ghost" padding="md" selected>
        <div>Ghost — selected</div>
      </sg-card>
    </div>
  \`
}`,
      ...((J = (N = u.parameters) == null ? void 0 : N.docs) == null ? void 0 : J.source),
    },
  },
};
var K, Q, X;
h.parameters = {
  ...h.parameters,
  docs: {
    ...((K = h.parameters) == null ? void 0 : K.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <div style="display:flex;flex-direction:column;gap:16px;">
      <sg-card variant="elevated" padding="sm">
        <div>Small padding (12px)</div>
      </sg-card>
      <sg-card variant="elevated" padding="md">
        <div>Medium padding (20px)</div>
      </sg-card>
      <sg-card variant="elevated" padding="lg">
        <div>Large padding (28px)</div>
      </sg-card>
    </div>
  \`
}`,
      ...((X = (Q = h.parameters) == null ? void 0 : Q.docs) == null ? void 0 : X.source),
    },
  },
};
const le = [
  'Default',
  'WithHeader',
  'WithFooter',
  'FullComposition',
  'Variants',
  'AccentBorder',
  'Selected',
  'SelectedVariants',
  'PaddingSizes',
];
export {
  b as AccentBorder,
  l as Default,
  v as FullComposition,
  h as PaddingSizes,
  f as Selected,
  u as SelectedVariants,
  m as Variants,
  p as WithFooter,
  g as WithHeader,
  le as __namedExportsOrder,
  ce as default,
};
