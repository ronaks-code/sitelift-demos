/* Garage Door motion: on load a slatted door rolls up off the hero photo (CSS, only when motion is allowed); bay slats retract on hover. */
(function () {
  if (!window.SL || SL.reduced) return;
  document.body.classList.add('js-gd');
})();
