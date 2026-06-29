var v = (e) => {
  throw TypeError(e);
};
var K = (e, t, l) => t.has(e) || v('Cannot ' + l);
var x = (e, t, l) =>
  t.has(e)
    ? v('Cannot add the same private member more than once')
    : t instanceof WeakSet
      ? t.add(e)
      : t.set(e, l);
var i = (e, t, l) => (K(e, t, 'access private method'), l);
import { i as N, a as U, b as r } from './iframe-CIO0rj-b.js';
import { n as b } from './property-BDX7J2XP.js';
import { e as X } from './class-map-BIM98jav.js';
import { f as Y, s as y } from './shared-C_d8Ah3H.js';
import './preload-helper-Dp1pzeXC.js';
import './directive-CvdRHFdJ.js';
var j = Object.defineProperty,
  h = (e, t, l, p) => {
    for (var o = void 0, k = e.length - 1, u; k >= 0; k--) (u = e[k]) && (o = u(t, l, o) || o);
    return (o && j(t, l, o), o);
  },
  s,
  z,
  B,
  f;
const m = class m extends N {
  constructor() {
    super(...arguments);
    x(this, s);
    ((this.checked = !1), (this.disabled = !1), (this.label = ''), (this.labelPosition = 'right'));
  }
  render() {
    const l = X({ track: !0, 'track--checked': this.checked }),
      p = this.label ? r`<span class="label">${this.label}</span>` : '';
    return r`
      ${this.labelPosition === 'left' ? p : ''}
      <div
        class=${l}
        role="switch"
        aria-checked=${this.checked ? 'true' : 'false'}
        tabindex=${this.disabled ? '-1' : '0'}
        @click=${i(this, s, z)}
        @keydown=${i(this, s, B)}
      >
        <span class="knob"></span>
      </div>
      ${this.labelPosition === 'right' ? p : ''}
    `;
  }
};
((s = new WeakSet()),
  (z = function () {
    this.disabled || ((this.checked = !this.checked), i(this, s, f).call(this));
  }),
  (B = function (l) {
    this.disabled ||
      ((l.key === ' ' || l.key === 'Enter') &&
        (l.preventDefault(), (this.checked = !this.checked), i(this, s, f).call(this)));
  }),
  (f = function () {
    this.dispatchEvent(
      new CustomEvent('change', { detail: { checked: this.checked }, bubbles: !0, composed: !0 }),
    );
  }),
  (m.styles = U`
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

    ${Y}

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
      ${y}
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
      ${y}
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
  `));
let a = m;
h([b({ type: Boolean, reflect: !0 })], a.prototype, 'checked');
h([b({ type: Boolean, reflect: !0 })], a.prototype, 'disabled');
h([b({ type: String })], a.prototype, 'label');
h([b({ type: String, attribute: 'label-position' })], a.prototype, 'labelPosition');
customElements.define('sg-toggle', a);
const M = {
    title: 'Components/SgToggle',
    component: 'sg-toggle',
    argTypes: {
      checked: { control: 'boolean' },
      disabled: { control: 'boolean' },
      label: { control: 'text' },
      labelPosition: { control: 'select', options: ['left', 'right'] },
    },
    parameters: {
      docs: {
        description: {
          component:
            'A toggle switch with spectral gradient active track. Supports keyboard interaction (Space/Enter) and emits a `change` event.',
        },
      },
    },
  },
  g = {
    render: (e) => r`
    <sg-toggle
      ?checked=${e.checked}
      ?disabled=${e.disabled}
      label=${e.label || 'Toggle me'}
      label-position=${e.labelPosition || 'right'}
    ></sg-toggle>
  `,
    args: { checked: !1, disabled: !1, label: 'Toggle me', labelPosition: 'right' },
  },
  n = {
    render: (e) => r`
    <sg-toggle
      ?checked=${e.checked}
      ?disabled=${e.disabled}
      label=${e.label || 'Active'}
      label-position=${e.labelPosition || 'right'}
    ></sg-toggle>
  `,
    args: { checked: !0, disabled: !1, label: 'Active', labelPosition: 'right' },
  },
  c = {
    render: () => r`
    <div style="display:flex;flex-direction:column;gap:16px;">
      <sg-toggle label="Label on right" label-position="right" checked></sg-toggle>
      <sg-toggle label="Label on left" label-position="left" checked></sg-toggle>
      <sg-toggle label="No label"></sg-toggle>
    </div>
  `,
  },
  d = {
    render: () => r`
    <div style="display:flex;flex-direction:column;gap:16px;">
      <sg-toggle label="Unchecked"></sg-toggle>
      <sg-toggle label="Checked" checked></sg-toggle>
      <sg-toggle label="Disabled unchecked" disabled></sg-toggle>
      <sg-toggle label="Disabled checked" disabled checked></sg-toggle>
    </div>
  `,
  };
var $, P, w;
g.parameters = {
  ...g.parameters,
  docs: {
    ...(($ = g.parameters) == null ? void 0 : $.docs),
    source: {
      originalSource: `{
  render: args => html\`
    <sg-toggle
      ?checked=\${args.checked}
      ?disabled=\${args.disabled}
      label=\${args.label || 'Toggle me'}
      label-position=\${args.labelPosition || 'right'}
    ></sg-toggle>
  \`,
  args: {
    checked: false,
    disabled: false,
    label: 'Toggle me',
    labelPosition: 'right'
  }
}`,
      ...((w = (P = g.parameters) == null ? void 0 : P.docs) == null ? void 0 : w.source),
    },
  },
};
var S, C, E;
n.parameters = {
  ...n.parameters,
  docs: {
    ...((S = n.parameters) == null ? void 0 : S.docs),
    source: {
      originalSource: `{
  render: args => html\`
    <sg-toggle
      ?checked=\${args.checked}
      ?disabled=\${args.disabled}
      label=\${args.label || 'Active'}
      label-position=\${args.labelPosition || 'right'}
    ></sg-toggle>
  \`,
  args: {
    checked: true,
    disabled: false,
    label: 'Active',
    labelPosition: 'right'
  }
}`,
      ...((E = (C = n.parameters) == null ? void 0 : C.docs) == null ? void 0 : E.source),
    },
  },
};
var L, T, O;
c.parameters = {
  ...c.parameters,
  docs: {
    ...((L = c.parameters) == null ? void 0 : L.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <div style="display:flex;flex-direction:column;gap:16px;">
      <sg-toggle label="Label on right" label-position="right" checked></sg-toggle>
      <sg-toggle label="Label on left" label-position="left" checked></sg-toggle>
      <sg-toggle label="No label"></sg-toggle>
    </div>
  \`
}`,
      ...((O = (T = c.parameters) == null ? void 0 : T.docs) == null ? void 0 : O.source),
    },
  },
};
var A, D, _;
d.parameters = {
  ...d.parameters,
  docs: {
    ...((A = d.parameters) == null ? void 0 : A.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <div style="display:flex;flex-direction:column;gap:16px;">
      <sg-toggle label="Unchecked"></sg-toggle>
      <sg-toggle label="Checked" checked></sg-toggle>
      <sg-toggle label="Disabled unchecked" disabled></sg-toggle>
      <sg-toggle label="Disabled checked" disabled checked></sg-toggle>
    </div>
  \`
}`,
      ...((_ = (D = d.parameters) == null ? void 0 : D.docs) == null ? void 0 : _.source),
    },
  },
};
const Q = ['Off', 'On', 'LabelPositions', 'States'];
export {
  c as LabelPositions,
  g as Off,
  n as On,
  d as States,
  Q as __namedExportsOrder,
  M as default,
};
