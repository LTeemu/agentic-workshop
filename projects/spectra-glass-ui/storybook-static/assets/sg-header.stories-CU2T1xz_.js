var x = (e) => {
  throw TypeError(e);
};
var C = (e, r, a) => r.has(e) || x('Cannot ' + a);
var k = (e, r, a) =>
  r.has(e)
    ? x('Cannot add the same private member more than once')
    : r instanceof WeakSet
      ? r.add(e)
      : r.set(e, a);
var o = (e, r, a) => (C(e, r, 'access private method'), a);
import { i as z, a as q, b as l } from './iframe-CIO0rj-b.js';
import { n as h } from './property-BDX7J2XP.js';
import { r as D } from './state-DXPKYWFr.js';
import { e as f } from './class-map-BIM98jav.js';
import { s as y } from './shared-C_d8Ah3H.js';
import './sg-button-Biw0GznS.js';
import './preload-helper-Dp1pzeXC.js';
import './directive-CvdRHFdJ.js';
import './sg-spinner-jN4t8AzK.js';
var S = Object.defineProperty,
  d = (e, r, a, u) => {
    for (var n = void 0, p = e.length - 1, v; p >= 0; p--) (v = e[p]) && (n = v(r, a, n) || n);
    return (n && S(r, a, n), n);
  },
  t,
  $,
  c,
  g,
  B,
  b;
const m = class m extends z {
  constructor() {
    super(...arguments);
    k(this, t);
    ((this.sticky = !0),
      (this.menuOpen = !1),
      (this.mobileBreakpoint = '768px'),
      (this._match = !1));
  }
  connectedCallback() {
    (super.connectedCallback(),
      (this._mq = window.matchMedia(`(max-width: ${this.mobileBreakpoint})`)),
      (this._match = this._mq.matches),
      (this._mqHandler = () => {
        ((this._match = this._mq.matches), this._match || (this.menuOpen = !1));
      }),
      this._mq.addEventListener('change', this._mqHandler));
  }
  disconnectedCallback() {
    (super.disconnectedCallback(),
      this._mq && this._mqHandler && this._mq.removeEventListener('change', this._mqHandler),
      o(this, t, b).call(this));
  }
  updated(a) {
    a.has('menuOpen') && (this.menuOpen ? o(this, t, B).call(this) : o(this, t, b).call(this));
  }
  render() {
    const a = { drawer: !0, 'drawer--open': this.menuOpen },
      u = { backdrop: !0, 'backdrop--open': this.menuOpen };
    return l`
      <header class="bar">
        <div class="logo"><slot name="logo"></slot></div>
        <div class="spacer"></div>
        <nav class="desktop-nav"><slot name="nav"></slot></nav>
        <div class="desktop-cta"><slot name="cta"></slot></div>
        <button
          class="hamburger"
          @click=${o(this, t, $)}
          aria-label=${this.menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded=${this.menuOpen ? 'true' : 'false'}
        >
          ${this.menuOpen ? l`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>` : l`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`}
        </button>
      </header>

      <!-- Backdrop -->
      <div class=${f(u)} @click=${o(this, t, c)}></div>

      <!-- Drawer -->
      <aside class=${f(a)}>
        <div class="drawer-header">
          <button
            class="hamburger"
            @click=${o(this, t, c)}
            aria-label="Close menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="drawer-body"><slot name="nav"></slot></div>
        <div class="drawer-cta"><slot name="cta"></slot></div>
      </aside>
    `;
  }
};
((t = new WeakSet()),
  ($ = function () {
    ((this.menuOpen = !this.menuOpen), o(this, t, g).call(this));
  }),
  (c = function () {
    ((this.menuOpen = !1), o(this, t, g).call(this));
  }),
  (g = function () {
    this.dispatchEvent(
      new CustomEvent('menu-toggle', {
        detail: { open: this.menuOpen },
        bubbles: !0,
        composed: !0,
      }),
    );
  }),
  (B = function () {
    document.body.style.overflow = 'hidden';
  }),
  (b = function () {
    document.body.style.overflow = '';
  }),
  (m.styles = q`
    :host {
      display: block;
      width: 100%;
      position: relative;
      z-index: 100;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
    }

    :host([sticky]) {
      position: sticky;
      top: 0;
    }

    /* ═══ Bar ═══ */

    .bar {
      display: flex;
      align-items: center;
      height: var(--sg-header-height, 64px);
      padding: 0 var(--sg-section-gutter, 1.5rem);
      background: var(--sg-header-bg, var(--sg-glass-bg, rgba(255, 255, 255, 0.08)));
      backdrop-filter: var(--sg-header-blur, var(--sg-glass-blur, blur(20px)));
      -webkit-backdrop-filter: var(--sg-header-blur, var(--sg-glass-blur, blur(20px)));
      border-bottom: 1px solid var(--sg-header-border, var(--sg-glass-border, rgba(255, 255, 255, 0.12)));
      gap: 24px;
      box-sizing: border-box;
    }

    .logo {
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .spacer {
      flex: 1;
    }

    .desktop-nav {
      display: flex;
      align-items: center;
    }

    .desktop-nav ::slotted(a),
    .desktop-nav ::slotted(button) {
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
      text-decoration: none;
      font-size: 0.9375rem;
      font-weight: 500;
      padding: 8px 14px;
      border-radius: var(--sg-radius-sm, 8px);
      transition: color var(--sg-transition-fast, 150ms ease);
    }

    .desktop-nav ::slotted(a:hover),
    .desktop-nav ::slotted(button:hover) {
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
    }

    .desktop-cta {
      flex-shrink: 0;
    }

    /* ─── Hamburger ─── */

    .hamburger {
      display: none;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: none;
      border-radius: var(--sg-radius-sm, 8px);
      background: var(--sg-glass-bg-hover, rgba(255, 255, 255, 0.14));
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      cursor: pointer;
      flex-shrink: 0;
      ${y}
    }

    .hamburger:hover {
      background: var(--sg-glass-bg-active, rgba(255, 255, 255, 0.18));
    }

    /* ═══ Drawer backdrop ═══ */

    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--sg-transition-base, 250ms ease);
      z-index: 98;
    }

    .backdrop--open {
      opacity: 1;
      pointer-events: auto;
    }

    /* ═══ Drawer ═══ */

    .drawer {
      position: fixed;
      top: 0;
      right: 0;
      height: 100vh;
      width: var(--sg-drawer-width, 280px);
      background: var(--sg-drawer-bg, rgba(20, 20, 30, 0.95));
      backdrop-filter: var(--sg-glass-blur, blur(20px));
      -webkit-backdrop-filter: var(--sg-glass-blur, blur(20px));
      z-index: 99;
      transform: translateX(100%);
      ${y}
      display: flex;
      flex-direction: column;
      border-left: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      box-sizing: border-box;
    }

    .drawer--open {
      transform: translateX(0);
    }

    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      height: var(--sg-header-height, 64px);
      padding: 0 1rem;
      border-bottom: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      flex-shrink: 0;
    }

    .drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
    }

    .drawer-body ::slotted(a),
    .drawer-body ::slotted(button) {
      display: block;
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      text-decoration: none;
      font-size: 1.0625rem;
      font-weight: 500;
      padding: 12px 8px;
      border-radius: var(--sg-radius-sm, 8px);
      transition: background var(--sg-transition-fast, 150ms ease);
    }

    .drawer-body ::slotted(a:hover),
    .drawer-body ::slotted(button:hover) {
      background: var(--sg-glass-bg-hover, rgba(255, 255, 255, 0.14));
    }

    .drawer-cta {
      padding: 1rem;
      border-top: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      flex-shrink: 0;
    }

    /* ─── Responsive ─── */

    @media (max-width: 768px) {
      .desktop-nav,
      .desktop-cta {
        display: none;
      }

      .hamburger {
        display: flex;
      }
    }
  `));
