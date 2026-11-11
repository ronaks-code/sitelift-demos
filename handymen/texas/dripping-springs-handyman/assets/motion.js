/* Honey-Do motion: the list ticks itself on load. Items are already ticked without JS or with reduced motion. */
(function () {
  if (!window.SL || SL.reduced) return;
  document.body.classList.add('js-tick');
})();
