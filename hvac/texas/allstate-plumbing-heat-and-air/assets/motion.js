/* Dispatch motion: the big number breathes (CSS class), nothing else needed. Skipped for reduced motion. */
(function () {
  if (!window.SL || SL.reduced) return;
  document.body.classList.add('js-dispatch');
  var n = document.querySelector('[data-breathe]');
  if (!n || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle('breathe', e.isIntersecting); }); }).observe(n);
})();
