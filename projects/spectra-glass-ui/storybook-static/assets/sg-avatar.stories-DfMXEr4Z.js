var y = (a) => {
  throw TypeError(a);
};
var C = (a, s, t) => s.has(a) || y('Cannot ' + t);
var x = (a, s, t) =>
  s.has(a)
    ? y('Cannot add the same private member more than once')
    : s instanceof WeakSet
      ? s.add(a)
      : s.set(a, t);
var f = (a, s, t) => (C(a, s, 'access private method'), t);
import { i as L, a as M, b as e } from './iframe-CIO0rj-b.js';
import { n as o } from './property-BDX7J2XP.js';
import { r as W } from './state-DXPKYWFr.js';
import { e as X } from './class-map-BIM98jav.js';
import './preload-helper-Dp1pzeXC.js';
import './directive-CvdRHFdJ.js';
var j = Object.defineProperty,
  n = (a, s, t, u) => {
    for (var i = void 0, v = a.length - 1, h; v >= 0; v--) (h = a[v]) && (i = h(s, t, i) || i);
    return (i && j(s, t, i), i);
  },
  d,
  P;
const m = class m extends L {
  constructor() {
    super(...arguments);
    x(this, d);
    ((this.src = ''),
      (this.alt = ''),
      (this.size = 'md'),
      (this.initials = ''),
      (this.status = ''),
      (this._imgError = !1),
      (this.SIZE_MAP = { sm: '32px', md: '40px', lg: '56px', xl: '80px' }));
  }
  render() {
    const t = this.SIZE_MAP[this.size] ?? '40px',
      u = this.src && !this._imgError,
      i = { status: !0, 'status--away': this.status === 'away' };
    return e`
      <style>
        :host {
          --sg-avatar-size: ${t};
        }
      </style>
      <div class="avatar" role="img" aria-label=${this.alt || this.initials || 'avatar'}>
        ${
          u
            ? e`<img
              src=${this.src}
              alt=${this.alt}
              @error=${f(this, d, P)}
            />`
            : e`<span>${this.initials}</span>`
        }
      </div>
      ${this.status ? e`<span class=${X(i)}></span>` : ''}
    `;
  }
};
((d = new WeakSet()),
  (P = function () {
    this._imgError = !0;
  }),
  (m.styles = M`
    :host {
      display: inline-flex;
      position: relative;
      flex-shrink: 0;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
    }

    .avatar {
      width: var(--sg-avatar-size, 40px);
      height: var(--sg-avatar-size, 40px);
      border-radius: 50%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--sg-avatar-bg, var(--sg-glass-bg, rgba(255, 255, 255, 0.08)));
      backdrop-filter: var(--sg-glass-blur-sm, blur(12px));
      -webkit-backdrop-filter: var(--sg-glass-blur-sm, blur(12px));
      border: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      color: var(--sg-avatar-color, var(--sg-text-primary, rgba(255, 255, 255, 0.9)));
      font-weight: 600;
      font-size: calc(var(--sg-avatar-size, 40px) * 0.35);
      line-height: 1;
      user-select: none;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* ─── Status dot ─── */

    .status {
      position: absolute;
      bottom: 0;
      right: 0;
      width: calc(var(--sg-avatar-size, 40px) * 0.28);
      height: calc(var(--sg-avatar-size, 40px) * 0.28);
      border-radius: 50%;
      border: 2px solid var(--sg-avatar-dot-border, var(--sg-glass-bg, rgba(255, 255, 255, 0.08)));
      background: var(--sg-avatar-dot-bg, #4ade80);
    }

    .status--away {
      background: var(--sg-avatar-dot-away, #fbbf24);
    }
  `));
