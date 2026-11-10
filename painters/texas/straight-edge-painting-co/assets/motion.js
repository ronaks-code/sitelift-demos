/* Craftsman motion: the phase timeline fills when scrolled into view. Fully filled without JS or with reduced motion. */
(function () {
  if (!window.SL || SL.reduced || !('IntersectionObserver' in window)) return;
  var p = document.querySelector('[data-phases]');
  if (!p) return;
  document.body.classList.add('js-phases');
  new IntersectionObserver(function (es, io) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('run'); io.unobserve(e.target); } }); }, { threshold: .4 }).observe(p);
})();
