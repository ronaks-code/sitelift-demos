/* Slab motion: gallery columns drift at slightly different speeds. Sheen and panel widening are pure CSS. Skipped for reduced motion. */
(function () {
  if (!window.SL || SL.reduced) return;
  var cols = document.querySelectorAll('.sl-cols .g-it:nth-child(even)');
  if (!cols.length || innerWidth < 760) return;
  var raf = 0;
  var run = function () { raf = 0; var y = scrollY; cols.forEach(function (c) { var r = c.getBoundingClientRect(), d = (r.top + r.height / 2 - innerHeight / 2) * -.06; c.style.setProperty('--dy', d.toFixed(1) + 'px'); }); };
  addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(run); }, { passive: true }); run();
})();
