/* ========================================================================
   Spotify Playlist Analyzer — Interactive Behaviors
   ======================================================================== */

// -----------------------------------------------------------------------
// Chart.js — Shared styling helpers (used by page template chart scripts)
// -----------------------------------------------------------------------
// Charts are constructed inside page scripts whose DOMContentLoaded handlers
// run before this file's (it loads at the end of body), so every Chart.js
// default below must be set here, at top level, to apply to first render.
const COLORS = {
  accent: '#E2472B',
  accentDeep: '#B9341C',
  gold: '#C08A2D',
  goldDim: '#9A6F24',
  rust: '#B2557C',
  burntOrange: '#9C5A2F',
  teal: '#2E7D6B',
  tealDim: '#236052',
  olive: '#8A6B2F',
  plum: '#7A5AC9',
  text: '#F3EEE3',
  textMuted: '#5E5648',
  border: 'rgba(27, 23, 18, 0.10)',
  surface: '#1B1712',
};

if (window.Chart) {
  // Render canvases at ≥2× the device pixel ratio so the charts stay crisp
  // on any display and survive the dashboard's iframe downscaling.
  Chart.defaults.devicePixelRatio = Math.max(window.devicePixelRatio || 1, 2);
  // Match the site body font (--font-body); see the fonts.ready re-render
  // below for webfont loading.
  Chart.defaults.color = COLORS.textMuted;
  Chart.defaults.borderColor = COLORS.border;
  Chart.defaults.font.family = "'DM Sans', system-ui, -apple-system, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.plugins.legend.labels.boxWidth = 10;
  Chart.defaults.plugins.legend.labels.padding = 14;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;

  // Gradient fill for datasets without an explicit color (gold fade).
  // Runs at beforeDatasetsUpdate (after layout), so chartArea exists and the
  // mutated backgroundColor is picked up by the element styling that follows
  // in the same update — a beforeDraw mutation would be too late.
  const gradientPlugin = {
    id: 'gradientFill',
    beforeDatasetsUpdate: function (chart) {
      const ctx = chart.ctx;
      const chartArea = chart.chartArea;
      if (!chartArea) return;

      chart.data.datasets.forEach(function (dataset) {
        if (dataset.backgroundColor != null) {
          // Only datasets without an explicit color get the default gradient
          return;
        }

        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, COLORS.gold);
        gradient.addColorStop(1, COLORS.goldDim);
        dataset.backgroundColor = gradient;
      });
    },
  };
  Chart.register(gradientPlugin);

  // Canvas text drawn before the webfont loads falls back to the system
  // font; once DM Sans is ready, re-render every chart so labels match.
  // render() (not resize()) — resize is a no-op when the canvas size is
  // unchanged, and this runs after layout, so only a forced redraw picks
  // up the newly loaded font.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      Object.values(Chart.instances || {}).forEach(function (c) {
        c.render();
      });
    });
  }
}

