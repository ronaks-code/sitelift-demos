/* Panel Door motion: the hero garage door rolls up on load. The door is already raised (hidden) without JS or with reduced motion. */
(function () {
  if (!window.SL || SL.reduced) return;
  document.body.classList.add('js-door');
})();
