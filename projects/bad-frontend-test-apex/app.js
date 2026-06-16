(function () {
  /* ----- Hero Canvas (connecting particles) ----- */
  var heroCanvas = document.getElementById('hero-canvas');
  if (heroCanvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var ctx = heroCanvas.getContext('2d');
    var W, H;
    function resize() {
      W = heroCanvas.width = window.innerWidth;
      H = heroCanvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    var particles = [];
    for (var i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.3 + 0.1,
      });
    }
    function drawHero() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(7, 85, 187, ' + p.alpha + ')';
        ctx.fill();
      }
      for (var i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var a = particles[i],
            b = particles[j];
          var dx = a.x - b.x,
            dy = a.y - b.y,
            d = Math.sqrt(dx * dx + dy * dy);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = 'rgba(7, 85, 187, 0.03)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(drawHero);
    }
    drawHero();
  }

  /* ----- Visual Card Canvas Hover Reveal ----- */
  var visCards = document.querySelectorAll('.vis-card canvas');
  var patterns = {};

  function drawPattern(canvas, seed) {
    var c = canvas.getContext('2d');
    var w = canvas.width,
      h = canvas.height;
    c.clearRect(0, 0, w, h);
    // Draw a grid of abstract circles/rectangles as overlay
    var s = Math.max(w, h);
    var step = s / 16;
    for (var x = 0; x < w; x += step) {
      for (var y = 0; y < h; y += step) {
        var hue = (x * 7 + y * 13 + seed * 31) % 360;
        var sat = 30 + ((x * 3 + y * 5 + seed * 7) % 40);
        var lit = 40 + ((x * 11 + y * 17 + seed * 23) % 30);
        var sz = step * 0.6 * (0.5 + ((x * 3 + y * 7 + seed * 11) % 100) / 200);
        c.beginPath();
        if ((x + y + seed) % 3 === 0) {
          c.arc(x + step / 2, y + step / 2, sz / 2, 0, Math.PI * 2);
        } else {
          c.rect(x + step / 2 - sz / 2, y + step / 2 - sz / 2, sz, sz);
        }
        c.fillStyle = 'hsla(' + hue + ', ' + sat + '%, ' + lit + '%, 0.15)';
        c.fill();
      }
    }
    // Add some random shapes
    for (var i = 0; i < 20; i++) {
      var rx = (i * 137 + seed * 11) % w;
      var ry = (i * 251 + seed * 17) % h;
      var rr = 5 + ((i * 37 + seed * 19) % 30);
      c.beginPath();
      c.arc(rx, ry, rr, 0, Math.PI * 2);
      c.fillStyle = 'hsla(' + ((i * 47 + seed * 13) % 360) + ', 60%, 50%, 0.08)';
      c.fill();
    }
  }

  for (var i = 0; i < visCards.length; i++) {
    var canvas = visCards[i];
    var card = canvas.closest('[data-vis]');
    var seed = 0;
    if (card) {
      var name = card.dataset.vis;
      for (var s = 0; s < name.length; s++) {
        seed += name.charCodeAt(s);
      }
    }
    patterns[canvas.dataset.id || i] = { canvas: canvas, card: card, seed: seed };

    // Draw initial pattern
    drawPattern(canvas, seed);

    // On mousemove: apply radial-gradient mask spotlight
    card.addEventListener('mousemove', function (e) {
      var rect = this.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width) * 100;
      var y = ((e.clientY - rect.top) / rect.height) * 100;
      var cvs = this.querySelector('canvas');
      if (cvs) {
        cvs.style.webkitMaskImage =
          'radial-gradient(circle 80px at ' +
          x +
          '% ' +
          y +
          '%, transparent 0%, transparent 40%, rgba(0,0,0,0.95) 70%, black 100%)';
        cvs.style.maskImage =
          'radial-gradient(circle 80px at ' +
          x +
          '% ' +
          y +
          '%, transparent 0%, transparent 40%, rgba(0,0,0,0.95) 70%, black 100%)';
        cvs.style.webkitMaskRepeat = 'no-repeat';
        cvs.style.maskRepeat = 'no-repeat';
        cvs.style.webkitMaskMode = 'alpha';
        cvs.style.maskMode = 'alpha';
      }
    });

    // On mouseleave: remove mask
    card.addEventListener('mouseleave', function () {
      var cvs = this.querySelector('canvas');
      if (cvs) {
        cvs.style.webkitMaskImage = '';
        cvs.style.maskImage = '';
      }
    });
  }

  /* ----- Disc drag rotation ----- */
  var disc = document.querySelector('.disc-rotator');
  if (disc) {
    var isDragging = false,
      startX = 0,
      startY = 0,
      startAngle = 0,
      currentAngle = 0;
    var discContainer = disc.closest('.disc-inner');

    function getCenter(el) {
      var r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    function onPointerDown(e) {
      isDragging = true;
      var pt = e.touches
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : { x: e.clientX, y: e.clientY };
      var c = getCenter(disc);
      startAngle = Math.atan2(pt.y - c.y, pt.x - c.x) - currentAngle;
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      var pt = e.touches
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : { x: e.clientX, y: e.clientY };
      var c = getCenter(disc);
      currentAngle = Math.atan2(pt.y - c.y, pt.x - c.x) - startAngle;
      disc.style.transform = 'rotate(' + (currentAngle * 180) / Math.PI + 'deg)';
    }

    function onPointerUp() {
      isDragging = false;
    }

    disc.addEventListener('mousedown', onPointerDown);
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);
    disc.addEventListener('touchstart', onPointerDown, { passive: true });
    document.addEventListener('touchmove', onPointerMove, { passive: true });
    document.addEventListener('touchend', onPointerUp);
  }

  /* ----- Appear Animation ----- */
  var appearEls = document.querySelectorAll('.appear');
  if ('IntersectionObserver' in window && appearEls.length) {
    var obs = new IntersectionObserver(
      function (entries) {
        for (var e = 0; e < entries.length; e++) {
          if (entries[e].isIntersecting) {
            entries[e].target.classList.add('visible');
            obs.unobserve(entries[e].target);
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );
    for (var r = 0; r < appearEls.length; r++) obs.observe(appearEls[r]);
  } else {
    for (var r2 = 0; r2 < appearEls.length; r2++) appearEls[r2].classList.add('visible');
  }

  /* ----- FAQ Accordion ----- */
  var faqItems = document.querySelectorAll('.faq-item');
  for (var f = 0; f < faqItems.length; f++) {
    var q = faqItems[f].querySelector('.faq-q');
    if (q) {
      q.addEventListener('click', function () {
        var item = this.closest('.faq-item');
        var isOpen = item.classList.contains('open');
        for (var i = 0; i < faqItems.length; i++) {
          faqItems[i].classList.remove('open');
          faqItems[i].querySelector('.faq-q').setAttribute('aria-expanded', 'false');
        }
        if (!isOpen) {
          item.classList.add('open');
          this.setAttribute('aria-expanded', 'true');
        }
      });
    }
  }

  /* ----- Play Button Pulse ----- */
  var playBtns = document.querySelectorAll('.play-btn');
  for (var b = 0; b < playBtns.length; b++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        var pulse = function () {
          btn.style.background = '#333';
          setTimeout(function () {
            btn.style.background = '#0755bb';
          }, 200);
        };
        pulse();
      });
    })(playBtns[b]);
  }

  /* ----- Above the fold ----- */
  var appears = document.querySelectorAll('.appear');
  for (var rf = 0; rf < appears.length; rf++) {
    var rect = appears[rf].getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      appears[rf].classList.add('visible');
    }
  }
})();
