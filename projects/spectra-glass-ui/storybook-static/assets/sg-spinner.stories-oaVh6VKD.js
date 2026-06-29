import { b as i } from './iframe-CIO0rj-b.js';
import './sg-spinner-jN4t8AzK.js';
import './preload-helper-Dp1pzeXC.js';
import './property-BDX7J2XP.js';
import './class-map-BIM98jav.js';
import './directive-CvdRHFdJ.js';
const G = {
    title: 'Components/SgSpinner',
    component: 'sg-spinner',
    argTypes: {
      size: { control: 'select', options: ['sm', 'md', 'lg'] },
      variant: { control: 'select', options: ['spectral', 'glass'] },
    },
    parameters: {
      docs: {
        description: {
          component:
            'An animated loading spinner. The `spectral` variant uses four different spectral border colours for a rainbow rotation effect.',
        },
      },
    },
  },
  e = {
    render: (s) => i`
    <sg-spinner size=${s.size || 'md'} variant=${s.variant || 'spectral'}></sg-spinner>
  `,
    args: { size: 'md', variant: 'spectral' },
  },
  r = {
    render: (s) => i`
    <sg-spinner size=${s.size || 'md'} variant=${s.variant || 'glass'}></sg-spinner>
  `,
    args: { size: 'md', variant: 'glass' },
  },
  n = {
    render: () => i`
    <div style="display:flex;align-items:center;gap:16px;">
      <sg-spinner size="sm" variant="spectral"></sg-spinner>
      <sg-spinner size="md" variant="spectral"></sg-spinner>
      <sg-spinner size="lg" variant="spectral"></sg-spinner>
    </div>
  `,
  },
  a = {
    render: () => i`
    <div style="display:flex;align-items:center;gap:16px;">
      <sg-spinner size="md" variant="spectral"></sg-spinner>
      <sg-spinner size="md" variant="glass"></sg-spinner>
    </div>
  `,
  };
var t, p, o;
e.parameters = {
  ...e.parameters,
  docs: {
    ...((t = e.parameters) == null ? void 0 : t.docs),
    source: {
      originalSource: `{
  render: args => html\`
    <sg-spinner size=\${args.size || 'md'} variant=\${args.variant || 'spectral'}></sg-spinner>
  \`,
  args: {
    size: 'md',
    variant: 'spectral'
  }
}`,
      ...((o = (p = e.parameters) == null ? void 0 : p.docs) == null ? void 0 : o.source),
    },
  },
};
var g, c, l;
r.parameters = {
  ...r.parameters,
  docs: {
    ...((g = r.parameters) == null ? void 0 : g.docs),
    source: {
      originalSource: `{
  render: args => html\`
    <sg-spinner size=\${args.size || 'md'} variant=\${args.variant || 'glass'}></sg-spinner>
  \`,
  args: {
    size: 'md',
    variant: 'glass'
  }
}`,
      ...((l = (c = r.parameters) == null ? void 0 : c.docs) == null ? void 0 : l.source),
    },
  },
};
var d, m, v;
n.parameters = {
  ...n.parameters,
  docs: {
    ...((d = n.parameters) == null ? void 0 : d.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <div style="display:flex;align-items:center;gap:16px;">
      <sg-spinner size="sm" variant="spectral"></sg-spinner>
      <sg-spinner size="md" variant="spectral"></sg-spinner>
      <sg-spinner size="lg" variant="spectral"></sg-spinner>
    </div>
  \`
}`,
      ...((v = (m = n.parameters) == null ? void 0 : m.docs) == null ? void 0 : v.source),
    },
  },
};
var z, u, f;
a.parameters = {
  ...a.parameters,
  docs: {
    ...((z = a.parameters) == null ? void 0 : z.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <div style="display:flex;align-items:center;gap:16px;">
      <sg-spinner size="md" variant="spectral"></sg-spinner>
      <sg-spinner size="md" variant="glass"></sg-spinner>
    </div>
  \`
}`,
      ...((f = (u = a.parameters) == null ? void 0 : u.docs) == null ? void 0 : f.source),
    },
  },
};
const T = ['Spectral', 'Glass', 'Sizes', 'Variants'];
export {
  r as Glass,
  n as Sizes,
  e as Spectral,
  a as Variants,
  T as __namedExportsOrder,
  G as default,
};
