(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const vtOk = 'startViewTransition' in document;
  const views = Array.from(document.querySelectorAll('[data-view]'));
  const navLinks = Array.from(document.querySelectorAll('[data-nav]'));
  const live = document.getElementById('live');
  const stripView = document.getElementById('stripView');
  const modeBtns = Array.from(document.querySelectorAll('.modebox'));
  const modeLabels = Array.from(document.querySelectorAll('.modeLabel'));

  const MODES = ['blinds', 'wipe', 'slam', 'zoom'];
  const STORE_KEY = 'cutframe-tx';
  const BASE_VIEWS = ['home', 'work', 'about', 'contact'];

  const SCENES = {
    home: 'SC. 00 — FRONT PAGE',
    work: 'SC. 01 — THE INDEX',
    about: 'SC. 02 — THE HOUSE',
    contact: 'SC. 03 — CLASSIFIEDS',
    'night-drive': 'SC. 04 — NIGHT DRIVE',
    'pulse-noise': 'SC. 05 — PULSE / NOISE',
    'the-meridian': 'SC. 06 — MERIDIAN',
    'static-bloom': 'SC. 07 — STATIC BLOOM',
  };
  const TITLES = {
    home: 'Cutframe — The Daily Cut',
    work: 'All stories — Cutframe',
    about: 'About the house — Cutframe',
    contact: 'Classifieds — Cutframe',
    'night-drive': 'Night Drive — Cutframe',
    'pulse-noise': 'Pulse / Noise — Cutframe',
    'the-meridian': 'The Meridian — Cutframe',
    'static-bloom': 'Static Bloom — Cutframe',
  };
  const DESCRIPTIONS = {
    home: 'The Daily Cut — a newspaper front page from the Cutframe editing and motion studio.',
    work: 'All stories from The Daily Cut: films, music videos and brand work.',
    about: 'A two-person edit house for films, music videos and brand work.',
    contact: 'Reach the Cutframe studio — classifieds and replies within a cut.',
    'night-drive': 'Night Drive — a 4-minute short about the space between exits.',
    'pulse-noise': 'Pulse / Noise — a music video cut on the beat of a boiler room.',
    'the-meridian': 'The Meridian — a brand film about noon, cut from twelve months of waiting.',
    'static-bloom': 'Static Bloom — a soft horror short about a flower and 60 hertz of snow.',
  };

  const metaDesc = document.querySelector('meta[name="description"]');
  const viewOrder = views.map((v) => v.dataset.view);
  const isArticle = (name) => !BASE_VIEWS.includes(name);
  const isListing = (name) => name === 'home' || name === 'work';

  let last = null;
  let mode = 0;
  let navToken = 0;
  let sharedEl = null;

  function storeGet(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null; /* storage unavailable (e.g. sandboxed iframe) */
    }
  }

  function storeSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage unavailable — prefer session-local mode */
    }
  }

  /** Split headline text into per-character spans for the staggered reveal. */
  function splitChars() {
    document.querySelectorAll('.split').forEach((el) => {
      if (el.querySelector('.ch')) return;
      const chars = Array.from(el.textContent);
      el.textContent = '';
      for (const [i, ch] of chars.entries()) {
        const span = document.createElement('span');
        span.className = 'ch';
        span.style.setProperty('--i', i);
        span.textContent = ch === ' ' ? '\u00A0' : ch;
        el.appendChild(span);
      }
    });
  }

  /** Canonical path for a view name — home is the bare root. */
  function canonicalPath(name) {
    return name === 'home' ? '/' : `/${name}`;
  }

  /** Resolve the current pathname to a known view name, defaulting to home. */
  function currentName() {
    let path = '';
    try {
      path = decodeURIComponent(location.pathname);
    } catch {
      return 'home'; /* malformed percent-encoding, e.g. "/%E0%A4" */
    }
    const name = path.replace(/^\/+|\/+$/g, '') || 'home';
    return viewOrder.includes(name) ? name : 'home';
  }

  /** The card artwork for `article` inside `viewName`, if any. */
  function cardShare(viewName, articleName) {
    if (!viewName) return null;
    return document.querySelector(`.view[data-view="${viewName}"] [data-shared="${articleName}"]`);
  }

  /**
   * Tag the story artwork that should morph across the transition so the
   * reader flies INTO the image (listing → article) and back OUT of it
   * (article → listing). Article-to-article hops morph hero to hero, which
   * the CSS name on .hero-svg provides on its own.
   */
  function armShared(target, source) {
    disarmShared();
    let el = null;
    if (isArticle(target) && isListing(source)) el = cardShare(source, target);
    else if (isListing(target) && isArticle(source)) el = cardShare(target, source);
    if (el) {
      el.style.viewTransitionName = 'article-cover';
      sharedEl = el;
    }
  }

  function disarmShared() {
    if (sharedEl) {
      sharedEl.style.removeProperty('view-transition-name');
      sharedEl = null;
    }
  }

  function activate(name, opts = {}) {
    const view = views.find((v) => v.dataset.view === name);
    if (!view) return false;

    views.forEach((v) => v.classList.toggle('is-active', v === view));
    navLinks.forEach((a) =>
      a.classList.toggle('active', a.getAttribute('href') === canonicalPath(name)),
    );
    document.title = TITLES[name] || TITLES.home;
    if (metaDesc) metaDesc.setAttribute('content', DESCRIPTIONS[name] || DESCRIPTIONS.home);
    if (stripView) stripView.textContent = SCENES[name];

    if (opts.announce && live) {
      live.textContent = `${SCENES[name]} — ${name}`;
    }
    if (opts.focus) {
      const heading = view.querySelector('h1');
      if (heading) heading.focus({ preventScroll: true });
    }
    if (name === 'contact') {
      // Re-arm the visual-only form on each visit.
      const btn = contactForm && contactForm.querySelector('.form-send');
      if (btn) {
        btn.textContent = 'Send telegram →';
        btn.disabled = false;
      }
    }
    return true;
  }

  /** Swap the visible view — the URL is already in place before this runs. */
  function swapTo(name, announce) {
    activate(name, { announce, focus: true });
  }

  function cleanupFallback() {
    root.classList.remove('tx-curtain-in', 'tx-curtain-out');
    delete root.dataset.tx;
  }

  /** Fallback shutter-curtain when the View Transitions API is unavailable. */
  function fallbackTo(name, token) {
    return new Promise((resolve) => {
      root.classList.add('tx-curtain-in');
      setTimeout(() => {
        // A newer navigation took over — leave its curtain alone.
        if (token !== navToken) return resolve();
        swapTo(name, true);
        root.classList.remove('tx-curtain-in');
        root.classList.add('tx-curtain-out');
        setTimeout(() => {
          if (token !== navToken) return resolve();
          cleanupFallback();
          resolve();
        }, 520);
      }, 480);
    });
  }

  async function navigate(to, dir) {
    const token = ++navToken;
    root.dataset.tx = `${currentMode()}-${dir}`;
    try {
      if (reduceMotion.matches) {
        swapTo(to, true);
        return;
      }
      if (vtOk) {
        try {
          await document.startViewTransition(() => swapTo(to, true)).finished;
        } catch (err) {
          // Interrupted by a newer navigation — popstate handles it. Any
          // other failure means the callback didn't land; restore the view.
          if (!err || err.name !== 'AbortError') activate(to);
        }
        return;
      }
      await fallbackTo(to, token);
    } finally {
      if (token === navToken) {
        delete root.dataset.tx;
        disarmShared();
      }
    }
  }

  /** Navigate to a view, animating and tracking back/forward direction. */
  function go(name) {
    if (name === last) return;
    const dir = viewOrder.indexOf(name) >= viewOrder.indexOf(last) ? 'fwd' : 'back';
    armShared(name, last);
    last = name;
    navigate(name, dir).catch(() => activate(name));
  }

  function handleRouteChange() {
    go(currentName());
  }

  /* ---- transition mode cycling ---- */

  function currentMode() {
    return MODES[mode] || MODES[0];
  }

  function cycleMode() {
    mode = (mode + 1) % MODES.length;
    const name = currentMode();
    modeLabels.forEach((l) => (l.textContent = name));
    if (live) live.textContent = `Transition style: ${name}`;
    storeSet(STORE_KEY, name);
  }

  function initMode() {
    const saved = storeGet(STORE_KEY);
    mode = Math.max(0, MODES.indexOf(saved));
    modeLabels.forEach((l) => (l.textContent = currentMode()));
  }

  /* ---- wiring ---- */

  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-nav]');
    if (!link) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const href = link.getAttribute('href');
    if (href === location.pathname) return;
    const name = viewOrder.find((v) => canonicalPath(v) === href);
    if (!name) return; /* unknown href — let the browser navigate normally */
    e.preventDefault();
    history.pushState(null, '', href);
    go(name);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 't' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      cycleMode();
    }
  });

  modeBtns.forEach((b) => b.addEventListener('click', cycleMode));

  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault(); // visual-only form — nothing is sent anywhere
      const btn = contactForm.querySelector('.form-send');
      if (btn) {
        btn.textContent = 'Sent — cutting a reply';
        btn.disabled = true;
      }
    });
  }

  splitChars();
  initMode();

  const initial = currentName();
  last = initial;
  if (location.pathname !== canonicalPath(initial)) {
    // Normalize unknown paths, trailing slashes, and malformed encodings.
    history.replaceState(null, '', canonicalPath(initial));
  }
  if (!activate(initial)) {
    // Fail-safe: never leave the page blank when the router can't start.
    root.classList.remove('js');
  }
  window.addEventListener('popstate', handleRouteChange);
})();
