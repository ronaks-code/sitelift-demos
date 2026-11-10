/* Neon motion: the sign headline flickers on once, the grid floor rolls toward you, timeline nodes pulse. All CSS, switched on when motion is allowed. */
(function () {
  if (!window.SL || SL.reduced) return;
  document.body.classList.add('js-nx');
})();
