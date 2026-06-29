import { i as f, a as h, b as l } from './iframe-CIO0rj-b.js';
import { n as u } from './property-BDX7J2XP.js';
import { s as v } from './shared-C_d8Ah3H.js';
import './sg-icon-VvHdCeem.js';
import './preload-helper-Dp1pzeXC.js';
import './directive-CvdRHFdJ.js';
var b = Object.defineProperty,
  y = (e, a, o, c) => {
    for (var r = void 0, n = e.length - 1, m; n >= 0; n--) (m = e[n]) && (r = m(a, o, r) || r);
    return (r && b(a, o, r), r);
  };
const i = class i extends f {
  constructor() {
    (super(...arguments), (this.columns = 4));
  }
  render() {
    const a = Array.from({ length: this.columns }, (o, c) => c + 1);
    return l`
      <style>
        :host {
          --sg-footer-columns: ${this.columns};
        }
      </style>
      <footer class="footer">
        <div class="inner">
          <div class="grid">
            ${a.map(
              (o) => l`
                <div class="column"><slot name="column-${o}"></slot></div>
              `,
            )}
          </div>
          <div class="social"><slot name="social"></slot></div>
        </div>
        <div class="copyright"><slot name="copyright"></slot></div>
      </footer>
    `;
  }
};
i.styles = h`
    :host {
      display: block;
      width: 100%;
      font-family: var(--sg-font-family, 'Inter', -apple-system, sans-serif);
    }

    .footer {
      background: var(--sg-footer-bg, var(--sg-glass-bg, rgba(255, 255, 255, 0.08)));
      backdrop-filter: var(--sg-footer-blur, var(--sg-glass-blur, blur(20px)));
      -webkit-backdrop-filter: var(--sg-footer-blur, var(--sg-glass-blur, blur(20px)));
      border-top: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
    }

    .inner {
      max-width: var(--sg-max-width-lg, 1100px);
      margin: 0 auto;
      padding: 4rem var(--sg-section-gutter, 1.5rem) 0;
      box-sizing: border-box;
    }

    /* ─── Grid ─── */

    .grid {
      display: grid;
      grid-template-columns: repeat(var(--sg-footer-columns, 4), 1fr);
      gap: 2rem;
    }

    @media (max-width: 768px) {
      .grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 480px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }

    .column ::slotted(h3),
    .column ::slotted(h4) {
      color: var(--sg-footer-heading-color, var(--sg-text-primary, rgba(255, 255, 255, 0.9)));
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 1rem;
    }

    .column ::slotted(a),
    .column ::slotted(button) {
      display: block;
      color: var(--sg-footer-link-color, var(--sg-text-secondary, rgba(255, 255, 255, 0.6)));
      text-decoration: none;
      font-size: 0.9375rem;
      padding: 4px 0;
      ${v}
    }

    .column ::slotted(a:hover),
    .column ::slotted(button:hover) {
      color: var(--sg-footer-link-hover-color, var(--sg-text-primary, rgba(255, 255, 255, 0.9)));
    }

    /* ─── Social ─── */

    .social {
      display: flex;
      gap: 12px;
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
    }

    .social ::slotted(a) {
      color: var(--sg-text-secondary, rgba(255, 255, 255, 0.6));
      transition: color var(--sg-transition-fast, 150ms ease);
    }

    .social ::slotted(a:hover) {
      color: var(--sg-text-primary, rgba(255, 255, 255, 0.9));
    }

    /* ─── Copyright ─── */

    .copyright {
      text-align: center;
      padding: 2rem var(--sg-section-gutter, 1.5rem);
      color: var(--sg-footer-copyright-color, var(--sg-text-tertiary, rgba(255, 255, 255, 0.4)));
      font-size: 0.8125rem;
      border-top: 1px solid var(--sg-glass-border, rgba(255, 255, 255, 0.12));
    }

    .copyright ::slotted(*) {
      margin: 0;
    }
  `;
let t = i;
y([u({ type: Number })], t.prototype, 'columns');
customElements.define('sg-footer', t);
const A = {
    title: 'Components/SgFooter',
    component: 'sg-footer',
    argTypes: { columns: { control: { type: 'number', min: 1, max: 4 } } },
    parameters: {
      docs: {
        description: {
          component:
            'Multi-column footer with link columns, social icons slot, and copyright bar. Responsive — collapses from 4 to 2 to 1 columns.',
        },
      },
    },
  },
  s = {
    render: (e) => l`
    <sg-footer columns=${e.columns ?? 4}>
      <div slot="column-1">
        <h4>Product</h4>
        <a href="#">Features</a>
        <a href="#">Pricing</a>
        <a href="#">Changelog</a>
      </div>
      <div slot="column-2">
        <h4>Company</h4>
        <a href="#">About</a>
        <a href="#">Blog</a>
        <a href="#">Careers</a>
      </div>
      <div slot="column-3">
        <h4>Resources</h4>
        <a href="#">Documentation</a>
        <a href="#">API Reference</a>
        <a href="#">Community</a>
      </div>
      <div slot="column-4">
        <h4>Legal</h4>
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
        <a href="#">Cookies</a>
      </div>
      <a slot="social" href="#" aria-label="Twitter"><sg-icon name="external-link" size="sm"></sg-icon></a>
      <a slot="social" href="#" aria-label="GitHub"><sg-icon name="external-link" size="sm"></sg-icon></a>
      <span slot="copyright">&copy; 2026 Spectra Glass UI. All rights reserved.</span>
    </sg-footer>
  `,
    args: { columns: 4 },
  };
var g, d, p;
s.parameters = {
  ...s.parameters,
  docs: {
    ...((g = s.parameters) == null ? void 0 : g.docs),
    source: {
      originalSource: `{
  render: args => html\`
    <sg-footer columns=\${args.columns ?? 4}>
      <div slot="column-1">
        <h4>Product</h4>
        <a href="#">Features</a>
        <a href="#">Pricing</a>
        <a href="#">Changelog</a>
      </div>
      <div slot="column-2">
        <h4>Company</h4>
        <a href="#">About</a>
        <a href="#">Blog</a>
        <a href="#">Careers</a>
      </div>
      <div slot="column-3">
        <h4>Resources</h4>
        <a href="#">Documentation</a>
        <a href="#">API Reference</a>
        <a href="#">Community</a>
      </div>
      <div slot="column-4">
        <h4>Legal</h4>
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
        <a href="#">Cookies</a>
      </div>
      <a slot="social" href="#" aria-label="Twitter"><sg-icon name="external-link" size="sm"></sg-icon></a>
      <a slot="social" href="#" aria-label="GitHub"><sg-icon name="external-link" size="sm"></sg-icon></a>
      <span slot="copyright">&copy; 2026 Spectra Glass UI. All rights reserved.</span>
    </sg-footer>
  \`,
  args: {
    columns: 4
  }
}`,
      ...((p = (d = s.parameters) == null ? void 0 : d.docs) == null ? void 0 : p.source),
    },
  },
};
const $ = ['Default'];
export { s as Default, $ as __namedExportsOrder, A as default };
