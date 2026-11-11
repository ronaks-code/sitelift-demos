/* Fit the big phone number on one line whatever the brand font's width (layout, so it runs with reduced motion too). */
(function () {
  var els = document.querySelectorAll('.sw-bigtel');
  if (!els.length) return;
  function fit() { els.forEach(function (e) { e.style.fontSize = ''; e.parentElement.style.minWidth = '0'; var r = e.clientWidth / e.scrollWidth; if (r < 1) e.style.fontSize = (parseFloat(getComputedStyle(e).fontSize) * r * 0.97) + 'px'; }); }
  fit(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  var t; addEventListener('resize', function () { clearTimeout(t); t = setTimeout(fit, 120); });
})();
/* Sidewall motion: the tyre lettering turns as you scroll. No libraries; off with reduced motion (the ring just stays put). */
(function () {
  if (!window.SL || SL.reduced) return;
  var ring = document.querySelector('[data-ring]');
  if (!ring) return;
  var tick = false;
  function turn() { ring.style.setProperty('--rot', (scrollY * 0.18).toFixed(1) + 'deg'); tick = false; }
  addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(turn); } }, { passive: true });
  turn();
})();
