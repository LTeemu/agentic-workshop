import { b as o } from './iframe-CIO0rj-b.js';
import './sg-icon-VvHdCeem.js';
import './preload-helper-Dp1pzeXC.js';
import './property-BDX7J2XP.js';
import './directive-CvdRHFdJ.js';
const z = {
    title: 'Components/SgIcon',
    component: 'sg-icon',
    argTypes: {
      name: {
        control: 'select',
        options: [
          'menu',
          'close',
          'chevron-down',
          'chevron-up',
          'chevron-left',
          'chevron-right',
          'check',
          'external-link',
        ],
      },
      size: { control: 'select', options: ['sm', 'md', 'lg'] },
    },
    parameters: {
      docs: {
        description: {
          component:
            'Feather-style SVG icon wrapper. Use the `name` prop for built-in icons, or slot a custom SVG for ad-hoc icons.',
        },
      },
    },
  },
  n = {
    render: (e) => o`<sg-icon name=${e.name || 'menu'} size=${e.size || 'md'}></sg-icon>`,
    args: { name: 'menu', size: 'md' },
  },
  s = {
    render: () => o`
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;padding:1rem;">
      ${[
        'menu',
        'close',
        'chevron-down',
        'chevron-up',
        'chevron-left',
        'chevron-right',
        'check',
        'external-link',
      ].map(
        (e) => o`
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
            <sg-icon name=${e} size="lg"></sg-icon>
            <span style="font-size:0.75rem;color:rgba(255,255,255,0.5);">${e}</span>
          </div>
        `,
      )}
    </div>
  `,
  },
  r = {
    render: () => o`
    <div style="display:flex;gap:16px;align-items:center;padding:1rem;">
      <sg-icon name="check" size="sm"></sg-icon>
      <sg-icon name="check" size="md"></sg-icon>
      <sg-icon name="check" size="lg"></sg-icon>
    </div>
  `,
  };
var c, i, a;
n.parameters = {
  ...n.parameters,
  docs: {
    ...((c = n.parameters) == null ? void 0 : c.docs),
    source: {
      originalSource: `{
  render: args => html\`<sg-icon name=\${args.name || 'menu'} size=\${args.size || 'md'}></sg-icon>\`,
  args: {
    name: 'menu',
    size: 'md'
  }
}`,
      ...((a = (i = n.parameters) == null ? void 0 : i.docs) == null ? void 0 : a.source),
    },
  },
};
var t, m, l;
s.parameters = {
  ...s.parameters,
  docs: {
    ...((t = s.parameters) == null ? void 0 : t.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;padding:1rem;">
      \${['menu', 'close', 'chevron-down', 'chevron-up', 'chevron-left', 'chevron-right', 'check', 'external-link'].map(name => html\`
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
            <sg-icon name=\${name} size="lg"></sg-icon>
            <span style="font-size:0.75rem;color:rgba(255,255,255,0.5);">\${name}</span>
          </div>
        \`)}
    </div>
  \`
}`,
      ...((l = (m = s.parameters) == null ? void 0 : m.docs) == null ? void 0 : l.source),
    },
  },
};
var p, d, g;
r.parameters = {
  ...r.parameters,
  docs: {
    ...((p = r.parameters) == null ? void 0 : p.docs),
    source: {
      originalSource: `{
  render: () => html\`
    <div style="display:flex;gap:16px;align-items:center;padding:1rem;">
      <sg-icon name="check" size="sm"></sg-icon>
      <sg-icon name="check" size="md"></sg-icon>
      <sg-icon name="check" size="lg"></sg-icon>
    </div>
  \`
}`,
      ...((g = (d = r.parameters) == null ? void 0 : d.docs) == null ? void 0 : g.source),
    },
  },
};
const y = ['Default', 'AllIcons', 'Sizes'];
export { s as AllIcons, n as Default, r as Sizes, y as __namedExportsOrder, z as default };
