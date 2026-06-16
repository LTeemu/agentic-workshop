// Animated background canvas

const canvas = document.getElementById('hero-canvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

const dots = Array.from({ length: 60 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  vx: (Math.random() - 0.5) * 0.5,
  vy: (Math.random() - 0.5) * 0.5,
  r: Math.random() * 2 + 1,
}));

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const d of dots) {
    d.x += d.vx;
    d.y += d.vy;
    if (d.x < 0 || d.x > canvas.width) d.vx *= -1;
    if (d.y < 0 || d.y > canvas.height) d.vy *= -1;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(88, 166, 255, 0.3)';
    ctx.fill();
  }

  for (let i = 0; i < dots.length; i++) {
    for (let j = i + 1; j < dots.length; j++) {
      const dx = dots[i].x - dots[j].x;
      const dy = dots[i].y - dots[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        ctx.beginPath();
        ctx.moveTo(dots[i].x, dots[i].y);
        ctx.lineTo(dots[j].x, dots[j].y);
        ctx.strokeStyle = `rgba(88, 166, 255, ${1 - dist / 120})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  requestAnimationFrame(draw);
}

draw();

// Scroll progress bar

const progressBar = document.createElement('div');
progressBar.id = 'progress-bar';
document.body.prepend(progressBar);

window.addEventListener(
  'scroll',
  () => {
    const scroll = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = `${(scroll / max) * 100}%`;
  },
  { passive: true },
);

// Section reveal on scroll

const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.15 },
);

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('section, .work-card, .stat').forEach((el) => {
    el.classList.add('reveal');
    revealObserver.observe(el);
  });
});

// Counter animation with easing

const counterObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target);
        const duration = 1200;
        const start = performance.now();

        function update(now) {
          const elapsed = now - start;
          const t = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          const current = Math.round(eased * target);
          el.textContent = current + '+';
          if (t < 1) requestAnimationFrame(update);
        }

        requestAnimationFrame(update);
        counterObserver.unobserve(el);
      }
    }
  },
  { threshold: 0.5 },
);

document.querySelectorAll('.stat-number').forEach((el) => counterObserver.observe(el));

// Contact form

document.getElementById('contact-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button');
  const existing = form.querySelector('.form-feedback');
  if (existing) existing.remove();

  btn.disabled = true;
  btn.textContent = 'Sending...';

  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = 'Send message';

    const fb = document.createElement('div');
    fb.className = 'form-feedback success';
    fb.textContent = "Message sent! I'll get back to you soon.";
    form.appendChild(fb);

    form.reset();
    setTimeout(() => fb.remove(), 4000);
  }, 800);
});

// Active nav link on scroll

const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

window.addEventListener(
  'scroll',
  () => {
    let current = 'hero';
    for (const section of sections) {
      if (window.scrollY >= section.offsetTop - 200) {
        current = section.id;
      }
    }
    navLinks.forEach((a) => {
      const match = a.getAttribute('href') === `#${current}`;
      a.style.color = match ? 'var(--text)' : '';
      a.classList.toggle('active', match);
    });
  },
  { passive: true },
);
