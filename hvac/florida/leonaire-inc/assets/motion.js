/* Circuit motion: breaker switches flip ON in sequence when the panel scrolls into view. Without JS or with reduced motion they are already ON. */
(function () {
  if (!window.SL || SL.reduced) return;
  var p = document.querySelector('[data-brks]');
  if (!p || !('IntersectionObserver' in window)) return;
  document.body.classList.add('js-brk');
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      Array.prototype.forEach.call(e.target.children, function (b, i) { setTimeout(function () { b.classList.add('on'); }, 250 + i * 260); });
      io.unobserve(e.target);
    });
  }, { threshold: .35 });
  io.observe(p);
})();
