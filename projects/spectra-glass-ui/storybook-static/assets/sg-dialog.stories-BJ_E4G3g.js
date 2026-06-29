var v = (e) => {
  throw TypeError(e);
};
var F = (e, s, t) => s.has(e) || v('Cannot ' + t);
var k = (e, s, t) =>
  s.has(e)
    ? v('Cannot add the same private member more than once')
    : s instanceof WeakSet
      ? s.add(e)
      : s.set(e, t);
var r = (e, s, t) => (F(e, s, 'access private method'), t);
import { i as H, a as M, b as i } from './iframe-CIO0rj-b.js';
import { n as b } from './property-BDX7J2XP.js';
import { e as x } from './class-map-BIM98jav.js';
import { g as O } from './shared-C_d8Ah3H.js';
import './sg-button-Biw0GznS.js';
import './preload-helper-Dp1pzeXC.js';
import './directive-CvdRHFdJ.js';
import './sg-spinner-jN4t8AzK.js';
var N = Object.defineProperty,
  u = (e, s, t, l) => {
    for (var a = void 0, h = e.length - 1, y; h >= 0; h--) (y = e[h]) && (a = y(s, t, a) || a);
    return (a && N(s, t, a), a);
  },
  o,
  L,
  P,
  m,
  j;
const f = class f extends H {
  constructor() {
    super(...arguments);
    k(this, o);
    ((this.open = !1), (this.closable = !0), (this.backdropDismiss = !0), (this.title = ''));
  }
  render() {
    const t = x({ backdrop: !0, 'backdrop--open': this.open }),
      l = x({ dialog: !0 });
    return i`
      <div
        class=${t}
        ?hidden=${!this.open}
        @click=${r(this, o, L)}
        @keydown=${r(this, o, P)}
        role="presentation"
      >
        <div
          class=${l}
          role="dialog"
          aria-modal=${this.open ? 'true' : 'false'}
          aria-label=${this.title || void 0}
          @click=${(a) => a.stopPropagation()}
        >
          <!-- Header -->
          <div class="header">
            <h2 class="header__title">${this.title}</h2>
            ${
              this.closable
                ? i`
                  <button
                    class="header__close"
                    @click=${r(this, o, m)}
                    aria-label="Close dialog"
                  >
                    &times;
                  </button>
                `
                : ''
            }
          </div>

          <!-- Body -->
          <div class="body">
            <slot></slot>
          </div>

          <!-- Footer -->
          <div class="footer" ?hidden=${!r(this, o, j).call(this)}>
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    `;
  }
};
((o = new WeakSet()),
  (L = function () {
    this.backdropDismiss && this.open && r(this, o, m).call(this);
  }),
  (P = function (t) {
    t.key === 'Escape' && this.open && r(this, o, m).call(this);
  }),
  (m = function () {
    ((this.open = !1), this.dispatchEvent(new CustomEvent('close', { bubbles: !0, composed: !0 })));
  }),
  (j = function () {
    var l;
    const t = (l = this.shadowRoot) == null ? void 0 : l.querySelector('slot[name="footer"]');
    return ((t == null ? void 0 : t.assignedNodes().length) ?? 0) > 0;
  }),
  (f.styles = M`
    :host {
      display: contents;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
    }

    /* ═══ Backdrop ═══ */

    .backdrop {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 1000;
      opacity: 0;
      transition: opacity var(--sg-transition-base, 250ms ease);
    }

    .backdrop--open {
      opacity: 1;
    }

    /* ═══ Dialog panel ═══ */

    .dialog {
      position: relative;
      width: 100%;
      max-width: var(--sg-dialog-max-width, 480px);
      max-height: 85vh;
      margin: 16px;
      display: flex;
      flex-direction: column;
      border-radius: var(--sg-dialog-radius, var(--sg-radius-lg, 20px));
      padding: var(--sg-dialog-padding, 24px);
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      ${O}
      box-shadow: var(--sg-glass-shadow-lg, 0 8px 48px rgba(0, 0, 0, 0.18));
      overflow-y: auto;
      transform: scale(0.95) translateY(8px);
      transition:
        transform var(--sg-transition-base, 250ms ease),
        opacity var(--sg-transition-base, 250ms ease);
    }

    .backdrop--open .dialog {
      transform: scale(1) translateY(0);
    }

    /* ═══ Header ═══ */

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid
        var(--sg-glass-border, rgba(255, 255, 255, 0.12));
    }

    .header__title {
      font-size: 1.125rem;
      font-weight: 700;
      margin: 0;
    }

    .header__close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
      cursor: pointer;
      border-radius: var(--sg-radius-sm, 8px);
      font-size: 1.25rem;
      line-height: 1;
      transition: background var(--sg-transition-fast, 150ms ease);
    }

    .header__close:hover {
      background: var(--sg-glass-bg-hover, rgba(255, 255, 255, 0.14));
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
    }

    /* ═══ Body ═══ */

    .body {
      flex: 1;
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
    }

    /* ═══ Footer ═══ */

    .footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid
        var(--sg-glass-border, rgba(255, 255, 255, 0.12));
    }
  `));
