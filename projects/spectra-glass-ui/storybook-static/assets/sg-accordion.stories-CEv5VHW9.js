var w = (t) => {
  throw TypeError(t);
};
var L = (t, s, e) => s.has(t) || w('Cannot ' + e);
var u = (t, s, e) =>
  s.has(t)
    ? w('Cannot add the same private member more than once')
    : s instanceof WeakSet
      ? s.add(t)
      : s.set(t, e);
var r = (t, s, e) => (L(t, s, 'access private method'), e);
import { i as O, a as T, b as g } from './iframe-CIO0rj-b.js';
import { n as x } from './property-BDX7J2XP.js';
import { r as M } from './state-DXPKYWFr.js';
import { e as P } from './class-map-BIM98jav.js';
import { s as H } from './shared-C_d8Ah3H.js';
import './preload-helper-Dp1pzeXC.js';
import './directive-CvdRHFdJ.js';
var B = Object.defineProperty,
  m = (t, s, e, o) => {
    for (var i = void 0, c = t.length - 1, b; c >= 0; c--) (b = t[c]) && (i = b(s, e, i) || i);
    return (i && B(s, e, i), i);
  },
  l,
  I,
  W;
const v = class v extends O {
  constructor() {
    super(...arguments);
    u(this, l);
    ((this.multiple = !1), (this._items = []));
  }
  render() {
    return g`
      <div class="accordion" @toggle=${r(this, l, W)}>
        <slot @slotchange=${r(this, l, I)}></slot>
      </div>
    `;
  }
};
((l = new WeakSet()),
  (I = function () {
    var i;
    const e = (i = this.shadowRoot) == null ? void 0 : i.querySelector('slot');
    if (!e) return;
    const o = e.assignedElements().filter((c) => c instanceof a);
    ((this._items.length = 0), this._items.push(...o));
  }),
  (W = function (e) {
    const o = e.target;
    this.multiple ||
      this._items.forEach((i) => {
        i !== o && i.open && (i.open = !1);
      });
  }),
  (v.styles = T`
    :host {
      display: block;
      width: 100%;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
    }

    .accordion {
      display: flex;
      flex-direction: column;
      gap: 1px;
      background: var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      border-radius: var(--sg-radius-md, 12px);
      overflow: hidden;
    }
  `));
let h = v;
m([x({ type: Boolean })], h.prototype, 'multiple');
customElements.define('sg-accordion', h);
var n, R, f, q;
const y = class y extends O {
  constructor() {
    super(...arguments);
    u(this, n);
    ((this.open = !1), (this.heading = ''), (this._contentHeight = 0));
  }
  render() {
    const e = { item: !0, 'item--open': this.open };
    return g`
      <div class=${P(e)}>
        <button
          class="header"
          @click=${r(this, n, R)}
          aria-expanded=${this.open ? 'true' : 'false'}
        >
          <span class="header-text">${this.heading}<slot name="heading"></slot></span>
          <span class="chevron">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </span>
        </button>
        <div class="panel-wrapper">
          <div class="panel">
            <slot @slotchange=${r(this, n, f)}></slot>
          </div>
        </div>
      </div>
    `;
  }
  firstUpdated() {
    this.open && r(this, n, f).call(this);
  }
  updated(e) {
    e.has('open') && r(this, n, q).call(this);
  }
};
((n = new WeakSet()),
  (R = function () {
    ((this.open = !this.open),
      this.dispatchEvent(
        new CustomEvent('toggle', { detail: { open: this.open }, bubbles: !0, composed: !0 }),
      ));
  }),
  (f = function () {
    if (!this.open) return;
    const e = this.renderRoot.querySelector('.panel-wrapper');
    if (!e) return;
    ((e.style.transition = 'none'), (e.style.maxHeight = ''));
    const o = e.scrollHeight;
    ((e.style.maxHeight = this._contentHeight + 'px'),
      e.offsetHeight,
      (e.style.transition = ''),
      (e.style.maxHeight = o + 'px'),
      (this._contentHeight = o));
  }),
  (q = function () {
    const e = this.renderRoot.querySelector('.panel-wrapper');
    if (e)
      if (this.open) {
        e.style.maxHeight = '';
        const o = e.scrollHeight;
        ((e.style.maxHeight = '0px'),
          e.offsetHeight,
          (e.style.maxHeight = o + 'px'),
          (this._contentHeight = o));
      } else
        ((e.style.maxHeight = this._contentHeight + 'px'),
          e.offsetHeight,
          (e.style.maxHeight = '0px'));
  }),
  (y.styles = T`
    :host {
      display: block;
      background: var(--sg-accordion-content-bg, transparent);
    }

    .item {
      background: var(--sg-accordion-header-bg, var(--sg-glass-bg, rgba(255, 255, 255, 0.08)));
    }

    /* ─── Header ─── */

    .header {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 16px 20px;
      border: none;
      background: none;
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      font-family: inherit;
      font-size: 1rem;
      font-weight: 500;
      line-height: 1.4;
      text-align: left;
      cursor: pointer;
      ${H}
      gap: 12px;
    }

    .header:hover {
      background: var(--sg-accordion-header-hover, var(--sg-glass-bg-hover, rgba(255, 255, 255, 0.14)));
    }

    .header:focus-visible {
      outline: 2px solid var(--sg-spectral-gold, #c4a050);
      outline-offset: -2px;
    }

    .header-text {
      flex: 1;
    }

    /* ─── Chevron ─── */

    .chevron {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
      ${H}
    }

    .item--open .chevron {
      transform: rotate(180deg);
    }

    /* ─── Panel ───
       max-height is set dynamically via JS for smooth animation.
       The 300ms transition on max-height gives the slide effect. */

    .panel-wrapper {
      max-height: 0;
      overflow: hidden;
      transition: max-height var(--sg-transition-base, 250ms ease);
      will-change: max-height;
    }

    .panel {
      padding: 0 20px 16px;
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
      font-size: 0.9375rem;
      line-height: 1.7;
    }
  `));
