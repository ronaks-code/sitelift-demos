/* Chair & Pole motion: fit the plaque headline to its frame (wide brand fonts), pause the pole + ticker when off-screen. */
(function () {
  if (!window.SL) return;
  // A brand font wider than Anton can push a long word past the plaque frame: step the H1 down until it fits (layout only, runs with reduced motion too).
  function fit1(h, min) {
    if (!h) return;
    h.style.fontSize = ''; h.style.overflowWrap = 'normal';   // measure whole words; never split one mid-word
    var fs = parseFloat(getComputedStyle(h).fontSize), n = 0;
    while (h.scrollWidth > h.clientWidth + 1 && fs > min && n++ < 60) { fs -= 1; h.style.fontSize = fs + 'px'; }
    h.style.overflowWrap = '';
  }
  function fit() {
    fit1(document.querySelector('.pl-plaque h1'), 28); fit1(document.querySelector('.pl-stamp'), 11);
    document.querySelectorAll('main h2').forEach(function (h) { fit1(h, 24); });
  }
  fit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(fit, 150); });
  if (SL.reduced || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { e.target.style.animationPlayState = e.isIntersecting ? 'running' : 'paused'; });
  });
  document.querySelectorAll('.pl-track,.pl-pole i').forEach(function (el) { io.observe(el); });
})();