let n = f;
u([b({ type: Boolean, reflect: !0 })], n.prototype, 'open');
u([b({ type: Boolean, reflect: !0 })], n.prototype, 'closable');
u([b({ type: Boolean, attribute: 'backdrop-dismiss' })], n.prototype, 'backdropDismiss');
u([b({ type: String })], n.prototype, 'title');
customElements.define('sg-dialog', n);
const V = {
    title: 'Components/SgDialog',
    component: 'sg-dialog',
    argTypes: {
      open: { control: 'boolean' },
      closable: { control: 'boolean' },
      backdropDismiss: { control: 'boolean' },
      title: { control: 'text' },
    },
    parameters: {
      docs: {
        description: {
          component:
            'A glassmorphic modal with backdrop blur. Press Escape or click the backdrop to close.',
        },
      },
    },
  },
  p = {
    render: (e) => i`
    <sg-dialog
      ?open=${e.open}
      ?closable=${e.closable}
      ?backdrop-dismiss=${e.backdropDismiss}
      title=${e.title || 'Dialog Title'}
    >
      <p>This is the dialog body content. It supports any HTML or slotted content.</p>
      <p>
        Press <strong>Escape</strong> or click the backdrop to close.
      </p>
      <span slot="footer">
        <sg-button variant="ghost" size="sm">Cancel</sg-button>
        <sg-button variant="primary" size="sm">Confirm</sg-button>
      </span>
    </sg-dialog>
  `,
    args: { open: !1, closable: !0, backdropDismiss: !0, title: 'Dialog Title' },
  },
  d = {
    render: (e) => i`
    <sg-dialog
      ?open=${e.open}
      ?closable=${e.closable}
      ?backdrop-dismiss=${e.backdropDismiss}
      title=${e.title || 'Dialog Title'}
    >
      <p>This dialog is open by default. It demonstrates the glass surface with backdrop blur.</p>
      <span slot="footer">
        <sg-button variant="ghost" size="sm">Cancel</sg-button>
        <sg-button variant="primary" size="sm">Save</sg-button>
      </span>
    </sg-dialog>
  `,
    args: { open: !0, closable: !0, backdropDismiss: !0, title: 'Dialog Title' },
  },
  c = {
    render: () => i`
    <sg-dialog open title="Information">
      <p>A simple dialog with no footer actions, just a close button.</p>
    </sg-dialog>
  `,
  },
  g = {
    render: () => i`
    <sg-dialog open title="Terms of Service">
      <p>1. Acceptance of Terms</p>
      <p>By accessing and using this service, you accept and agree to be bound by the terms and conditions.</p>
      <p>2. Description of Service</p>
      <p>We provide a platform for demonstrating web components built with the Spectra Glass design system.</p>
      <p>3. Intellectual Property</p>
      <p>All components, styles, and documentation are provided under the MIT license.</p>
      <p>4. Limitation of Liability</p>
      <p>In no event shall the authors be liable for any claim, damages, or other liability.</p>
      <span slot="footer">
        <sg-button variant="secondary" size="sm">Decline</sg-button>
        <sg-button variant="primary" size="sm">Accept</sg-button>
      </span>
    </sg-dialog>
  `,
  };
