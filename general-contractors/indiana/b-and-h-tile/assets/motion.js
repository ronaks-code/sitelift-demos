/* Trowel motion: gallery slabs wipe in from the left. Content stays visible without JS and with reduced motion. */
(function () {
  if (!window.SL || SL.reduced || !('IntersectionObserver' in window)) return;
  var g = document.querySelectorAll('[data-wipe] .g-it');
  if (!g.length) return;
  document.body.classList.add('js-wipe');
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('wiped'); io.unobserve(e.target); } }); }, { threshold: .2 });
  g.forEach(function (x, i) { x.style.setProperty('--w', (i % 3) * 110 + 'ms'); io.observe(x); });
})();
