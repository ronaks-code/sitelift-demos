/* Finish motion: the hero before/after wipes from the 'before' edge to its resting split when the page loads.
   The split is a CSS variable (--pos) on [data-ba], so the shared slider effect can take over. Static without JS or with reduced motion. */
(function () {
  if (!window.SL || SL.reduced) return;
  var ba = document.querySelector('.hf-ba');
  if (!ba) return;
  var t0 = null, from = 96, to = 50, ms = 1300;
  ba.style.setProperty('--pos', from + '%');
  function step(t) {
    if (t0 === null) t0 = t;
    var k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
    ba.style.setProperty('--pos', (from + (to - from) * e) + '%');
    if (k < 1) requestAnimationFrame(step); else ba.style.removeProperty('--pos');
  }
  setTimeout(function () { requestAnimationFrame(step); }, 350);
})();
