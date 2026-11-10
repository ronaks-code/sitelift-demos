/* Gloss motion: drag-to-scroll gallery strip, gentle parallax on the arch photo. No libraries; respects reduced motion. */
(function () {
  if (!window.SL) return;
  document.querySelectorAll('.gl-strip').forEach(function (s) {
    var down = false, x0 = 0, l0 = 0;
    s.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; x0 = e.clientX; l0 = s.scrollLeft; s.style.scrollSnapType = 'none'; });
    addEventListener('pointerup', function () { if (down) { down = false; s.style.scrollSnapType = ''; } });
    s.addEventListener('pointermove', function (e) { if (down) s.scrollLeft = l0 - (e.clientX - x0); });
  });
  if (SL.reduced) return;
  var arch = document.querySelector('.gl-arch');
  if (!arch) return;
  addEventListener('scroll', function () {
    var y = Math.min(scrollY, 600);
    arch.style.transform = 'translateY(' + (y * -0.06) + 'px)';
  }, { passive: true });
})();