window.AnalyzerCharts = {
  grid: COLORS.border,
  // Theme palette for categorical series — shared shades reference COLORS
  // (the two scope-specific accents below stay local)
  palette: [
    COLORS.accent,
    COLORS.gold,
    COLORS.teal,
    COLORS.rust,
    '#5A6FB5',
    COLORS.burntOrange,
    COLORS.plum,
    COLORS.olive,
    '#4A8A52',
    COLORS.textMuted,
  ],
  // Cycle the theme palette so categories stay distinguishable
  bars: function (n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(this.palette[i % this.palette.length]);
    return out;
  },
  titleCase: function (str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },
  // Chart.js tooltip config: off-canvas, custom DOM renderer. Call once per
  // chart — each call creates its own tooltip element.
  plainTip: function () {
    return { enabled: false, external: this.externalTip() };
  },
  // Escape text for the custom tooltip DOM — shared by externalTip and any
  // page script that builds .chart-tip content (e.g. the scatter list).
  tipEsc: function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  },
  // Float an existing .chart-tip element relative to a caret position.
  // Anchored to its wrapper; the viewport clamp keeps it visible on screen.
  placeTip: function (el, cx, cy) {
    var wrap = el.parentNode;
    var wrapW = wrap.clientWidth;
    var tw = el.offsetWidth;
    var th = el.offsetHeight;
    var gap = 10;
    var x = Math.max(8, Math.min(cx - tw / 2, wrapW - tw - 8));
    // Decide above/below by which side of the VIEWPORT has more room for the
    // tip — the wrapper's middle can sit above or below the screen's middle
    // when the chart is low/high on the page — then fall back to the other
    // side when the preferred one doesn't actually fit on screen.
    var wrapRect = wrap.getBoundingClientRect();
    var vpTop = wrapRect.top + cy;
    var above = vpTop > window.innerHeight / 2;
    var y = above ? cy - th - gap : cy + gap;
    if (above && vpTop - th - gap < 8) {
      above = false;
      y = cy + gap;
    } else if (!above && vpTop + gap + th > window.innerHeight - 8) {
      above = true;
      y = cy - th - gap;
    }
    // X stays inside the wrapper; Y is free to leave it (the wrapper is only
    // 340px tall) — the viewport clamp below is what keeps the tip visible.
    var vp = 8;
    var vx = Math.max(vp, Math.min(wrapRect.left + x, window.innerWidth - tw - vp));
    var vy = Math.max(vp, Math.min(wrapRect.top + y, window.innerHeight - th - vp));
    x = vx - wrapRect.left;
    y = vy - wrapRect.top;
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
    el.classList.toggle('chart-tip--above', above);
    el.classList.toggle('chart-tip--below', !above);
    el.style.setProperty('--caret-x', Math.round(cx - x) + 'px');
    el.classList.add('chart-tip--visible');
  },
  // Custom tooltip styled like Chart.js's default white tooltip, but rendered
  // as a DOM element (docs: external custom tooltips) so text wraps and the
  // box is clamped to the chart wrapper instead of being clipped at the
  // canvas edge. Pair with `tooltip: { enabled: false, external: ... }` —
  // enabled:false suppresses the on-canvas tooltip (Chart.js draws it on
  // canvas whenever enabled, regardless of external).
  externalTip: function () {
    var el = null;
    return function (ctx) {
      var t = ctx.tooltip;
      if (!el) {
        el = document.createElement('div');
        el.className = 'chart-tip';
        ctx.chart.canvas.parentNode.appendChild(el);
      }
      // Chart.js calls this before the fade-out animation finishes, so opacity
      // is still ~1 when hiding — check the active items instead.
      if (!t || !t._active || t._active.length === 0) {
        el.classList.remove('chart-tip--visible');
        return;
      }

      var html = '<div class="chart-tip-inner">';
      if (t.title && t.title.length) {
        var titleLines = t.title.filter(function (l) {
          return l;
        });
        if (titleLines.length) {
          html +=
            '<div class="chart-tip-title">' +
            AnalyzerCharts.tipEsc(titleLines.join(' ')) +
            '</div>';
        }
      }
      t.beforeBody.forEach(function (l) {
        if (l) html += '<div class="chart-tip-row">' + AnalyzerCharts.tipEsc(l) + '</div>';
      });
      t.body.forEach(function (b, i) {
        var swatch = '';
        var color = t.labelColors && t.labelColors[i];
        if (color && color.backgroundColor) {
          swatch =
            '<span class="chart-tip-swatch" style="background:' +
            AnalyzerCharts.tipEsc(color.backgroundColor) +
            ';border-color:' +
            AnalyzerCharts.tipEsc(color.borderColor || 'transparent') +
            '"></span>';
        }
        b.lines.forEach(function (l) {
          if (l)
            html += '<div class="chart-tip-row">' + swatch + AnalyzerCharts.tipEsc(l) + '</div>';
        });
      });
      t.afterBody.forEach(function (l) {
        String(l)
          .split('\n')
          .forEach(function (seg) {
            if (seg) html += '<div class="chart-tip-row">' + AnalyzerCharts.tipEsc(seg) + '</div>';
          });
      });
      el.innerHTML = html + '</div>';

      // Shared positioning: float above the caret, clamped to the wrapper
      var wrap = ctx.chart.canvas.parentNode;
      AnalyzerCharts.placeTip(
        el,
        t.caretX == null ? wrap.clientWidth / 2 : t.caretX,
        t.caretY == null ? wrap.clientHeight / 2 : t.caretY,
      );
    };
  },
};

