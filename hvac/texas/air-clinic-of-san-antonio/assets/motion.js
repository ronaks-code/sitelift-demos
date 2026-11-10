/* Keyhole motion: the spotlight cone follows the pointer on desktop. Static (centred) with reduced motion, touch, or the "fixed" variant. */
(function () {
  if (!window.SL || SL.reduced || document.body.classList.contains('v-cone-fixed')) return;
  var h = document.querySelector('[data-spot]');
  if (!h || !matchMedia('(pointer:fine)').matches) return;
  var raf = 0, x = 50;
  h.addEventListener('pointermove', function (e) {
    var r = h.getBoundingClientRect(); x = ((e.clientX - r.left) / r.width) * 100;
    if (!raf) raf = requestAnimationFrame(function () { raf = 0; h.style.setProperty('--mx', x.toFixed(1) + '%'); });
  });
})();
