/* Ridgeline motion: hero photo parallax (slower than the page). Skipped for reduced motion; the photo is simply oversized so nothing is cut when it does not move. */
(function () {
  if (!window.SL || SL.reduced) return;
  var el = document.querySelector('[data-par]');
  if (!el) return;
  document.body.classList.add('js-par');
  var raf = 0;
  var run = function () { raf = 0; var y = Math.min(scrollY, innerHeight); el.style.transform = 'translate3d(0,' + (y * .18).toFixed(1) + 'px,0)'; };
  addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(run); }, { passive: true });
})();