let s = m;
d([h({ type: Boolean, reflect: !0 })], s.prototype, 'sticky');
d([h({ type: Boolean, reflect: !0, attribute: 'menu-open' })], s.prototype, 'menuOpen');
d([h({ type: String, attribute: 'mobile-breakpoint' })], s.prototype, 'mobileBreakpoint');
d([D()], s.prototype, '_match');
customElements.define('sg-header', s);
const X = {
    title: 'Components/SgHeader',
    component: 'sg-header',
    argTypes: {
      sticky: { control: 'boolean' },
      menuOpen: { control: 'boolean' },
      mobileBreakpoint: { control: 'text' },
    },
    parameters: {
      docs: {
        description: {
          component:
            'Responsive navigation bar with sticky support, desktop nav slot, and mobile slide-out drawer with backdrop.',
        },
      },
    },
  },
  i = {
    render: (e) => l`
    <sg-header ?sticky=${e.sticky ?? !0} mobile-breakpoint=${e.mobileBreakpoint || '768px'}>
      <span slot="logo" style="font-weight:700;font-size:1.25rem;color:rgba(255,255,255,0.9);">
        Spectra
      </span>
      <a slot="nav" href="#" style="color:rgba(255,255,255,0.6);text-decoration:none;padding:0 12px;">Features</a>
      <a slot="nav" href="#" style="color:rgba(255,255,255,0.6);text-decoration:none;padding:0 12px;">Pricing</a>
      <a slot="nav" href="#" style="color:rgba(255,255,255,0.6);text-decoration:none;padding:0 12px;">Docs</a>
      <sg-button slot="cta" variant="primary" size="sm">Get Started</sg-button>
    </sg-header>
  `,
    args: { sticky: !0, mobileBreakpoint: '768px' },
  };
var w, _, O;
i.parameters = {
  ...i.parameters,
  docs: {
    ...((w = i.parameters) == null ? void 0 : w.docs),
    source: {
      originalSource: `{
  render: args => html\`
    <sg-header ?sticky=\${args.sticky ?? true} mobile-breakpoint=\${args.mobileBreakpoint || '768px'}>
      <span slot="logo" style="font-weight:700;font-size:1.25rem;color:rgba(255,255,255,0.9);">
        Spectra
      </span>
      <a slot="nav" href="#" style="color:rgba(255,255,255,0.6);text-decoration:none;padding:0 12px;">Features</a>
      <a slot="nav" href="#" style="color:rgba(255,255,255,0.6);text-decoration:none;padding:0 12px;">Pricing</a>
      <a slot="nav" href="#" style="color:rgba(255,255,255,0.6);text-decoration:none;padding:0 12px;">Docs</a>
      <sg-button slot="cta" variant="primary" size="sm">Get Started</sg-button>
    </sg-header>
  \`,
  args: {
    sticky: true,
    mobileBreakpoint: '768px'
  }
}`,
      ...((O = (_ = i.parameters) == null ? void 0 : _.docs) == null ? void 0 : O.source),
    },
  },
};
const I = ['Default'];
export { i as Default, I as __namedExportsOrder, X as default };
