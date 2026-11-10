/* Shade motion: the hero colour wash rotates (CSS), the outlined marquee crawls, and film-scale rows darken progressively as they enter. */
(function () {
  if (!window.SL) return;
  var rows = document.querySelectorAll('.sa-row');
  if (!SL.reduced) document.body.classList.add('js-sa');
  if (SL.reduced || !('IntersectionObserver' in window)) { rows.forEach(function (r) { r.classList.add('seen'); }); return; }
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); } }); }, { threshold: .35 });
  rows.forEach(function (r) { io.observe(r); });
})();
