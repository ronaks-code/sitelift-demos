/* Copper Line motion: margin pipe fills with scroll progress; gauge rings draw in. Skipped for reduced motion. */
(function () {
  if (!window.SL || SL.reduced) return;
  var pipe = document.querySelector('[data-pipe]');
  if (pipe) {
    document.body.classList.add('js-pipe');
    var tick = function () {
      var h = document.documentElement.scrollHeight - innerHeight;
      pipe.style.setProperty('--p', (h > 0 ? Math.min(100, scrollY / h * 100) : 0).toFixed(1) + '%');
    };
    addEventListener('scroll', tick, { passive: true }); tick();
  }
  var g = document.querySelectorAll('[data-gauge]');
  if (g.length && 'IntersectionObserver' in window) {
    document.body.classList.add('js-gauge');
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('drawn'); io.unobserve(e.target); } }); }, { threshold: .5 });
    g.forEach(function (x) { io.observe(x); });
  }
})();