document.addEventListener('DOMContentLoaded', function () {
  // -----------------------------------------------------------------------
  // Mobile menu toggle
  // -----------------------------------------------------------------------
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');

  function setMenuLabel(open) {
    const label = menuToggle.querySelector('.menu-toggle-label');
    if (label) label.textContent = open ? 'Close' : 'Menu';
  }

  function closeMenu() {
    if (!menuToggle) return;
    menuToggle.classList.remove('open');
    document.body.classList.remove('menu-open');
    mobileMenu.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    mobileMenu.setAttribute('aria-hidden', 'true');
    setMenuLabel(false);
  }

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', function () {
      const open = menuToggle.classList.toggle('open');
      document.body.classList.toggle('menu-open', open);
      mobileMenu.classList.toggle('open', open);
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      mobileMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
      setMenuLabel(open);
    });

    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  // -----------------------------------------------------------------------
  // Count-up animation
  // -----------------------------------------------------------------------
  function animateCountUp(el) {
    const target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;

    const suffix = el.getAttribute('data-suffix') || '';
    const duration = 1200;
    let startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * target;
      el.textContent =
        target % 1 === 0 ? Math.round(current) + suffix : current.toFixed(1) + suffix;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target % 1 === 0 ? Math.round(target) + suffix : target + suffix;
      }
    }
    requestAnimationFrame(step);
  }

  document.querySelectorAll('[data-count]').forEach(animateCountUp);

  // -----------------------------------------------------------------------
  // IntersectionObserver — reveal on scroll
  // -----------------------------------------------------------------------
  function revealAll(root) {
    root.querySelectorAll('.reveal, .reveal-child').forEach(function (el) {
      el.classList.add('revealed');
    });
  }

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );

    document.querySelectorAll('.reveal').forEach(function (el) {
      // Set stagger index on children
      const children = el.querySelectorAll(':scope > .reveal-child');
      for (let j = 0; j < children.length; j++) {
        children[j].style.setProperty('--i', j);
      }
      revealObserver.observe(el);
    });

    // Standalone reveal-child elements (not wrapped in a .reveal parent)
    document.querySelectorAll('.reveal-child:not(.reveal .reveal-child)').forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    revealAll(document);
  }

  // -----------------------------------------------------------------------
  // Scrollable tables — edge shadows hinting at more content
  // -----------------------------------------------------------------------
  function updateTableEdges(wrap, scroller) {
    const scrollable = scroller.scrollWidth > scroller.clientWidth + 1;
    wrap.classList.toggle(
      'edge-right',
      scrollable && scroller.scrollLeft < scroller.scrollWidth - scroller.clientWidth - 2,
    );
    wrap.classList.toggle('edge-left', scroller.scrollLeft > 2);
  }

  document.querySelectorAll('.table-wrap').forEach(function (wrap) {
    const scroller = wrap.querySelector('.table-scroll');
    if (!scroller) return;
    updateTableEdges(wrap, scroller);
    scroller.addEventListener('scroll', function () {
      updateTableEdges(wrap, scroller);
    });
  });
  window.addEventListener('resize', function () {
    document.querySelectorAll('.table-wrap').forEach(function (wrap) {
      const scroller = wrap.querySelector('.table-scroll');
      if (scroller) updateTableEdges(wrap, scroller);
    });
  });
});

