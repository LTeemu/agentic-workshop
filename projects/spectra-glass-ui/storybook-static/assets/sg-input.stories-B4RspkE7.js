var E = (e) => {
  throw TypeError(e);
};
var N = (e, r, t) => r.has(e) || E('Cannot ' + t);
var T = (e, r, t) =>
  r.has(e)
    ? E('Cannot add the same private member more than once')
    : r instanceof WeakSet
      ? r.add(e)
      : r.set(e, t);
var y = (e, r, t) => (N(e, r, 'access private method'), t);
import { r as Y, E as u, A as j, p as q, i as H, a as K, b as n } from './iframe-CIO0rj-b.js';
import { n as s } from './property-BDX7J2XP.js';
import { e as M } from './class-map-BIM98jav.js';
import { e as Q, i as X, t as d } from './directive-CvdRHFdJ.js';
import { s as Z, g as ee } from './shared-C_d8Ah3H.js';
import './preload-helper-Dp1pzeXC.js';
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */ const re = Q(
  class extends X {
    constructor(e) {
      if (
        (super(e),
        e.type !== d.PROPERTY && e.type !== d.ATTRIBUTE && e.type !== d.BOOLEAN_ATTRIBUTE)
      )
        throw Error('The `live` directive is not allowed on child or event bindings');
      if (!Y(e)) throw Error('`live` bindings can only contain a single expression');
    }
    render(e) {
      return e;
    }
    update(e, [r]) {
      if (r === u || r === j) return r;
      const t = e.element,
        o = e.name;
      if (e.type === d.PROPERTY) {
        if (r === t[o]) return u;
      } else if (e.type === d.BOOLEAN_ATTRIBUTE) {
        if (!!r === t.hasAttribute(o)) return u;
      } else if (e.type === d.ATTRIBUTE && t.getAttribute(o) === r + '') return u;
      return (q(e), r);
    }
  },
);
var te = Object.defineProperty,
  l = (e, r, t, o) => {
    for (var i = void 0, v = e.length - 1, $; v >= 0; v--) ($ = e[v]) && (i = $(r, t, i) || i);
    return (i && te(r, t, i), i);
  },
  p,
  F,
  J;
const x = class x extends H {
  constructor() {
    super(...arguments);
    T(this, p);
    ((this.label = ''),
      (this.placeholder = ''),
      (this.value = ''),
      (this.type = 'text'),
      (this.variant = 'outlined'),
      (this.disabled = !1),
      (this.readonly = !1),
      (this.error = ''),
      (this.name = ''));
  }
  render() {
    const t = M({
      field: !0,
      [`field--${this.variant}`]: !0,
      'field--error': !!this.error,
      'field--disabled': this.disabled,
    });
    return n`
      ${this.label ? n`<label class="label" for="input">${this.label}</label>` : ''}

      <div class=${t}>
        <slot name="prefix"></slot>

        <input
          id="input"
          class="field__input"
          type=${this.type}
          .value=${re(this.value)}
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          ?readonly=${this.readonly}
          name=${this.name || ''}
          @input=${y(this, p, F)}
          @change=${y(this, p, J)}
          aria-invalid=${this.error ? 'true' : 'false'}
          aria-describedby=${this.error ? 'error-msg' : void 0}
        />

        <slot name="suffix"></slot>
      </div>

      ${this.error ? n`<span class="error" id="error-msg" role="alert">${this.error}</span>` : ''}
    `;
  }
};
((p = new WeakSet()),
  (F = function (t) {
    const o = t.target;
    ((this.value = o.value), this.dispatchEvent(new Event('input', { bubbles: !0, composed: !0 })));
  }),
  (J = function (t) {
    this.dispatchEvent(new Event('change', { bubbles: !0, composed: !0 }));
  }),
  (x.styles = K`
    :host {
      display: block;
      position: relative;
      outline: none;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
      --_focus-offset: -3px;
    }

    /* Focus ring — extend radius to match the field */
    :host(:focus-visible)::after {
      content: '';
      position: absolute;
      inset: -3px;
      border-radius: calc(
        var(--sg-input-radius, var(--sg-radius-md, 12px)) + 3px
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

    .field {
      display: flex;
      align-items: center;
      gap: 8px;
      border-radius: var(--sg-input-radius, var(--sg-radius-md, 12px));
      height: var(--sg-input-height, 40px);
      padding: 0 12px;
      ${Z}
    }

    .field--outlined {
      ${ee}
    }

    .field--outlined:focus-within {
      border-color: var(--sg-glass-border-hover, rgba(255, 255, 255, 0.25));
      background: var(--sg-glass-bg-hover, rgba(255, 255, 255, 0.14));
    }

    .field--ghost {
      background: transparent;
      border: 1px solid transparent;
    }

    .field--ghost:focus-within {
      background: var(--sg-glass-bg-hover, rgba(255, 255, 255, 0.14));
    }

    .field--error {
      border-color: var(--sg-spectral-rose, #d4869f) !important;
    }

    .field--disabled {
      opacity: 0.45;
      pointer-events: none;
    }

    /* ─── Input element ─── */

    .field__input {
      flex: 1;
      min-width: 0;
      background: transparent;
      border: none;
      outline: none;
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      font-family: inherit;
      font-size: 0.875rem;
      line-height: 1;
      padding: 0;
      height: 100%;
    }

    .field__input::placeholder {
      color: var(--sg-text-tertiary, rgba(255, 255, 255, 0.4));
    }

    /* ─── Label ─── */

    .label {
      display: block;
      margin-bottom: 6px;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
    }

    /* ─── Error text ─── */

    .error {
      display: block;
      margin-top: 4px;
      font-size: 0.75rem;
      color: var(--sg-spectral-rose, #d4869f);
    }

    /* ─── Slots ─── */

    ::slotted([slot='prefix']),
    ::slotted([slot='suffix']) {
      display: flex;
      align-items: center;
      color: var(--sg-text-tertiary, rgba(255, 255, 255, 0.4));
      flex-shrink: 0;
    }
  `));
