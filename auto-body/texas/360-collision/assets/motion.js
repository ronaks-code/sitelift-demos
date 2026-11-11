/* Restore motion: before/after slider with a one-time demo sweep; repair timeline fills when it scrolls into view. */
(function () {
  if (!window.SL) return;
  document.querySelectorAll('[data-ba]').forEach(function (s) {
    var r = s.querySelector('input'), set = function () { s.style.setProperty('--x', r.value + '%'); };
    r.addEventListener('input', set); set();
    if (SL.reduced) return;
    var t = 0, seq = [50, 28, 72, 50], i = 0;
    var step = function () { if (i >= seq.length || s.dataset.touched) return; r.value = seq[i++]; set(); setTimeout(step, 700); };
    ['pointerdown', 'keydown'].forEach(function (e) { r.addEventListener(e, function () { s.dataset.touched = 1; }); });
    setTimeout(step, 1200);
  });
  var ln = document.querySelector('[data-line]');
  if (ln && 'IntersectionObserver' in window && !SL.reduced) {
    ln.classList.add('arm');
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { ln.classList.add('go'); io.disconnect(); } }); }, { threshold: .3 });
    io.observe(ln);
  } else if (ln) ln.classList.add('go');
})();
