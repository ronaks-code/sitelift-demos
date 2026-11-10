/* Windshield motion: starts the wiper sweep + film clear when the hero glass is on screen. Glass is clear without it. */
(function () {
  if (!window.SL || SL.reduced) return;
  var g = document.querySelector('[data-wiper]');
  if (!g) return;
  document.body.classList.add('js-wp');
})();
