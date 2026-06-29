var u = (a) => {
  throw TypeError(a);
};
var V = (a, e, r) => e.has(a) || u('Cannot ' + r);
var f = (a, e, r) =>
  e.has(a)
    ? u('Cannot add the same private member more than once')
    : e instanceof WeakSet
      ? e.add(a)
      : e.set(a, r);
var x = (a, e, r) => (V(a, e, 'access private method'), r);
import { i as j, a as L, b as t } from './iframe-CIO0rj-b.js';
import { n as c } from './property-BDX7J2XP.js';
import { e as M } from './class-map-BIM98jav.js';
import './preload-helper-Dp1pzeXC.js';
import './directive-CvdRHFdJ.js';
var O = Object.defineProperty,
  p = (a, e, r, R) => {
    for (var s = void 0, b = a.length - 1, v; b >= 0; b--) (v = a[b]) && (s = v(e, r, s) || s);
    return (s && O(e, r, s), s);
  },
  l,
  P;
const m = class m extends j {
  constructor() {
    super(...arguments);
    f(this, l);
    ((this.variant = 'default'), (this.size = 'md'), (this.removable = !1));
  }
  render() {
    const r = M({ badge: !0, [`badge--${this.variant}`]: !0, [`badge--${this.size}`]: !0 });
    return t`
      <span class=${r}>
        <span class="badge__dot"></span>
        <span><slot></slot></span>
        ${
          this.removable
            ? t`
              <button
                class="badge__dismiss"
                @click=${x(this, l, P)}
                aria-label="Dismiss"
                part="dismiss-button"
              >
                ×
              </button>
            `
            : ''
        }
      </span>
    `;
  }
};
((l = new WeakSet()),
  (P = function (r) {
    (r.stopPropagation(),
      this.dispatchEvent(new CustomEvent('dismiss', { bubbles: !0, composed: !0 })));
  }),
  (m.styles = L`
    :host {
      display: inline-flex;
      position: relative;
      outline: none;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border-radius: var(--sg-badge-radius, var(--sg-radius-full, 9999px));
      font-weight: 600;
      line-height: 1;
      white-space: nowrap;
      transition:
        background var(--sg-transition-base, 250ms ease),
        box-shadow var(--sg-transition-base, 250ms ease);
    }

    /* ─── Sizes ─── */

    .badge--sm {
      padding: 3px 10px;
      font-size: var(--sg-badge-font-size-sm, 0.6875rem);
    }

    .badge--md {
      padding: 5px 14px;
      font-size: var(--sg-badge-font-size-md, 0.75rem);
    }

    /* ─── Variants ─── */

    .badge--default {
      background: var(--sg-glass-bg, rgba(255, 255, 255, 0.08));
      backdrop-filter: var(--sg-glass-blur, blur(20px));
      -webkit-backdrop-filter: var(--sg-glass-blur, blur(20px));
      border: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
    }

    .badge--success {
      background: color-mix(in srgb, var(--sg-spectral-sage, #7fa88d) 70%, transparent);
      color: #fff;
    }

    .badge--warning {
      background: color-mix(in srgb, var(--sg-spectral-gold, #c4a050) 70%, transparent);
      color: #1a1a1a;
    }

    .badge--error {
      background: color-mix(in srgb, var(--sg-spectral-rose, #d4869f) 70%, transparent);
      color: #fff;
    }

    .badge--info {
      background: color-mix(in srgb, var(--sg-spectral-teal, #6fa0b5) 70%, transparent);
      color: #fff;
    }

    .badge--spectral {
      background: var(
        --sg-gradient-spectral,
        linear-gradient(135deg, rgba(212, 134, 159, 0.5), rgba(196, 160, 80, 0.5), rgba(127, 168, 141, 0.5), rgba(122, 128, 192, 0.5))
      );
      color: #fff;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    }

    /* ─── Dot indicator ─── */

    .badge__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .badge--default .badge__dot {
      background: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
    }

    .badge--success .badge__dot {
      background: var(--sg-spectral-sage, #7fa88d);
    }

    .badge--warning .badge__dot {
      background: var(--sg-spectral-gold, #c4a050);
    }

    .badge--error .badge__dot {
      background: var(--sg-spectral-rose, #d4869f);
    }

    .badge--info .badge__dot {
      background: var(--sg-spectral-teal, #6fa0b5);
    }

    .badge--spectral .badge__dot {
      background: rgba(255, 255, 255, 0.7);
    }

    /* ─── Dismiss ─── */

    .badge__dismiss {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      border: none;
      background: transparent;
      color: inherit;
      cursor: pointer;
      opacity: 0.6;
      font-size: inherit;
      padding: 0;
      margin-left: 2px;
      border-radius: 50%;
      transition: opacity var(--sg-transition-fast, 150ms ease);
    }

    .badge__dismiss:hover {
      opacity: 1;
    }
  `));