let a = x;
l([s({ type: String })], a.prototype, 'label');
l([s({ type: String })], a.prototype, 'placeholder');
l([s({ type: String })], a.prototype, 'value');
l([s({ type: String, reflect: !0 })], a.prototype, 'type');
l([s({ type: String, reflect: !0 })], a.prototype, 'variant');
l([s({ type: Boolean, reflect: !0 })], a.prototype, 'disabled');
l([s({ type: Boolean, reflect: !0 })], a.prototype, 'readonly');
l([s({ type: String })], a.prototype, 'error');
l([s({ type: String })], a.prototype, 'name');
customElements.define('sg-input', a);
const pe = {
    title: 'Components/SgInput',
    component: 'sg-input',
    argTypes: {
      variant: { control: 'select', options: ['outlined', 'ghost'] },
      type: { control: 'select', options: ['text', 'email', 'password', 'number', 'search'] },
      label: { control: 'text' },
      placeholder: { control: 'text' },
      value: { control: 'text' },
      error: { control: 'text' },
      disabled: { control: 'boolean' },
      readonly: { control: 'boolean' },
    },
    parameters: {
      docs: {
        description: {
          component:
            'A glass-styled text input with a spectral gradient focus ring and optional prefix/suffix slots.',
        },
      },
    },
  },
  c = {
    render: (e) => n`
    <sg-input
      variant=${e.variant || 'outlined'}
      label=${e.label || ''}
      placeholder=${e.placeholder || 'Type something…'}
      .value=${e.value || ''}
      error=${e.error || ''}
      ?disabled=${e.disabled}
      ?readonly=${e.readonly}
    ></sg-input>
  `,
    args: {
      variant: 'outlined',
      label: 'Label',
      placeholder: 'Type something…',
      value: '',
      error: '',
      disabled: !1,
      readonly: !1,
    },
  },
  g = {
    render: () => n`
    <sg-input
      label="Full name"
      placeholder="Enter your name"
      value="Jane Doe"
    ></sg-input>
  `,
  },
  h = {
    render: () => n`
    <div style="display:flex;flex-direction:column;gap:16px;">
      <sg-input label="Outlined" placeholder="Outlined variant"></sg-input>
      <sg-input label="Ghost" placeholder="Ghost variant" variant="ghost"></sg-input>
    </div>
  `,
  },
  f = {
    render: () => n`
    <sg-input
      label="Email"
      placeholder="your@email.com"
      value="invalid"
      error="Please enter a valid email address"
    ></sg-input>
  `,
  },
  m = {
    render: () => n`
    <sg-input
      label="Disabled"
      placeholder="Can't edit this"
      value="Read-only value"
      disabled
    ></sg-input>
  `,
  },
  b = {
    render: () => n`
    <sg-input label="Search" placeholder="Search…" variant="outlined">
      <span slot="prefix" style="font-size:0.875rem;">🔍</span>
      <span slot="suffix" style="font-size:0.75rem;cursor:pointer;">✕</span>
    </sg-input>
  `,
  };
