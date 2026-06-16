(function () {
  /* ----- Custom Cursor ----- */
  var cursor = document.getElementById('cursor');
  if (
    cursor &&
    window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches
  ) {
    var mx = 0,
      my = 0,
      cx = 0,
      cy = 0;
    document.addEventListener('mousemove', function (e) {
      mx = e.clientX;
      my = e.clientY;
    });
    var hoverTargets = document.querySelectorAll(
      'a, button, .work-card, .service-card, .faq-question, input, textarea, [tabindex]',
    );
    for (var t = 0; t < hoverTargets.length; t++) {
      hoverTargets[t].addEventListener('mouseenter', function () {
        cursor.classList.add('hover');
      });
      hoverTargets[t].addEventListener('mouseleave', function () {
        cursor.classList.remove('hover');
      });
    }
    function lerp(a, b, t) {
      return a + (b - a) * t;
    }
    function tick() {
      cx = lerp(cx, mx, 0.12);
      cy = lerp(cy, my, 0.12);
      cursor.style.transform = 'translate(' + (cx - 4) + 'px, ' + (cy - 4) + 'px)';
      requestAnimationFrame(tick);
    }
    tick();
  } else if (cursor) {
    cursor.style.display = 'none';
  }

  /* ----- 3D Mountain Scene (Three.js) ----- */
  var canvas = document.getElementById('three-canvas');
  if (
    canvas &&
    typeof THREE !== 'undefined' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070a);

    var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 12);

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    /* --- Mountain terrain --- */
    var terrainGroup = new THREE.Group();

    function createPeak(w, h, seg, color, opacity, x, y, z) {
      var geo = new THREE.ConeGeometry(w, h, seg || 8, 4);
      var pos = geo.attributes.position.array;
      for (var i = 0; i < pos.length; i += 3) {
        var nx = pos[i],
          ny = pos[i + 1],
          nz = pos[i + 2];
        if (ny > -h * 0.4 && ny < h * 0.45) {
          var angle = Math.atan2(nz, nx);
          var r =
            1 +
            Math.sin(angle * 3.7) * 0.12 +
            Math.sin(angle * 7.3) * 0.06 +
            (Math.random() - 0.5) * 0.04;
          pos[i] *= r;
          pos[i + 2] *= r;
        }
      }
      geo.computeVertexNormals();
      var mat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.5,
        metalness: 0.1,
        transparent: true,
        opacity: opacity,
        flatShading: false,
      });
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      return m;
    }

    var peakLayers = [
      { color: 0x1a2a4a, y: 0.5, z: -2 },
      { color: 0x1e3050, y: 0.2, z: -1 },
      { color: 0x16203a, y: -0.1, z: 0 },
    ];

    for (var p = 0; p < peakLayers.length; p++) {
      var l = peakLayers[p];
      var g = new THREE.Group();
      var o = 0.6 + p * 0.1;

      g.add(createPeak(1.8 - p * 0.2, 2.5 - p * 0.3, 8, l.color, o, 0, l.y, l.z));
      g.add(
        createPeak(
          1.4 - p * 0.15,
          2.0 - p * 0.2,
          8,
          l.color,
          o,
          -1.8 + p * 0.1,
          l.y - 0.3,
          l.z + 0.3,
        ),
      );
      g.add(
        createPeak(
          1.3 - p * 0.15,
          1.8 - p * 0.2,
          8,
          l.color,
          o,
          1.7 - p * 0.1,
          l.y - 0.2,
          l.z + 0.2,
        ),
      );
      g.add(
        createPeak(
          1.0 - p * 0.1,
          1.5 - p * 0.15,
          8,
          l.color,
          o,
          -3.0 + p * 0.2,
          l.y - 0.5,
          l.z + 0.5,
        ),
      );
      g.add(
        createPeak(
          0.9 - p * 0.1,
          1.3 - p * 0.15,
          8,
          l.color,
          o,
          2.8 - p * 0.2,
          l.y - 0.4,
          l.z + 0.4,
        ),
      );

      terrainGroup.add(g);
    }

    // Ground plane
    var groundGeo = new THREE.PlaneGeometry(20, 8);
    var groundMat = new THREE.MeshStandardMaterial({
      color: 0x0a0e17,
      roughness: 0.9,
      metalness: 0,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    var ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.set(0, -0.5, 1);
    ground.rotation.x = -Math.PI / 2;
    terrainGroup.add(ground);

    scene.add(terrainGroup);

    /* --- Lighting --- */
    var ambient = new THREE.AmbientLight(0x304060, 0.5);
    scene.add(ambient);

    var moon = new THREE.DirectionalLight(0x6488c0, 1.5);
    moon.position.set(-3, 5, 4);
    scene.add(moon);

    var rim = new THREE.DirectionalLight(0x4070a0, 0.6);
    rim.position.set(0, -1, -5);
    scene.add(rim);

    /* --- Fog --- */
    scene.fog = new THREE.FogExp2(0x05070a, 0.035);

    /* --- Stars --- */
    var starsGeo = new THREE.BufferGeometry();
    var starsCount = 800;
    var starsPos = new Float32Array(starsCount * 3);
    var starsColors = new Float32Array(starsCount * 3);
    for (var i = 0; i < starsCount; i++) {
      starsPos[i * 3] = (Math.random() - 0.5) * 70;
      starsPos[i * 3 + 1] = Math.random() * 15 + 2;
      starsPos[i * 3 + 2] = (Math.random() - 0.5) * 50 - 5;
      var warmth = 0.6 + Math.random() * 0.4;
      starsColors[i * 3] = warmth;
      starsColors[i * 3 + 1] = warmth * (0.7 + Math.random() * 0.3);
      starsColors[i * 3 + 2] = 1.0;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPos, 3));
    starsGeo.setAttribute('color', new THREE.BufferAttribute(starsColors, 3));
    var starsMat = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    var stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    /* --- Mouse tracking --- */
    var mouseX = 0,
      mouseY = 0;
    document.addEventListener('mousemove', function (e) {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    });

    /* --- Resize --- */
    window.addEventListener('resize', function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    /* --- Animation loop --- */
    var time = 0;
    function animate3D() {
      requestAnimationFrame(animate3D);
      time += 0.005;

      // Mountains slowly rotate based on mouse
      terrainGroup.rotation.y += (mouseX * 0.05 - terrainGroup.rotation.y) * 0.03;
      terrainGroup.rotation.x += (-mouseY * 0.03 - terrainGroup.rotation.x) * 0.03;

      // Star twinkle
      stars.material.size = 0.05 + Math.sin(time * 2) * 0.015;

      renderer.render(scene, camera);
    }
    animate3D();

    /* --- Scroll-driven fade + parallax --- */
    window.addEventListener('scroll', function () {
      var scrollY = window.scrollY;
      var maxFade = window.innerHeight * 0.8;
      var progress = Math.min(scrollY / maxFade, 1);

      terrainGroup.children.forEach(function (child) {
        child.traverse(function (node) {
          if (node.isMesh && node.material) {
            node.material.opacity = (1 - progress) * 0.7;
          }
        });
      });
      stars.material.opacity = (1 - progress) * 0.7;

      terrainGroup.position.y = -progress * 0.5;
      stars.position.y = -progress * 0.3;
    });
  }

  /* ----- Magnetic Button ----- */
  var magneticBtns = document.querySelectorAll('.magnetic-btn');
  for (var mb = 0; mb < magneticBtns.length; mb++) {
    (function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        var dist = Math.sqrt(x * x + y * y);
        var strength = Math.max(0, 1 - dist / 180);
        btn.style.transform =
          'translate(' + x * strength * 0.25 + 'px, ' + y * strength * 0.25 + 'px)';
        btn.style.transition = 'transform 60ms linear';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.transform = '';
        btn.style.transition = '';
      });
    })(magneticBtns[mb]);
  }

  /* ----- Scroll Reveal ----- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        for (var e = 0; e < entries.length; e++) {
          if (entries[e].isIntersecting) {
            entries[e].target.classList.add('visible');
            observer.unobserve(entries[e].target);
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );
    for (var r = 0; r < revealEls.length; r++) observer.observe(revealEls[r]);
  } else {
    for (var r2 = 0; r2 < revealEls.length; r2++) revealEls[r2].classList.add('visible');
  }

  /* ----- Counter Animation ----- */
  var counterEls = document.querySelectorAll('.metric-num');
  if (counterEls.length && 'IntersectionObserver' in window) {
    var counterObserver = new IntersectionObserver(
      function (entries) {
        for (var e = 0; e < entries.length; e++) {
          if (entries[e].isIntersecting) {
            var el = entries[e].target;
            var target = parseInt(el.dataset.target) || 0;
            animateCounter(el, target);
            counterObserver.unobserve(el);
          }
        }
      },
      { threshold: 0.5 },
    );
    for (var c = 0; c < counterEls.length; c++) counterObserver.observe(counterEls[c]);
  }

  function animateCounter(el, target) {
    var duration = 2000;
    var start = 0;
    var startTime = null;
    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target) + (el.dataset.targetSuffix || '');
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }

  /* ----- FAQ Accordion ----- */
  var faqItems = document.querySelectorAll('.faq-item');
  for (var f = 0; f < faqItems.length; f++) {
    var question = faqItems[f].querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', function () {
        var item = this.closest('.faq-item');
        var isOpen = item.classList.contains('open');

        // Close all others
        for (var i = 0; i < faqItems.length; i++) {
          faqItems[i].classList.remove('open');
          faqItems[i].querySelector('.faq-question').setAttribute('aria-expanded', 'false');
        }

        if (!isOpen) {
          item.classList.add('open');
          this.setAttribute('aria-expanded', 'true');
        }
      });
    }
  }

  /* ----- Nav scroll background ----- */
  var navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', function () {
      navbar.classList.toggle('scrolled', window.scrollY > 80);
    });
  }

  /* ----- Smooth Nav Scroll ----- */
  document.querySelectorAll('.nav-link, .btn-ghost').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        var target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  /* ----- Form Validation ----- */
  var form = document.querySelector('.contact-form');
  if (form) {
    var formFields = form.querySelectorAll('input, textarea');

    function validateField(field) {
      var error = document.getElementById(field.id + '-error');
      var group = field.closest('.form-group');
      var message = '';

      if (field.hasAttribute('required') && !field.value.trim()) {
        message = 'This field is required';
      } else if (
        field.type === 'email' &&
        field.value &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)
      ) {
        message = 'Please enter a valid email address';
      }

      if (error) error.textContent = message;
      if (group) group.classList.toggle('has-error', !!message);
      field.setAttribute('aria-invalid', !!message);

      return !message;
    }

    for (var fi = 0; fi < formFields.length; fi++) {
      (function (field) {
        field.addEventListener('blur', function () {
          if (field.hasAttribute('required') || field.type === 'email') validateField(field);
        });
        field.addEventListener('input', function () {
          var err = document.getElementById(field.id + '-error');
          if (err && err.textContent) validateField(field);
        });
      })(formFields[fi]);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;
      for (var vi = 0; vi < formFields.length; vi++) {
        if (!validateField(formFields[vi])) valid = false;
      }

      var firstErr = form.querySelector('.has-error');
      if (firstErr) {
        firstErr.querySelector('input, textarea').focus();
        return;
      }

      if (valid) {
        var data = new FormData(form);
        var feedback = document.getElementById('form-feedback');
        feedback.className = 'form-feedback show success';
        feedback.textContent = 'Thanks! We\u2019ll be in touch within 24 hours.';
        form.reset();
        for (var ri = 0; ri < formFields.length; ri++)
          formFields[ri].setAttribute('aria-invalid', 'false');
      }
    });
  }

  /* ----- Above the fold pre-reveal ----- */
  var reveals = document.querySelectorAll('.reveal');
  for (var rf = 0; rf < reveals.length; rf++) {
    var rect = reveals[rf].getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      reveals[rf].classList.add('visible');
    }
  }
})();
