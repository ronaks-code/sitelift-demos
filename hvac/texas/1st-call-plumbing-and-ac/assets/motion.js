/* Permit motion: approval stamp thunk, checkbox ticking. Content is fully visible without it. */
(function () {
  if (!window.SL || SL.reduced) return;
  document.body.classList.add('js-permit');
  var ul = document.querySelectorAll('[data-ticks]');
  if (!('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      Array.prototype.forEach.call(e.target.children, function (li, i) { li.style.transitionDelay = (i * 160) + 'ms'; });
      e.target.classList.add('ticked'); io.unobserve(e.target);
    });
  }, { threshold: .4 });
  ul.forEach(function (u) { io.observe(u); });
})();
