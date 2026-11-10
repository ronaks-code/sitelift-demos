/* Blueprint motion: dimension lines draw in when the hero photo appears; spec rows fade in one by one. */
(function () {
  if (!window.SL || SL.reduced || !('IntersectionObserver' in window)) return;
  var p = document.querySelector('[data-dim]');
  if (p) {
    p.classList.add('js-dim');
    new IntersectionObserver(function (es, o) { es.forEach(function (e) { if (e.isIntersecting) { p.classList.add('dim-in'); o.disconnect(); } }); }).observe(p);
  }
  document.querySelectorAll('.bp-spec > div').forEach(function (r, i) {
    r.style.opacity = 0; r.style.transform = 'translateX(-8px)'; r.style.transition = 'opacity .4s, transform .4s';
    setTimeout(function () { r.style.opacity = 1; r.style.transform = 'none'; }, 500 + i * 140);
  });
})();
