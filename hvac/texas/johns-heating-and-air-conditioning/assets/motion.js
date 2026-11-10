/* Field motion: carousel arrows, count-up stats. Marquee + push-in are CSS (off with reduced motion). */
(function () {
  if (!window.SL) return;
  var car = document.querySelector('[data-carousel]');
  document.querySelectorAll('[data-car]').forEach(function (b) {
    b.addEventListener('click', function () { if (car) car.scrollBy({ left: (+b.getAttribute('data-car')) * car.clientWidth * 0.8, behavior: SL.reduced ? 'auto' : 'smooth' }); });
  });
  if (SL.reduced || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return; io.unobserve(e.target);
      var el = e.target, m = el.textContent.match(/^([^\d]*)([\d.,]+)(.*)$/); if (!m) return;
      var end = parseFloat(m[2].replace(/,/g, '')), dec = (m[2].split('.')[1] || '').length, t0 = performance.now();
      if (!isFinite(end) || end < 2) return;
      (function step(t) { var k = Math.min(1, (t - t0) / 1200); el.textContent = m[1] + (end * (1 - Math.pow(1 - k, 3))).toFixed(dec) + m[3]; if (k < 1) requestAnimationFrame(step); })(t0);
    });
  });
  document.querySelectorAll('[data-count]').forEach(function (el) { io.observe(el); });
})();
