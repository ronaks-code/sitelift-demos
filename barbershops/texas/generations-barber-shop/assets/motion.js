/* Mosaic motion: pointer tilt on bento tiles (fine pointers only). Reveals come from core.js. */
(function () {
  if (!window.SL || SL.reduced || !matchMedia('(pointer:fine)').matches) return;
  document.querySelectorAll('.ms-t').forEach(function (t) {
    t.addEventListener('pointermove', function (e) {
      var r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      t.style.transform = 'perspective(800px) rotateY(' + (x * 5) + 'deg) rotateX(' + (-y * 5) + 'deg)';
    });
    t.addEventListener('pointerleave', function () { t.style.transform = ''; });
  });
})();