let n = m;
p([c({ type: String, reflect: !0 })], n.prototype, 'variant');
p([c({ type: String, reflect: !0 })], n.prototype, 'size');
p([c({ type: Boolean, reflect: !0 })], n.prototype, 'removable');
customElements.define('sg-badge', n);
const G = {
    title: 'Components/SgBadge',
    component: 'sg-badge',
    argTypes: {
      variant: {
        control: 'select',
        options: ['default', 'success', 'warning', 'error', 'info', 'spectral'],
      },
      size: { control: 'select', options: ['sm', 'md'] },
      removable: { control: 'boolean' },
    },
    parameters: {
      docs: {
        description: {
          component: 'A small badge/chip with spectral color variants and optional dismiss.',
        },
      },
    },
  },
  g = {
    render: (a) => t`
    <sg-badge
      variant=${a.variant || 'default'}
      size=${a.size || 'md'}
      ?removable=${a.removable}
    >
      Label
    </sg-badge>
  `,
    args: { variant: 'default', size: 'md', removable: !1 },
  },
  i = {
    render: () => t`
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <sg-badge variant="default">Default</sg-badge>
      <sg-badge variant="success">Success</sg-badge>
      <sg-badge variant="warning">Warning</sg-badge>
      <sg-badge variant="error">Error</sg-badge>
      <sg-badge variant="info">Info</sg-badge>
      <sg-badge variant="spectral">Spectral</sg-badge>
    </div>
  `,
  },
  d = {
    render: () => t`
    <div style="display:flex;align-items:center;gap:8px;">
      <sg-badge variant="spectral" size="sm">Small</sg-badge>
      <sg-badge variant="spectral" size="md">Medium</sg-badge>
    </div>
  `,
  },
  o = {
    render: () => t`
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <sg-badge variant="default" removable>Default</sg-badge>
      <sg-badge variant="success" removable>Success</sg-badge>
      <sg-badge variant="error" removable>Error</sg-badge>
      <sg-badge variant="spectral" removable>Spectral</sg-badge>
    </div>
  `,
  };
var h, y, _;
g.parameters = {
  ...g.parameters,
  docs: {
    ...((h = g.parameters) == null ? void 0 : h.docs),
    source: {
      originalSource: `{
  render: args => html\`
    <sg-badge
      variant=\${args.variant || 'default'}
      size=\${args.size || 'md'}
      ?removable=\${args.removable}
    >
      Label
    </sg-badge>
  \`,
  args: {
    variant: 'default',
    size: 'md',
    removable: false
  }
}`,
      ...((_ = (y = g.parameters) == null ? void 0 : y.docs) == null ? void 0 : _.source),
    },
  },
};
var w, z, k;
i.parameters = {
  ...i.parameters,
  docs: {
    ...((w = i.parameters) == null ? void 0 : w.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <sg-badge variant="default">Default</sg-badge>
      <sg-badge variant="success">Success</sg-badge>
      <sg-badge variant="warning">Warning</sg-badge>
      <sg-badge variant="error">Error</sg-badge>
      <sg-badge variant="info">Info</sg-badge>
      <sg-badge variant="spectral">Spectral</sg-badge>
    </div>
  \`
}`,
      ...((k = (z = i.parameters) == null ? void 0 : z.docs) == null ? void 0 : k.source),
    },
  },
};
var S, $, D;
d.parameters = {
  ...d.parameters,
  docs: {
    ...((S = d.parameters) == null ? void 0 : S.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <div style="display:flex;align-items:center;gap:8px;">
      <sg-badge variant="spectral" size="sm">Small</sg-badge>
      <sg-badge variant="spectral" size="md">Medium</sg-badge>
    </div>
  \`
}`,
      ...((D = ($ = d.parameters) == null ? void 0 : $.docs) == null ? void 0 : D.source),
    },
  },
};
var E, C, I;
o.parameters = {
  ...o.parameters,
  docs: {
    ...((E = o.parameters) == null ? void 0 : E.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <sg-badge variant="default" removable>Default</sg-badge>
      <sg-badge variant="success" removable>Success</sg-badge>
      <sg-badge variant="error" removable>Error</sg-badge>
      <sg-badge variant="spectral" removable>Spectral</sg-badge>
    </div>
  \`
}`,
      ...((I = (C = o.parameters) == null ? void 0 : C.docs) == null ? void 0 : I.source),
    },
  },
};
const H = ['Default', 'Variants', 'Sizes', 'Removable'];
export {
  g as Default,
  o as Removable,
  d as Sizes,
  i as Variants,
  H as __namedExportsOrder,
  G as default,
};
