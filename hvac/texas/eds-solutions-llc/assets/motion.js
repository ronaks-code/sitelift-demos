/* Weld Shop motion: all effects are CSS (bead draw, sparks, plate glow); this only marks the page so they run, and never when reduced motion is on. */
(function () {
  if (!window.SL || SL.reduced) return;
  document.body.classList.add('js-weld');
})();
