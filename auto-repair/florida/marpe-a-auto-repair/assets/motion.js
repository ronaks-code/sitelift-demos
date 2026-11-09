/* Fit the big phone number on one line whatever the brand font's width (layout, so it runs with reduced motion too). */
(function () {
  var els = document.querySelectorAll('.tg-foot-tel');
  if (!els.length) return;
  function fit() { els.forEach(function (e) { e.style.fontSize = ''; e.parentElement.style.minWidth = '0'; var r = e.clientWidth / e.scrollWidth; if (r < 1) e.style.fontSize = (parseFloat(getComputedStyle(e).fontSize) * r * 0.97) + 'px'; }); }
  fit(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  var t; addEventListener('resize', function () { clearTimeout(t); t = setTimeout(fit, 120); });
})();
/* Hang Tag motion: the hero tags swing once and the stamp thuds when the hero is in view (CSS, started here). */
(function () {
  if (!window.SL || SL.reduced) return;
  document.body.classList.add('js-tg');
  var h = document.querySelector('[data-swing]');
  if (h && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { h.classList.add('in'); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(h);
  } else if (h) h.classList.add('in');
})();