var $, D, w;
p.parameters = {
  ...p.parameters,
  docs: {
    ...(($ = p.parameters) == null ? void 0 : $.docs),
    source: {
      originalSource: `{
  render: args => html\`
    <sg-dialog
      ?open=\${args.open}
      ?closable=\${args.closable}
      ?backdrop-dismiss=\${args.backdropDismiss}
      title=\${args.title || 'Dialog Title'}
    >
      <p>This is the dialog body content. It supports any HTML or slotted content.</p>
      <p>
        Press <strong>Escape</strong> or click the backdrop to close.
      </p>
      <span slot="footer">
        <sg-button variant="ghost" size="sm">Cancel</sg-button>
        <sg-button variant="primary" size="sm">Confirm</sg-button>
      </span>
    </sg-dialog>
  \`,
  args: {
    open: false,
    closable: true,
    backdropDismiss: true,
    title: 'Dialog Title'
  }
}`,
      ...((w = (D = p.parameters) == null ? void 0 : D.docs) == null ? void 0 : w.source),
    },
  },
};
var T, C, z;
d.parameters = {
  ...d.parameters,
  docs: {
    ...((T = d.parameters) == null ? void 0 : T.docs),
    source: {
      originalSource: `{
  render: args => html\`
    <sg-dialog
      ?open=\${args.open}
      ?closable=\${args.closable}
      ?backdrop-dismiss=\${args.backdropDismiss}
      title=\${args.title || 'Dialog Title'}
    >
      <p>This dialog is open by default. It demonstrates the glass surface with backdrop blur.</p>
      <span slot="footer">
        <sg-button variant="ghost" size="sm">Cancel</sg-button>
        <sg-button variant="primary" size="sm">Save</sg-button>
      </span>
    </sg-dialog>
  \`,
  args: {
    open: true,
    closable: true,
    backdropDismiss: true,
    title: 'Dialog Title'
  }
}`,
      ...((z = (C = d.parameters) == null ? void 0 : C.docs) == null ? void 0 : z.source),
    },
  },
};
var S, _, I;
c.parameters = {
  ...c.parameters,
  docs: {
    ...((S = c.parameters) == null ? void 0 : S.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <sg-dialog open title="Information">
      <p>A simple dialog with no footer actions, just a close button.</p>
    </sg-dialog>
  \`
}`,
      ...((I = (_ = c.parameters) == null ? void 0 : _.docs) == null ? void 0 : I.source),
    },
  },
};
var A, B, E;
g.parameters = {
  ...g.parameters,
  docs: {
    ...((A = g.parameters) == null ? void 0 : A.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <sg-dialog open title="Terms of Service">
      <p>1. Acceptance of Terms</p>
      <p>By accessing and using this service, you accept and agree to be bound by the terms and conditions.</p>
      <p>2. Description of Service</p>
      <p>We provide a platform for demonstrating web components built with the Spectra Glass design system.</p>
      <p>3. Intellectual Property</p>
      <p>All components, styles, and documentation are provided under the MIT license.</p>
      <p>4. Limitation of Liability</p>
      <p>In no event shall the authors be liable for any claim, damages, or other liability.</p>
      <span slot="footer">
        <sg-button variant="secondary" size="sm">Decline</sg-button>
        <sg-button variant="primary" size="sm">Accept</sg-button>
      </span>
    </sg-dialog>
  \`
}`,
      ...((E = (B = g.parameters) == null ? void 0 : B.docs) == null ? void 0 : E.source),
    },
  },
};
const X = ['Closed', 'Open', 'NoFooter', 'LongContent'];
export {
  p as Closed,
  g as LongContent,
  c as NoFooter,
  d as Open,
  X as __namedExportsOrder,
  V as default,
};
