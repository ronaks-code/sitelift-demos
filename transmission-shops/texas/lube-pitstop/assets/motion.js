/* Fit the big phone number on one line whatever the brand font's width (layout, so it runs with reduced motion too). */
(function () {
  var els = document.querySelectorAll('.ex-foot-tel');
  if (!els.length) return;
  function fit() { els.forEach(function (e) { e.style.fontSize = ''; e.parentElement.style.minWidth = '0'; var r = e.clientWidth / e.scrollWidth; if (r < 1) e.style.fontSize = (parseFloat(getComputedStyle(e).fontSize) * r * 0.97) + 'px'; }); }
  fit(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  var t; addEventListener('resize', function () { clearTimeout(t); t = setTimeout(fit, 120); });
})();
/* Next Exit motion: headlight shine (CSS) and the message board lighting each review in turn. Everything stays readable without it. */
(function () {
  if (!window.SL || SL.reduced) return;
  document.body.classList.add('js-ex');
  var b = document.querySelector('[data-vms]'); if (!b) return;
  var lines = b.querySelectorAll('.ex-line'); if (lines.length < 2) return;
  var i = 0; b.classList.add('cycle');
  function go() { lines.forEach(function (l, k) { l.classList.toggle('on', k === i); }); i = (i + 1) % lines.length; }
  go(); setInterval(go, 3800);
})();
