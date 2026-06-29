import { A as w, E as p, i as v, a as u, b as c } from './iframe-CIO0rj-b.js';
import { n as d } from './property-BDX7J2XP.js';
import { e as a, i as x, t as k } from './directive-CvdRHFdJ.js';
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */ class r extends x {
  constructor(t) {
    if ((super(t), (this.it = w), t.type !== k.CHILD))
      throw Error(this.constructor.directiveName + '() can only be used in child bindings');
  }
  render(t) {
    if (t === w || t == null) return ((this._t = void 0), (this.it = t));
    if (t === p) return t;
    if (typeof t != 'string')
      throw Error(this.constructor.directiveName + '() called with a non-string value');
    if (t === this.it) return this._t;
    this.it = t;
    const e = [t];
    return (
      (e.raw = e),
      (this._t = { _$litType$: this.constructor.resultType, strings: e, values: [] })
    );
  }
}
((r.directiveName = 'unsafeHTML'), (r.resultType = 1));
const y = a(r);
var m = Object.defineProperty,
  g = (n, t, e, j) => {
    for (var o = void 0, s = n.length - 1, h; s >= 0; s--) (h = n[s]) && (o = h(t, e, o) || o);
    return (o && m(t, e, o), o);
  };
const f = {
    menu: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    close:
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    'chevron-down':
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    'chevron-up':
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>',
    'chevron-left':
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    'chevron-right':
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    check:
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    'external-link':
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
  },
  C = { sm: '16px', md: '24px', lg: '32px' },
  l = class l extends v {
    constructor() {
      (super(...arguments), (this.name = ''), (this.size = 'md'));
    }
    render() {
      const t = C[this.size] ?? '24px',
        e = this.name ? f[this.name] : null;
      return c`
      <style>
        :host {
          --sg-icon-size: ${t};
        }
      </style>
      ${e ? y(e) : c`<slot></slot>`}
    `;
    }
  };
l.styles = u`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: var(--sg-icon-size, 24px);
      height: var(--sg-icon-size, 24px);
      color: var(--sg-icon-color, currentColor);
    }

    svg {
      width: 100%;
      height: 100%;
      display: block;
    }

    ::slotted(svg) {
      width: 100%;
      height: 100%;
      display: block;
    }
  `;
let i = l;
g([d({ type: String })], i.prototype, 'name');
g([d({ type: String })], i.prototype, 'size');
customElements.define('sg-icon', i);
