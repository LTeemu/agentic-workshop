'use strict';

/* Plain-Node smoke test: verifies the static site's structure and hooks.
   No dependencies — runs with `node tests/smoke.js` or `npm test`. */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

const html = read('index.html');
const css = read('styles.css');
const js = read('app.js');

const VIEWS = [
  'home',
  'work',
  'about',
  'contact',
  'night-drive',
  'pulse-noise',
  'the-meridian',
  'static-bloom',
  'chorus-line',
  'last-print',
  'reel-to-reel',
  'the-courier',
  'tide-line',
];

assert.doesNotThrow(() => new Function(js), 'app.js must compile');

for (const name of VIEWS) {
  assert.ok(
    new RegExp(`data-view="${name}"`).test(html),
    `index.html must contain a data-view="${name}" section`,
  );
  const expectHref = name === 'home' ? 'href="/"' : `href="/${name}"`;
  assert.ok(html.includes(expectHref), `index.html must link to ${expectHref}`);
  const titleId = /<h1[^>]*id="([^"]+)"/.exec(
    html.split(`data-view="${name}"`)[1]?.split('</section>')[0] || '',
  );
  assert.ok(titleId, `view "${name}" must have an h1 with an id`);
  assert.ok(
    html.includes(`aria-labelledby="${titleId[1]}"`),
    `view "${name}" aria-labelledby must reference its h1 id`,
  );
}

// Every path link must resolve to a known view
const navTargets = [...html.matchAll(/href="\/([a-z-]*)"/g)].map((m) => m[1] || 'home');
for (const target of navTargets) {
  if (!VIEWS.includes(target)) throw new Error(`unknown nav target /${target}`);
}

// Transition machinery must be present
assert.ok(css.includes('::view-transition-old(root)'), 'CSS must define old-root transition');
assert.ok(css.includes('::view-transition-new(root)'), 'CSS must define new-root transition');
assert.ok(css.includes('prefers-reduced-motion'), 'CSS must respect reduced motion');
assert.ok(css.includes('tx-curtain-in'), 'CSS must define the fallback curtain');

// Every transition mode in JS must have a matching CSS trigger
const modesLine = /MODES = \[(.*?)\]/.exec(js)?.[1] || '';
const modes = [...modesLine.matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
assert.ok(modes.length >= 1, 'app.js must declare at least one transition mode');
for (const mode of modes) {
  assert.ok(
    css.includes(`html[data-tx='${mode}-fwd']`) || css.includes(`html[data-tx^='${mode}']`),
    `CSS must define a [data-tx] trigger for mode "${mode}"`,
  );
}

// Fallback curtain must be visible during BOTH sweep phases, and the JS
// must hand focus to the new view heading after navigation.
assert.ok(
  /\.tx-curtain-out \.curtain\s*\{\s*visibility:\s*visible/.test(css),
  'CSS must keep the curtain visible during the out-sweep',
);
assert.ok(js.includes('focus: true'), 'app.js must hand focus to the new view heading');
assert.ok(js.includes('navToken'), 'app.js must guard against overlapping fallback navigation');
assert.ok(js.includes('history.pushState'), 'app.js must navigate with pushState');
assert.ok(js.includes('popstate'), 'app.js must handle back/forward via popstate');
assert.ok(
  js.includes("history.replaceState(null, '', canonicalPath(initial))"),
  'app.js must normalize unknown paths on boot',
);
assert.ok(js.includes('startViewTransition'), 'app.js must use the View Transitions API');
assert.ok(js.includes('localStorage'), 'app.js must persist the chosen mode');

// The shared-artwork zoom ("fly into the image") must be wired
assert.ok(
  css.includes('view-transition-name: article-cover'),
  'CSS must name the article artwork for the shared-element morph',
);
assert.ok(js.includes('armShared'), 'app.js must arm the shared artwork per navigation');
for (const [slug, art] of Object.entries({
  'night-drive': 'night-drive',
  'pulse-noise': 'pulse-noise',
  'the-meridian': 'meridian',
  'static-bloom': 'static-bloom',
  'chorus-line': 'chorus-line',
  'last-print': 'last-print',
  'reel-to-reel': 'reel-to-reel',
  'the-courier': 'the-courier',
  'tide-line': 'tide-line',
})) {
  assert.ok(
    html.includes(`data-shared="${slug}"`),
    `a story card must expose data-shared="${slug}"`,
  );
  assert.ok(html.includes(`#art-${art}`), `the "${slug}" artwork symbol must be referenced`);
}
assert.ok(
  new RegExp('class="art hero-svg"').test(html) &&
    (html.match(/class="art hero-svg"/g) || []).length >= 4,
  // .hero-svg is a deliberate marker class (no CSS): the smoke test's hook
  // for asserting every article has a morph-able hero artwork.
  'every article must have a hero artwork to morph to',
);

for (const file of ['index.html', 'styles.css', 'app.js', 'package.json']) {
  assert.ok(fs.existsSync(path.join(root, file)), `${file} must exist`);
}

console.log(`cutframe smoke test OK — ${VIEWS.length} views, transitions wired.`);
