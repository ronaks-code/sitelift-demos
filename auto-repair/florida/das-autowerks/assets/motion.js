/* Instrument Cluster motion: needle sweep + dash self-test on load (CSS), rating counts up with the needle. */
(function () {
  if (!window.SL || SL.reduced) return;
  document.body.classList.add('js-ds');
  var n = document.querySelector('[data-count]');
  if (!n) return;
  var end = parseFloat(n.textContent); if (!isFinite(end)) return;
  var t0 = performance.now();
  (function step(t) {
    var k = Math.min(1, (t - t0) / 1100);
    n.textContent = (end * k).toFixed(1);
    if (k < 1) requestAnimationFrame(step);
  })(t0);
})();
