/* Lot motion: hero photo eases up slightly as you scroll; numeric stats count up when they scroll into view. */
(function () {
  if (!window.SL || SL.reduced) return;
  var img = document.querySelector('[data-hero-img] img');
  if (img) addEventListener('scroll', function () { img.style.transform = 'scale(' + (1 + Math.min(scrollY, 700) / 7000) + ')'; }, { passive: true });
  var nums = [].slice.call(document.querySelectorAll('[data-count]')).filter(function (e) { return /^\d+(\.\d+)?$/.test(e.textContent.trim()); });
  if (!nums.length || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return; io.unobserve(e.target);
      var el = e.target, txt = el.textContent.trim(), to = parseFloat(txt), dec = (txt.split('.')[1] || '').length, t0 = performance.now();
      (function tick(t) { var p = Math.min(1, (t - t0) / 1200), v = to * (1 - Math.pow(1 - p, 3)); el.textContent = v.toFixed(dec); if (p < 1) requestAnimationFrame(tick); else el.textContent = txt; })(t0);
    });
  }, { threshold: .6 });
  nums.forEach(function (n) { io.observe(n); });
})();
