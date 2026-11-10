/* Counter motion: receipts "print" down out of the slot when they scroll in; part-finder fields tick-focus. (Grid drift + category ticker are CSS.) */
(function () {
  if (!window.SL || SL.reduced) return;
  document.body.classList.add('js-ct');
})();
