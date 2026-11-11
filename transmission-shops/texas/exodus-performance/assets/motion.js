/* Fit the big phone number on one line whatever the brand font's width (layout, so it runs with reduced motion too). */
(function () {
  var els = document.querySelectorAll('.pt-foot-tel');
  if (!els.length) return;
  function fit() { els.forEach(function (e) { e.style.fontSize = ''; e.parentElement.style.minWidth = '0'; var r = e.clientWidth / e.scrollWidth; if (r < 1) e.style.fontSize = (parseFloat(getComputedStyle(e).fontSize) * r * 0.97) + 'px'; }); }
  fit(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  var t; addEventListener('resize', function () { clearTimeout(t); t = setTimeout(fit, 120); });
})();
/* Pit Wall motion: speed lines stream, the photo slides in, radio equaliser bars bounce (all CSS, started here). Static under reduced motion. */
(function () {
  if (!window.SL || SL.reduced) return;
  document.body.classList.add('js-pt');
})();