let a = y;
m([x({ type: Boolean, reflect: !0 })], a.prototype, 'open');
m([x({ type: String })], a.prototype, 'heading');
m([M()], a.prototype, '_contentHeight');
customElements.define('sg-accordion-item', a);
const K = {
    title: 'Components/SgAccordion',
    component: 'sg-accordion',
    argTypes: { multiple: { control: 'boolean' } },
    parameters: {
      docs: {
        description: {
          component:
            'Expand/collapse accordion container. Set `multiple` to allow several items open simultaneously.',
        },
      },
    },
  },
  d = {
    render: (t) => g`
    <sg-accordion ?multiple=${t.multiple ?? !1} style="max-width:600px;">
      <sg-accordion-item heading="What is Spectra Glass?">
        A Web Component library with glassmorphism aesthetics and spectral gradients, built with Lit.
      </sg-accordion-item>
      <sg-accordion-item heading="Can I use it with React?">
        Yes — Web Components work with any framework. Import the elements and use them as HTML tags.
      </sg-accordion-item>
      <sg-accordion-item heading="How do I customise the theme?">
        Override CSS custom properties like <code>--sg-glass-bg</code> and <code>--sg-spectral-rose</code>.
      </sg-accordion-item>
    </sg-accordion>
  `,
    args: { multiple: !1 },
  },
  p = {
    render: () => g`
    <sg-accordion multiple style="max-width:600px;">
      <sg-accordion-item heading="First item" open>
        This item starts open. Others can be opened independently.
      </sg-accordion-item>
      <sg-accordion-item heading="Second item">
        Clicking this won't close the first one because <code>multiple</code> is set.
      </sg-accordion-item>
    </sg-accordion>
  `,
  };
var k, C, _;
d.parameters = {
  ...d.parameters,
  docs: {
    ...((k = d.parameters) == null ? void 0 : k.docs),
    source: {
      originalSource: `{
  render: args => html\`
    <sg-accordion ?multiple=\${args.multiple ?? false} style="max-width:600px;">
      <sg-accordion-item heading="What is Spectra Glass?">
        A Web Component library with glassmorphism aesthetics and spectral gradients, built with Lit.
      </sg-accordion-item>
      <sg-accordion-item heading="Can I use it with React?">
        Yes — Web Components work with any framework. Import the elements and use them as HTML tags.
      </sg-accordion-item>
      <sg-accordion-item heading="How do I customise the theme?">
        Override CSS custom properties like <code>--sg-glass-bg</code> and <code>--sg-spectral-rose</code>.
      </sg-accordion-item>
    </sg-accordion>
  \`,
  args: {
    multiple: false
  }
}`,
      ...((_ = (C = d.parameters) == null ? void 0 : C.docs) == null ? void 0 : _.source),
    },
  },
};
var S, $, E;
p.parameters = {
  ...p.parameters,
  docs: {
    ...((S = p.parameters) == null ? void 0 : S.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <sg-accordion multiple style="max-width:600px;">
      <sg-accordion-item heading="First item" open>
        This item starts open. Others can be opened independently.
      </sg-accordion-item>
      <sg-accordion-item heading="Second item">
        Clicking this won't close the first one because <code>multiple</code> is set.
      </sg-accordion-item>
    </sg-accordion>
  \`
}`,
      ...((E = ($ = p.parameters) == null ? void 0 : $.docs) == null ? void 0 : E.source),
    },
  },
};
const N = ['Default', 'MultipleOpen'];
export { d as Default, p as MultipleOpen, N as __namedExportsOrder, K as default };