// -----------------------------------------------------------------------
// Page transition — a wavy blob stroke draws around the screen and inflates
// into a full-screen cover on navigation (Aardvark-style); the brand mark
// pops once the screen is filled, and on arrival the slime curtain drops
// away. Markup in layout.html. Animations are pure CSS keyframes on
// stroke-dashoffset / stroke-width / transform; JS only measures the path
// and drives the state classes.
// -----------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
  var pt = document.getElementById('pageTransition');
  if (!pt) return;

  var path = pt.querySelector('.page-transition__path');
  if (path && path.getTotalLength) {
    // Path length drives the dash-draw; stroke widths are % of the
    // 1080x1080 viewBox diagonal (1527px).
    path.style.setProperty('--path-len', Math.round(path.getTotalLength()) + 'px');
    var diag = Math.hypot(1080, 1080);
    path.style.setProperty('--stroke-thin', Math.round(diag * 0.08) + 'px');
    path.style.setProperty('--stroke-thick', Math.round(diag * 0.7) + 'px');
  }

  // The overlay svg stretches non-uniformly (preserveAspectRatio="none");
  // counter-scale the wave layers' X so their aspect ratio stays locked on
  // any window shape (CSS: scaleX(var(--wave-scale, 1))).
  function setWaveScale() {
    document.documentElement.style.setProperty(
      '--wave-scale',
      (window.innerHeight / window.innerWidth).toFixed(4),
    );
  }
  setWaveScale();
  window.addEventListener('resize', setWaveScale);

  // Wave path data is generated here so shape and coverage are
  // single-source: each layer is a 1080-unit pattern (3 sine waves)
  // repeated 5 times to stay covered while drifting. Troughs sit at
  // y=0 so nothing leaks below the screen.
  function wavePath(cross, crest, trough) {
    var d = 'M0 ' + cross;
    for (var c = 0; c < 5; c++) {
      var x = c * 1080;
      for (var k = 0; k < 3; k++) {
        var cx = x + k * 360;
        d +=
          'C' +
          (cx + 60) +
          ' ' +
          crest +
          ' ' +
          (cx + 120) +
          ' ' +
          crest +
          ' ' +
          (cx + 180) +
          ' ' +
          cross;
        d +=
          'C' +
          (cx + 240) +
          ' ' +
          trough +
          ' ' +
          (cx + 300) +
          ' ' +
          trough +
          ' ' +
          (cx + 360) +
          ' ' +
          cross;
      }
    }
    return d + 'L5400 30L0 30Z';
  }
  [
    ['--far', -65, -130, 22],
    ['--mid', -48, -95, 16],
    ['--front', -30, -60, 10],
  ].forEach(function (layer) {
    var p = pt.querySelector('.page-transition__waves' + layer[0]);
    if (p) p.setAttribute('d', wavePath(layer[1], layer[2], layer[3]));
  });

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COVER_MS = 1500; // cover (1s) + logo pop (0.45s) before swapping pages
  var REVEAL_MS = 750; // curtain drop (0.7s) + cleanup margin

  function resetClasses() {
    pt.classList.remove(
      'page-transition--cover',
      'page-transition--covered',
      'page-transition--reveal',
      'page-transition--logo-pop',
    );
  }

  // Leave: trace the wavy line, inflate it into a cover, then navigate.
  function cover() {
    resetClasses();
    pt.classList.add('page-transition--cover');
    // Once the blob has fully inflated, flip to the static covered state:
    // wipe-cover's 100% and --covered both render a full-bleed fill, so
    // the swap is seamless — and the scrollbar lock (html:has(--covered))
    // engages under the cover, where nothing can be seen.
    setTimeout(function () {
      pt.classList.add('page-transition--covered');
    }, 1000);
  }

  // Enter: the slime curtain drops (reveals the page underneath).
  function reveal() {
    pt.classList.remove('page-transition--covered', 'page-transition--logo-pop');
    pt.classList.add('page-transition--reveal');
    setTimeout(resetClasses, REVEAL_MS);
  }

  function startCovered() {
    resetClasses();
    pt.classList.add('page-transition--covered');
  }

  // Arriving from another page of this site: the page was hidden pre-paint
  // (html.page-swap) — cover it, show the page, then wipe it open.
  // The pre-paint inline script (layout.html) sets page-swap only for
  // same-origin arrivals — read that state instead of re-deriving it.
  if (document.documentElement.classList.contains('page-swap')) {
    startCovered();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.documentElement.classList.remove('page-swap');
        setTimeout(reveal, 180);
      });
    });
  } else {
    // Direct load: brief covered intro with the brand mark popping in.
    startCovered();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        pt.classList.add('page-transition--logo-pop');
        setTimeout(reveal, 600);
      });
    });
  }

  // Intercept internal links: cover, then navigate once the blob is up.
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var raw = a.getAttribute('href');
    if (!raw || raw.charAt(0) === '#') return;
    if (a.origin !== window.location.origin) return;
    e.preventDefault();
    if (reduced) {
      window.location.href = a.href; // swap instantly, no motion
      return;
    }
    cover();
    setTimeout(function () {
      window.location.href = a.href;
    }, COVER_MS);
  });
});

// When embedded in a cross-origin iframe (the workshop dashboard), tell the
// parent our accent so it can paint the iframe element with the same color:
// a cleared iframe mid-navigation shows its element background (dark in the
// dashboard), which would blink black between the cover and the next page.
if (window.self !== window.top) {
  var accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  if (accent) {
    parent.postMessage({ type: 'workshop-preview-accent', accent: accent }, '*');
  }
}
