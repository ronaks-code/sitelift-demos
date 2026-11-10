/* Suds motion: bubbles rise, wave edge drifts, badge bobs, a car drives along the tunnel road. All CSS, switched on only when motion is allowed. */
(function () {
  if (!window.SL || SL.reduced) return;
  document.body.classList.add('js-sd');
})();
