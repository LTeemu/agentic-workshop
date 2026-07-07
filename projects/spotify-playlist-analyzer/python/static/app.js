/* ========================================================================
   Spotify Playlist Analyzer — Interactive Behaviors
   ======================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  // -----------------------------------------------------------------------
  // Count-up animation
  // -----------------------------------------------------------------------
  function animateCountUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;

    var suffix = el.getAttribute('data-suffix') || '';
    var duration = 1200;
    var startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease-out cubic
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = eased * target;
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
  var revealObserver = new IntersectionObserver(
    function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          entries[i].target.classList.add('visible');
          revealObserver.unobserve(entries[i].target);
        }
      }
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
  );

  document.querySelectorAll('.reveal').forEach(function (el) {
    // Set stagger index on children
    var children = el.querySelectorAll(':scope > .reveal-child');
    for (var j = 0; j < children.length; j++) {
      children[j].style.setProperty('--i', j);
    }
    revealObserver.observe(el);
  });

  // Standalone reveal-child elements (not wrapped in .reveal parent)
  document.querySelectorAll('.reveal-child:not(.reveal .reveal-child)').forEach(function (el) {
    revealObserver.observe(el);
  });

  // -----------------------------------------------------------------------
  // Chart.js — Color palette reference
  // -----------------------------------------------------------------------
  var COLORS = {
    gold: '#d4a853',
    goldDim: '#a07d3a',
    rust: '#b8433a',
    burntOrange: '#c9773a',
    teal: '#3a8a7a',
    tealDim: '#2a6a5a',
    olive: '#8a8a3a',
    plum: '#7a4a8a',
    text: '#e8e0d6',
    textMuted: '#8b8176',
    border: '#2f2822',
    surface: '#1c1714',
  };

  // -----------------------------------------------------------------------
  // Chart.js — Gradient fill plugin
  // -----------------------------------------------------------------------
  var gradientPlugin = {
    id: 'gradientFill',
    beforeDraw: function (chart) {
      var ctx = chart.ctx;
      var chartArea = chart.chartArea;
      if (!chartArea) return;

      chart.data.datasets.forEach(function (dataset, i) {
        var meta = chart.getDatasetMeta(i);
        if (!meta || !meta.data || meta.data.length === 0) return;

        var top = chartArea.top;
        var bottom = chartArea.bottom;
        var gradient = ctx.createLinearGradient(0, top, 0, bottom);
        gradient.addColorStop(0, COLORS.gold);
        gradient.addColorStop(1, COLORS.goldDim);

        var color = dataset.backgroundColor;
        if (Array.isArray(color) && color.length > 0) {
          // Use existing color for bar charts with per-item colors
          return;
        }
        dataset.backgroundColor = gradient;
      });
    },
  };

  // Register plugin globally
  Chart.register(gradientPlugin);

  // -----------------------------------------------------------------------
  // Chart.js — Default styling
  // -----------------------------------------------------------------------
  Chart.defaults.color = COLORS.textMuted;
  Chart.defaults.borderColor = COLORS.border;
  Chart.defaults.plugins.legend.labels.boxWidth = 10;

  // Custom tooltip styling
  Chart.defaults.plugins.tooltip.backgroundColor = COLORS.surface;
  Chart.defaults.plugins.tooltip.titleColor = COLORS.gold;
  Chart.defaults.plugins.tooltip.bodyColor = COLORS.text;
  Chart.defaults.plugins.tooltip.borderColor = COLORS.border;
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.cornerRadius = 4;
  Chart.defaults.plugins.tooltip.displayColors = true;

  // -----------------------------------------------------------------------
  // Vinyl spin — Pause on hover
  // -----------------------------------------------------------------------
  var vinyl = document.querySelector('.vinyl-grooves');
  if (vinyl) {
    var disc = vinyl.closest('.vinyl-disc');
    if (disc) {
      disc.addEventListener('mouseenter', function () {
        vinyl.style.animationPlayState = 'paused';
      });
      disc.addEventListener('mouseleave', function () {
        vinyl.style.animationPlayState = 'running';
      });
    }
  }
});