var S, k, _;
c.parameters = {
  ...c.parameters,
  docs: {
    ...((S = c.parameters) == null ? void 0 : S.docs),
    source: {
      originalSource: `{
  render: args => html\`
    <sg-input
      variant=\${args.variant || 'outlined'}
      label=\${args.label || ''}
      placeholder=\${args.placeholder || 'Type something…'}
      .value=\${args.value || ''}
      error=\${args.error || ''}
      ?disabled=\${args.disabled}
      ?readonly=\${args.readonly}
    ></sg-input>
  \`,
  args: {
    variant: 'outlined',
    label: 'Label',
    placeholder: 'Type something…',
    value: '',
    error: '',
    disabled: false,
    readonly: false
  }
}`,
      ...((_ = (k = c.parameters) == null ? void 0 : k.docs) == null ? void 0 : _.source),
    },
  },
};
var w, O, A;
g.parameters = {
  ...g.parameters,
  docs: {
    ...((w = g.parameters) == null ? void 0 : w.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <sg-input
      label="Full name"
      placeholder="Enter your name"
      value="Jane Doe"
    ></sg-input>
  \`
}`,
      ...((A = (O = g.parameters) == null ? void 0 : O.docs) == null ? void 0 : A.source),
    },
  },
};
var R, z, B;
h.parameters = {
  ...h.parameters,
  docs: {
    ...((R = h.parameters) == null ? void 0 : R.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <div style="display:flex;flex-direction:column;gap:16px;">
      <sg-input label="Outlined" placeholder="Outlined variant"></sg-input>
      <sg-input label="Ghost" placeholder="Ghost variant" variant="ghost"></sg-input>
    </div>
  \`
}`,
      ...((B = (z = h.parameters) == null ? void 0 : z.docs) == null ? void 0 : B.source),
    },
  },
};
var D, P, C;
f.parameters = {
  ...f.parameters,
  docs: {
    ...((D = f.parameters) == null ? void 0 : D.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <sg-input
      label="Email"
      placeholder="your@email.com"
      value="invalid"
      error="Please enter a valid email address"
    ></sg-input>
  \`
}`,
      ...((C = (P = f.parameters) == null ? void 0 : P.docs) == null ? void 0 : C.source),
    },
  },
};
var I, L, G;
m.parameters = {
  ...m.parameters,
  docs: {
    ...((I = m.parameters) == null ? void 0 : I.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <sg-input
      label="Disabled"
      placeholder="Can't edit this"
      value="Read-only value"
      disabled
    ></sg-input>
  \`
}`,
      ...((G = (L = m.parameters) == null ? void 0 : L.docs) == null ? void 0 : G.source),
    },
  },
};
var U, V, W;
b.parameters = {
  ...b.parameters,
  docs: {
    ...((U = b.parameters) == null ? void 0 : U.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <sg-input label="Search" placeholder="Search…" variant="outlined">
      <span slot="prefix" style="font-size:0.875rem;">🔍</span>
      <span slot="suffix" style="font-size:0.75rem;cursor:pointer;">✕</span>
    </sg-input>
  \`
}`,
      ...((W = (V = b.parameters) == null ? void 0 : V.docs) == null ? void 0 : W.source),
    },
  },
};
const ue = ['Default', 'WithValue', 'Variants', 'Error', 'Disabled', 'WithSlots'];
export {
  c as Default,
  m as Disabled,
  f as Error,
  h as Variants,
  b as WithSlots,
  g as WithValue,
  ue as __namedExportsOrder,
  pe as default,
};
