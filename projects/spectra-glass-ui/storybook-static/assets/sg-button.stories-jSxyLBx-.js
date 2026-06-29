import { b as n } from './iframe-CIO0rj-b.js';
import './sg-button-Biw0GznS.js';
import './sg-spinner-jN4t8AzK.js';
import './preload-helper-Dp1pzeXC.js';
import './property-BDX7J2XP.js';
import './class-map-BIM98jav.js';
import './directive-CvdRHFdJ.js';
import './shared-C_d8Ah3H.js';
const C = {
    title: 'Components/SgButton',
    component: 'sg-button',
    argTypes: {
      variant: { control: 'select', options: ['primary', 'secondary', 'ghost'] },
      size: { control: 'select', options: ['sm', 'md', 'lg'] },
      disabled: { control: 'boolean' },
      loading: { control: 'boolean' },
    },
    parameters: {
      docs: {
        description: {
          component:
            'A glassmorphic button with spectral gradient background (primary), glass surface (secondary), or minimal style (ghost).',
        },
      },
    },
  },
  t = {
    render: (a) => n`
    <sg-button
      variant=${a.variant || 'primary'}
      size=${a.size || 'md'}
      ?disabled=${a.disabled}
      ?loading=${a.loading}
    >
      Button
    </sg-button>
  `,
    args: { variant: 'primary', size: 'md', disabled: !1, loading: !1 },
  },
  s = {
    render: (a) => n`
    <sg-button
      variant=${a.variant || 'secondary'}
      size=${a.size || 'md'}
      ?disabled=${a.disabled}
      ?loading=${a.loading}
    >
      Button
    </sg-button>
  `,
    args: { variant: 'secondary', size: 'md', disabled: !1, loading: !1 },
  },
  r = {
    render: (a) => n`
    <sg-button
      variant=${a.variant || 'ghost'}
      size=${a.size || 'md'}
      ?disabled=${a.disabled}
      ?loading=${a.loading}
    >
      Button
    </sg-button>
  `,
    args: { variant: 'ghost', size: 'md', disabled: !1, loading: !1 },
  },
  e = {
    render: () => n`
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <sg-button variant="primary" size="sm">Small</sg-button>
      <sg-button variant="primary" size="md">Medium</sg-button>
      <sg-button variant="primary" size="lg">Large</sg-button>
    </div>
  `,
  },
  o = {
    render: () => n`
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;gap:12px;">
        <sg-button variant="primary">Primary</sg-button>
        <sg-button variant="secondary">Secondary</sg-button>
        <sg-button variant="ghost">Ghost</sg-button>
      </div>
      <div style="display:flex;gap:12px;">
        <sg-button variant="primary" disabled>Primary</sg-button>
        <sg-button variant="secondary" disabled>Secondary</sg-button>
        <sg-button variant="ghost" disabled>Ghost</sg-button>
      </div>
      <div style="display:flex;gap:12px;">
        <sg-button variant="primary" loading>Primary</sg-button>
        <sg-button variant="secondary" loading>Secondary</sg-button>
        <sg-button variant="ghost" loading>Ghost</sg-button>
      </div>
    </div>
  `,
  },
  i = {
    render: () => n`
    <sg-button variant="primary" size="md" loading>Processing</sg-button>
  `,
  };
var d, g, l;
t.parameters = {
  ...t.parameters,
  docs: {
    ...((d = t.parameters) == null ? void 0 : d.docs),
    source: {
      originalSource: `{
  render: args => html\`
    <sg-button
      variant=\${args.variant || 'primary'}
      size=\${args.size || 'md'}
      ?disabled=\${args.disabled}
      ?loading=\${args.loading}
    >
      Button
    </sg-button>
  \`,
  args: {
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false
  }
}`,
      ...((l = (g = t.parameters) == null ? void 0 : g.docs) == null ? void 0 : l.source),
    },
  },
};
var m, p, u;
s.parameters = {
  ...s.parameters,
  docs: {
    ...((m = s.parameters) == null ? void 0 : m.docs),
    source: {
      originalSource: `{
  render: args => html\`
    <sg-button
      variant=\${args.variant || 'secondary'}
      size=\${args.size || 'md'}
      ?disabled=\${args.disabled}
      ?loading=\${args.loading}
    >
      Button
    </sg-button>
  \`,
  args: {
    variant: 'secondary',
    size: 'md',
    disabled: false,
    loading: false
  }
}`,
      ...((u = (p = s.parameters) == null ? void 0 : p.docs) == null ? void 0 : u.source),
    },
  },
};
var b, c, y;
r.parameters = {
  ...r.parameters,
  docs: {
    ...((b = r.parameters) == null ? void 0 : b.docs),
    source: {
      originalSource: `{
  render: args => html\`
    <sg-button
      variant=\${args.variant || 'ghost'}
      size=\${args.size || 'md'}
      ?disabled=\${args.disabled}
      ?loading=\${args.loading}
    >
      Button
    </sg-button>
  \`,
  args: {
    variant: 'ghost',
    size: 'md',
    disabled: false,
    loading: false
  }
}`,
      ...((y = (c = r.parameters) == null ? void 0 : c.docs) == null ? void 0 : y.source),
    },
  },
};
var v, f, z;
e.parameters = {
  ...e.parameters,
  docs: {
    ...((v = e.parameters) == null ? void 0 : v.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <sg-button variant="primary" size="sm">Small</sg-button>
      <sg-button variant="primary" size="md">Medium</sg-button>
      <sg-button variant="primary" size="lg">Large</sg-button>
    </div>
  \`
}`,
      ...((z = (f = e.parameters) == null ? void 0 : f.docs) == null ? void 0 : z.source),
    },
  },
};
var h, x, $;
o.parameters = {
  ...o.parameters,
  docs: {
    ...((h = o.parameters) == null ? void 0 : h.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;gap:12px;">
        <sg-button variant="primary">Primary</sg-button>
        <sg-button variant="secondary">Secondary</sg-button>
        <sg-button variant="ghost">Ghost</sg-button>
      </div>
      <div style="display:flex;gap:12px;">
        <sg-button variant="primary" disabled>Primary</sg-button>
        <sg-button variant="secondary" disabled>Secondary</sg-button>
        <sg-button variant="ghost" disabled>Ghost</sg-button>
      </div>
      <div style="display:flex;gap:12px;">
        <sg-button variant="primary" loading>Primary</sg-button>
        <sg-button variant="secondary" loading>Secondary</sg-button>
        <sg-button variant="ghost" loading>Ghost</sg-button>
      </div>
    </div>
  \`
}`,
      ...(($ = (x = o.parameters) == null ? void 0 : x.docs) == null ? void 0 : $.source),
    },
  },
};
var S, P, G;
i.parameters = {
  ...i.parameters,
  docs: {
    ...((S = i.parameters) == null ? void 0 : S.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <sg-button variant="primary" size="md" loading>Processing</sg-button>
  \`
}`,
      ...((G = (P = i.parameters) == null ? void 0 : P.docs) == null ? void 0 : G.source),
    },
  },
};
const E = ['Primary', 'Secondary', 'Ghost', 'Sizes', 'AllVariants', 'Loading'];
export {
  o as AllVariants,
  r as Ghost,
  i as Loading,
  t as Primary,
  s as Secondary,
  e as Sizes,
  E as __namedExportsOrder,
  C as default,
};
