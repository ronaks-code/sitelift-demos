/* Checklist motion: each inspection row gets its green mark as it scrolls in, one after the other. Everything is shown without JS or with reduced motion. */
(function () {
  if (!window.SL || SL.reduced || !('IntersectionObserver' in window)) return;
  var rows = [].slice.call(document.querySelectorAll('.ck-row'));
  if (!rows.length) return;
  document.body.classList.add('js-ck');
  var n = 0, io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target; io.unobserve(el);
      setTimeout(function () { el.classList.add('is-on'); }, (n++ % 6) * 140);
    });
  }, { threshold: 0.6 });
  rows.forEach(function (r) { io.observe(r); });
})();
