import { i as B, a as A, b as r } from './iframe-CIO0rj-b.js';
import { n as w } from './property-BDX7J2XP.js';
import { e as S } from './class-map-BIM98jav.js';
import './sg-button-Biw0GznS.js';
import './preload-helper-Dp1pzeXC.js';
import './directive-CvdRHFdJ.js';
import './shared-C_d8Ah3H.js';
import './sg-spinner-jN4t8AzK.js';
var $ = Object.defineProperty,
  k = (t, a, c, j) => {
    for (var e = void 0, l = t.length - 1, d; l >= 0; l--) (d = t[l]) && (e = d(a, c, e) || e);
    return (e && $(a, c, e), e);
  };
const g = class g extends B {
  constructor() {
    (super(...arguments), (this.align = 'center'), (this.overlay = !0));
  }
  render() {
    const a = {
      content: !0,
      'content--center': this.align === 'center',
      'content--left': this.align === 'left',
    };
    return r`
      <section class="hero">
        <!-- Background media slot -->
        <div class="media">
          <slot name="media"></slot>
        </div>

        <!-- Gradient overlay -->
        ${this.overlay ? r`<div class="overlay"></div>` : ''}

        <!-- Foreground content -->
        <div class=${S(a)}>
          <div class="heading"><slot name="heading"></slot></div>
          <div class="subtitle"><slot name="subtitle"></slot></div>
          <div class="actions">
            <slot name="cta-primary"></slot>
            <slot name="cta-secondary"></slot>
          </div>
          <slot name="extra"></slot>
        </div>
      </section>
    `;
  }
};
g.styles = A`
    :host {
      display: block;
      width: 100%;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
      position: relative;
      overflow: hidden;
    }

    .hero {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: var(--sg-hero-min-height, 80vh);
      padding: 4rem 1.5rem;
      box-sizing: border-box;
    }

    /* ─── Background media ─── */

    .media {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .media ::slotted(img),
    .media ::slotted(video) {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* ─── Gradient overlay ─── */

    .overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        transparent 0%,
        var(--sg-hero-overlay, rgba(0, 0, 0, 0.5)) 100%
      );
      pointer-events: none;
    }

    /* ─── Content ─── */

    .content {
      position: relative;
      z-index: 1;
      max-width: var(--sg-max-width-md, 800px);
      width: 100%;
    }

    .content--center {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .content--left {
      text-align: left;
    }

    .heading {
      font-size: var(--sg-hero-heading-size, clamp(2.5rem, 6vw, 4.5rem));
      font-weight: 700;
      line-height: 1.1;
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
      margin: 0 0 1rem;
      letter-spacing: -0.02em;
    }

    .subtitle {
      font-size: var(--sg-hero-subtitle-size, clamp(1rem, 2vw, 1.25rem));
      line-height: 1.6;
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
      margin: 0 0 2rem;
      max-width: 600px;
    }

    .content--center .subtitle {
      margin-left: auto;
      margin-right: auto;
    }

    .actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .content--center .actions {
      justify-content: center;
    }

    .actions ::slotted([slot='cta-primary']) {
      --sg-button-primary-bg: var(
        --sg-gradient-spectral-strong,
        linear-gradient(135deg, rgba(212, 134, 159, 0.75), rgba(196, 160, 80, 0.75), rgba(127, 168, 141, 0.75), rgba(122, 128, 192, 0.75))
      );
    }
  `;
let o = g;
k([w({ type: String })], o.prototype, 'align');
k([w({ type: Boolean })], o.prototype, 'overlay');
customElements.define('sg-hero', o);
const P = {
    title: 'Components/SgHero',
    component: 'sg-hero',
    argTypes: {
      align: { control: 'select', options: ['left', 'center'] },
      overlay: { control: 'boolean' },
    },
    parameters: {
      docs: {
        description: {
          component:
            'Hero section with headline, subtitle, CTA slots, optional background media, and gradient overlay.',
        },
      },
    },
  },
  n = {
    render: (t) => r`
    <sg-hero align=${t.align || 'center'} ?overlay=${t.overlay ?? !0}>
      <h1 slot="heading">Build Something Great</h1>
      <p slot="subtitle">A glass‑themed component library for modern web experiences.</p>
      <sg-button slot="cta-primary" variant="primary">Get Started</sg-button>
      <sg-button slot="cta-secondary" variant="ghost">Learn More</sg-button>
    </sg-hero>
  `,
    args: { align: 'center', overlay: !0 },
  },
  s = {
    render: () => r`
    <sg-hero align="left">
      <h1 slot="heading">Left‑aligned Hero</h1>
      <p slot="subtitle">Perfect for landing pages with lots of copy.</p>
      <sg-button slot="cta-primary" variant="primary">Action</sg-button>
    </sg-hero>
  `,
  },
  i = {
    render: () => r`
    <sg-hero align="center">
      <img slot="media" src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80" alt="" style="width:100%;height:100%;object-fit:cover;" />
      <h1 slot="heading">Over Background</h1>
      <p slot="subtitle">The gradient overlay keeps text readable on any image.</p>
      <sg-button slot="cta-primary" variant="primary">Explore</sg-button>
    </sg-hero>
  `,
  };
var m, p, h;
n.parameters = {
  ...n.parameters,
  docs: {
    ...((m = n.parameters) == null ? void 0 : m.docs),
    source: {
      originalSource: `{
  render: args => html\`
    <sg-hero align=\${args.align || 'center'} ?overlay=\${args.overlay ?? true}>
      <h1 slot="heading">Build Something Great</h1>
      <p slot="subtitle">A glass‑themed component library for modern web experiences.</p>
      <sg-button slot="cta-primary" variant="primary">Get Started</sg-button>
      <sg-button slot="cta-secondary" variant="ghost">Learn More</sg-button>
    </sg-hero>
  \`,
  args: {
    align: 'center',
    overlay: true
  }
}`,
      ...((h = (p = n.parameters) == null ? void 0 : p.docs) == null ? void 0 : h.source),
    },
  },
};
var u, v, b;
s.parameters = {
  ...s.parameters,
  docs: {
    ...((u = s.parameters) == null ? void 0 : u.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <sg-hero align="left">
      <h1 slot="heading">Left‑aligned Hero</h1>
      <p slot="subtitle">Perfect for landing pages with lots of copy.</p>
      <sg-button slot="cta-primary" variant="primary">Action</sg-button>
    </sg-hero>
  \`
}`,
      ...((b = (v = s.parameters) == null ? void 0 : v.docs) == null ? void 0 : b.source),
    },
  },
};
var y, f, x;
i.parameters = {
  ...i.parameters,
  docs: {
    ...((y = i.parameters) == null ? void 0 : y.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <sg-hero align="center">
      <img slot="media" src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80" alt="" style="width:100%;height:100%;object-fit:cover;" />
      <h1 slot="heading">Over Background</h1>
      <p slot="subtitle">The gradient overlay keeps text readable on any image.</p>
      <sg-button slot="cta-primary" variant="primary">Explore</sg-button>
    </sg-hero>
  \`
}`,
      ...((x = (f = i.parameters) == null ? void 0 : f.docs) == null ? void 0 : x.source),
    },
  },
};
const T = ['Default', 'AlignLeft', 'WithBackgroundMedia'];
export {
  s as AlignLeft,
  n as Default,
  i as WithBackgroundMedia,
  T as __namedExportsOrder,
  P as default,
};