let r = m;
n([o({ type: String })], r.prototype, 'src');
n([o({ type: String })], r.prototype, 'alt');
n([o({ type: String })], r.prototype, 'size');
n([o({ type: String })], r.prototype, 'initials');
n([o({ type: String })], r.prototype, 'status');
n([W()], r.prototype, '_imgError');
customElements.define('sg-avatar', r);
const F = {
    title: 'Components/SgAvatar',
    component: 'sg-avatar',
    argTypes: {
      src: { control: 'text' },
      alt: { control: 'text' },
      size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
      initials: { control: 'text' },
      status: { control: 'select', options: ['', 'online', 'away'] },
    },
    parameters: {
      docs: {
        description: {
          component:
            'Circular avatar with image, initials fallback on error, and optional online/away status dot.',
        },
      },
    },
  },
  l = {
    render: (a) => e`
    <sg-avatar
      src=${a.src || ''}
      alt=${a.alt || ''}
      size=${a.size || 'md'}
      initials=${a.initials || 'JD'}
      status=${a.status || ''}
    ></sg-avatar>
  `,
    args: { initials: 'JD', size: 'md', status: '' },
  },
  g = {
    render: () => e`
    <sg-avatar
      src="https://i.pravatar.cc/80?img=11"
      alt="Jane Doe"
      size="lg"
    ></sg-avatar>
  `,
  },
  p = {
    render: () => e`
    <div style="display:flex;gap:16px;align-items:center;padding:1rem;">
      <sg-avatar initials="XS" size="sm"></sg-avatar>
      <sg-avatar initials="MD" size="md"></sg-avatar>
      <sg-avatar initials="LG" size="lg"></sg-avatar>
      <sg-avatar initials="XL" size="xl"></sg-avatar>
    </div>
  `,
  },
  c = {
    render: () => e`
    <div style="display:flex;gap:16px;align-items:center;padding:1rem;">
      <sg-avatar initials="ON" size="lg" status="online"></sg-avatar>
      <sg-avatar initials="AW" size="lg" status="away"></sg-avatar>
    </div>
  `,
  };
var b, z, $;
l.parameters = {
  ...l.parameters,
  docs: {
    ...((b = l.parameters) == null ? void 0 : b.docs),
    source: {
      originalSource: `{
  render: args => html\`
    <sg-avatar
      src=\${args.src || ''}
      alt=\${args.alt || ''}
      size=\${args.size || 'md'}
      initials=\${args.initials || 'JD'}
      status=\${args.status || ''}
    ></sg-avatar>
  \`,
  args: {
    initials: 'JD',
    size: 'md',
    status: ''
  }
}`,
      ...(($ = (z = l.parameters) == null ? void 0 : z.docs) == null ? void 0 : $.source),
    },
  },
};
var S, w, _;
g.parameters = {
  ...g.parameters,
  docs: {
    ...((S = g.parameters) == null ? void 0 : S.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <sg-avatar
      src="https://i.pravatar.cc/80?img=11"
      alt="Jane Doe"
      size="lg"
    ></sg-avatar>
  \`
}`,
      ...((_ = (w = g.parameters) == null ? void 0 : w.docs) == null ? void 0 : _.source),
    },
  },
};
var D, k, E;
p.parameters = {
  ...p.parameters,
  docs: {
    ...((D = p.parameters) == null ? void 0 : D.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <div style="display:flex;gap:16px;align-items:center;padding:1rem;">
      <sg-avatar initials="XS" size="sm"></sg-avatar>
      <sg-avatar initials="MD" size="md"></sg-avatar>
      <sg-avatar initials="LG" size="lg"></sg-avatar>
      <sg-avatar initials="XL" size="xl"></sg-avatar>
    </div>
  \`
}`,
      ...((E = (k = p.parameters) == null ? void 0 : k.docs) == null ? void 0 : E.source),
    },
  },
};
var I, J, O;
c.parameters = {
  ...c.parameters,
  docs: {
    ...((I = c.parameters) == null ? void 0 : I.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <div style="display:flex;gap:16px;align-items:center;padding:1rem;">
      <sg-avatar initials="ON" size="lg" status="online"></sg-avatar>
      <sg-avatar initials="AW" size="lg" status="away"></sg-avatar>
    </div>
  \`
}`,
      ...((O = (J = c.parameters) == null ? void 0 : J.docs) == null ? void 0 : O.source),
    },
  },
};
const H = ['Default', 'WithImage', 'Sizes', 'StatusOnline'];
export {
  l as Default,
  p as Sizes,
  c as StatusOnline,
  g as WithImage,
  H as __namedExportsOrder,
  F as default,
};
