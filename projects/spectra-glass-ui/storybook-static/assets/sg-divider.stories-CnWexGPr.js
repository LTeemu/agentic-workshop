import { i as _, a as E, b as a } from './iframe-CIO0rj-b.js';
import { n as v } from './property-BDX7J2XP.js';
import { e as V } from './class-map-BIM98jav.js';
import './preload-helper-Dp1pzeXC.js';
import './directive-CvdRHFdJ.js';
var z = Object.defineProperty,
  p = (e, s, r, C) => {
    for (var i = void 0, g = e.length - 1, b; g >= 0; g--) (b = e[g]) && (i = b(s, r, i) || i);
    return (i && z(s, r, i), i);
  };
const c = class c extends _ {
  constructor() {
    (super(...arguments),
      (this.variant = 'glass'),
      (this.label = ''),
      (this.labelPosition = 'center'));
  }
  render() {
    const s = {
        divider: !0,
        [`divider--${this.variant}`]: !0,
        'divider--label-left': this.label && this.labelPosition === 'left',
        'divider--label-right': this.label && this.labelPosition === 'right',
      },
      r = this.label ? a`<span class="label">${this.label}</span>` : '';
    return a`
      <div class=${V(s)}>
        ${this.label && this.labelPosition === 'left' ? r : ''}
        ${this.label && this.labelPosition === 'center' ? r : ''}
        ${this.label && this.labelPosition === 'right' ? r : ''}
      </div>
    `;
  }
};
c.styles = E`
    :host {
      display: block;
      width: 100%;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
    }

    .divider {
      display: flex;
      align-items: center;
      width: 100%;
      gap: 16px;
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      height: 1px;
    }

    .divider--label-left::before {
      flex: 0 0 24px;
    }

    .divider--label-right::after {
      flex: 0 0 24px;
    }

    /* ─── Variants ─── */

    .divider--solid::before,
    .divider--solid::after {
      background: var(--sg-divider-color, var(--sg-glass-border, rgba(255, 255, 255, 0.12)));
    }

    .divider--glass::before,
    .divider--glass::after {
      background: var(--sg-glass-border, rgba(255, 255, 255, 0.12));
      height: 1px;
      backdrop-filter: var(--sg-glass-blur-sm, blur(12px));
      border-radius: 1px;
    }

    .divider--gradient::before,
    .divider--gradient::after {
      background: var(
        --sg-divider-gradient,
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

    .label {
      color: var(--sg-divider-label-color, var(--sg-text-secondary, rgba(255, 255, 255, 0.6)));
      font-size: 0.8125rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      white-space: nowrap;
      flex-shrink: 0;
    }
  `;
let t = c;
p([v({ type: String })], t.prototype, 'variant');
p([v({ type: String })], t.prototype, 'label');
p([v({ type: String, attribute: 'label-position' })], t.prototype, 'labelPosition');
customElements.define('sg-divider', t);
const D = {
    title: 'Components/SgDivider',
    component: 'sg-divider',
    argTypes: {
      variant: { control: 'select', options: ['solid', 'glass', 'gradient'] },
      label: { control: 'text' },
      labelPosition: { control: 'select', options: ['left', 'center', 'right'] },
    },
    parameters: {
      docs: {
        description: {
          component:
            'A horizontal divider with optional label. Use `variant="gradient"` for the spectral gradient line.',
        },
      },
    },
  },
  l = {
    render: (e) =>
      a`<sg-divider variant=${e.variant || 'glass'} label=${e.label || ''} label-position=${e.labelPosition || 'center'}></sg-divider>`,
    args: { variant: 'glass', label: '', labelPosition: 'center' },
  },
  d = { render: () => a`<sg-divider label="Section"></sg-divider>` },
  n = { render: () => a`<sg-divider variant="gradient" label="Spectra"></sg-divider>` },
  o = {
    render: () => a`
    <div style="display:flex;flex-direction:column;gap:24px;padding:1rem;">
      <sg-divider variant="solid" label="Solid"></sg-divider>
      <sg-divider variant="glass" label="Glass"></sg-divider>
      <sg-divider variant="gradient" label="Gradient"></sg-divider>
    </div>
  `,
  };
var m, f, h;
l.parameters = {
  ...l.parameters,
  docs: {
    ...((m = l.parameters) == null ? void 0 : m.docs),
    source: {
      originalSource: `{
  render: args => html\`<sg-divider variant=\${args.variant || 'glass'} label=\${args.label || ''} label-position=\${args.labelPosition || 'center'}></sg-divider>\`,
  args: {
    variant: 'glass',
    label: '',
    labelPosition: 'center'
  }
}`,
      ...((h = (f = l.parameters) == null ? void 0 : f.docs) == null ? void 0 : h.source),
    },
  },
};
var u, x, y;
d.parameters = {
  ...d.parameters,
  docs: {
    ...((u = d.parameters) == null ? void 0 : u.docs),
    source: {
      originalSource: '{\n  render: () => html`<sg-divider label="Section"></sg-divider>`\n}',
      ...((y = (x = d.parameters) == null ? void 0 : x.docs) == null ? void 0 : y.source),
    },
  },
};
var P, $, S;
n.parameters = {
  ...n.parameters,
  docs: {
    ...((P = n.parameters) == null ? void 0 : P.docs),
    source: {
      originalSource:
        '{\n  render: () => html`<sg-divider variant="gradient" label="Spectra"></sg-divider>`\n}',
      ...((S = ($ = n.parameters) == null ? void 0 : $.docs) == null ? void 0 : S.source),
    },
  },
};
var k, w, G;
o.parameters = {
  ...o.parameters,
  docs: {
    ...((k = o.parameters) == null ? void 0 : k.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <div style="display:flex;flex-direction:column;gap:24px;padding:1rem;">
      <sg-divider variant="solid" label="Solid"></sg-divider>
      <sg-divider variant="glass" label="Glass"></sg-divider>
      <sg-divider variant="gradient" label="Gradient"></sg-divider>
    </div>
  \`
}`,
      ...((G = (w = o.parameters) == null ? void 0 : w.docs) == null ? void 0 : G.source),
    },
  },
};
const I = ['Default', 'WithLabel', 'Gradient', 'Variants'];
export {
  l as Default,
  n as Gradient,
  o as Variants,
  d as WithLabel,
  I as __namedExportsOrder,
  D as default,
};
